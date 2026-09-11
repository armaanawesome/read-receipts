// Must be first: supabase-js reaches for WHATWG URL, which Hermes does not
// ship. Without this the very first auth call throws "URL.protocol is not
// implemented" from inside node_modules, which reads like a library bug.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decideSupabaseConfig } from './config';

export type SupabaseHandle =
  | { kind: 'ready'; client: SupabaseClient }
  | { kind: 'unavailable'; reason: string };

/**
 * AsyncStorage, narrowed to the three methods supabase-js actually uses.
 *
 * expo-secure-store was removed from this project deliberately: it is a native
 * module, and adding one back would force a dev-client rebuild that costs EAS
 * quota. AsyncStorage is the approved session store here. The practical
 * consequence is that the refresh token sits in app-private unencrypted
 * storage — acceptable for a game whose entire protected asset is a list of
 * message ids, and it must not be reused for anything that matters more.
 *
 * Narrowed rather than passed whole so the auth client cannot reach `clear()`
 * and take every case save with it when it tidies up after a sign-out.
 */
const sessionStore = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

/**
 * Null until the first call, then sticky — one client per process.
 *
 * Constructing a second one would register a second auth listener and a second
 * refresh timer against the same stored session, and the two would race to
 * rotate the same refresh token.
 */
let handle: SupabaseHandle | null = null;

/**
 * The Supabase client, or the reason there isn't one.
 *
 * Deliberately lazy and deliberately non-throwing. Every caller has to handle
 * `unavailable` anyway — accounts are optional in this game — so there is no
 * value in a version that throws, and a module-scope client would do this work
 * during the launch import where a failure takes the whole app down.
 */
export function getSupabase(): SupabaseHandle {
  if (handle) return handle;

  const config = decideSupabaseConfig({
    // Written as full static member expressions on purpose: Expo's babel plugin
    // inlines EXPO_PUBLIC_* by textual substitution, so `process.env[name]` or a
    // destructured `env` would compile to undefined in a production bundle.
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (config.kind === 'unavailable') {
    // Warn, never throw. This project has already shipped one launch crash
    // caused by configuring a client with a bad key; the app must reach the
    // case list with accounts switched off instead.
    console.warn('[auth] accounts unavailable —', config.reason);
    handle = { kind: 'unavailable', reason: config.reason };
    return handle;
  }

  /*
   * SECURITY — the only Supabase key that may ever appear here is the ANON
   * (publishable) key.
   *
   * `EXPO_PUBLIC_*` values are inlined into the JavaScript bundle at build time.
   * They are not secrets: anyone with the .ipa or .apk can read them out in
   * minutes. The anon key is designed for that — it carries no authority of its
   * own, and every row it can reach is decided by row-level security policies
   * on the server (see docs/SUPABASE.md).
   *
   * A SERVICE ROLE key bypasses row-level security completely. Putting one here,
   * in any EXPO_PUBLIC_ variable, in eas.json, or anywhere else the client
   * bundle can see, hands every player full read and write access to every other
   * player's rows — and it would pass every test we have, because it works. It
   * must live only on a server the client cannot read. `decideSupabaseConfig`
   * refuses to construct a client with one, but that guard is a backstop for a
   * mistake, not permission to try.
   */
  handle = {
    kind: 'ready',
    client: createClient(config.url, config.anonKey, {
      auth: {
        storage: sessionStore,
        // Keeps the player signed in across launches. The whole point of the
        // AsyncStorage adapter above.
        persistSession: true,
        autoRefreshToken: true,
        // There is no browser redirect in a native app, and leaving this on
        // makes supabase-js read window.location, which Hermes does not have.
        detectSessionInUrl: false,
        /*
         * Required by the Google/Apple sign-in in src/auth/oauth.ts.
         *
         * The default implicit flow returns the access and refresh tokens in
         * the URL *fragment* of the redirect, which on a phone means real
         * credentials travelling through the OS link handler and into logs.
         * PKCE sends a single-use code instead and keeps the verifier on the
         * device, where the same AsyncStorage adapter above holds it.
         *
         * Safe for the password reset flow: that one verifies a six-digit OTP
         * token (`verifyRecoveryCode` in useAuth.ts), not a magic link, and OTP
         * verification does not depend on the flow type.
         */
        flowType: 'pkce',
      },
    }),
  };
  return handle;
}
