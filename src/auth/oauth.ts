import * as Linking from 'expo-linking';
import { getSupabase } from './client';
import type { Message } from '@/i18n/message';

/**
 * Sign in with Google or Apple, through the system browser.
 *
 * ## Why there is no new native module here
 *
 * The usual recipe for this is `expo-web-browser` + `expo-auth-session`. Both
 * are native modules, so adding them costs a dev-client rebuild and EAS quota
 * this project does not have spare (HANDOFF section 7e). None of it is
 * necessary: the app already declares `"scheme": "privatetexts"` in app.json,
 * `expo-linking` is already installed, and that pair is a complete OAuth round
 * trip on its own.
 *
 *   1. Ask Supabase for the provider's authorise URL but do NOT let it
 *      redirect -- `skipBrowserRedirect: true` returns the URL instead.
 *   2. Hand that URL to the system browser.
 *   3. The provider sends the player back to `privatetexts://auth/callback`
 *      with a one-time code, which wakes the app.
 *   4. `app/_layout.tsx` hears the deep link and calls `completeOAuthRedirect`,
 *      which trades the code for a session.
 *
 * The system browser is also the better place for this on its own merits: it
 * already holds the player's Google session, and it shows them a real address
 * bar, which an in-app webview asking for a password never does.
 *
 * ## PKCE, and why the client sets it
 *
 * `client.ts` sets `flowType: 'pkce'`. Without it, Supabase returns the tokens
 * in the URL *fragment* of the redirect, which means access and refresh tokens
 * travel through the OS link handler and land in logs. PKCE sends a single-use
 * code instead, and the secret half of the exchange never leaves the device.
 *
 * This does not disturb the password reset flow. That one uses a six-digit OTP
 * token (`verifyRecoveryCode` in useAuth.ts), not a magic link, and OTP
 * verification is unaffected by the flow type.
 *
 * ## Before this works
 *
 * Google and Apple each have to be switched on in the Supabase dashboard, under
 * Authentication > Providers, with `privatetexts://auth/callback` added to the
 * project's redirect allow-list. Until then `signInWithProvider` returns
 * `unconfigured` and the screen says so in the player's language rather than
 * failing silently. See docs/SUPABASE.md.
 *
 * ## Before this ships to a store
 *
 * Apple's Guideline 4.8 requires Sign in with Apple wherever another
 * third-party sign-in is offered -- satisfied here -- and both Apple and Google
 * require their own official button artwork and wording. The buttons in
 * `src/ui/AuthProviderButtons.tsx` deliberately use this app's own visual
 * language rather than imitating theirs, which is the honest position until the
 * real assets are in. See docs/STORE-COMPLIANCE.md.
 */

export type OAuthProvider = 'google' | 'apple';

export type OAuthStart =
  /** The browser is open. The result arrives later, as a deep link. */
  | { kind: 'opened' }
  /** The provider is not enabled on the Supabase project yet. */
  | { kind: 'unconfigured' }
  | { kind: 'failed'; reason: Message };

export type OAuthFinish =
  | { kind: 'signedIn' }
  /** The player backed out at the provider's page. Not an error. */
  | { kind: 'cancelled' }
  | { kind: 'failed'; reason: Message };

/**
 * Where the provider sends the player back to.
 *
 * `Linking.createURL` builds this from app.json's scheme, so it is
 * `privatetexts://auth/callback` in a build and an `exp://...` URL under a dev
 * server -- which is exactly right, because those are genuinely different
 * addresses and hardcoding either one breaks the other.
 */
export function oauthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Supabase says "Unsupported provider" when the provider exists but is switched
 * off for the project. That is the single most likely thing to be wrong here,
 * and it deserves its own message rather than a generic failure, because the
 * fix is a dashboard toggle rather than anything in the app.
 */
function isUnconfigured(message: string): boolean {
  return /unsupported provider|provider is not enabled|not enabled/i.test(message);
}

/** Open the provider's sign-in page. The session arrives later, via the deep link. */
export async function signInWithProvider(provider: OAuthProvider): Promise<OAuthStart> {
  const handle = getSupabase();
  if (handle.kind !== 'ready') {
    return { kind: 'unconfigured' };
  }

  try {
    const { data, error } = await handle.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirectUrl(),
        // Return the URL rather than navigating. There is no page to navigate
        // in a native app, and without this supabase-js reaches for
        // window.location, which Hermes does not have.
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return isUnconfigured(error.message)
        ? { kind: 'unconfigured' }
        : { kind: 'failed', reason: { key: 'auth.provider.failed' } };
    }
    if (!data?.url) {
      return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
    }

    const canOpen = await Linking.canOpenURL(data.url);
    if (!canOpen) {
      return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
    }
    await Linking.openURL(data.url);
    return { kind: 'opened' };
  } catch {
    return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
  }
}

/**
 * Finish the round trip: turn the code in the redirect into a session.
 *
 * Returns `null` when the URL is not an OAuth callback at all, so the caller
 * can hand it every deep link the app receives without having to know the shape
 * of this one. That keeps the routing knowledge here rather than scattered
 * through `_layout.tsx`.
 */
export async function completeOAuthRedirect(url: string): Promise<OAuthFinish | null> {
  const { queryParams, path } = Linking.parse(url);
  if (path !== 'auth/callback' && !url.includes('auth/callback')) return null;

  // The provider reports a refusal in the URL rather than by failing to
  // redirect. `access_denied` is what both Google and Apple send when somebody
  // taps cancel, and that is not something to show as an error.
  const errorCode = typeof queryParams?.error === 'string' ? queryParams.error : null;
  if (errorCode !== null) {
    return /access_denied|user_cancelled/i.test(errorCode)
      ? { kind: 'cancelled' }
      : { kind: 'failed', reason: { key: 'auth.provider.failed' } };
  }

  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (code === null) return null;

  const handle = getSupabase();
  if (handle.kind !== 'ready') {
    return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
  }

  try {
    const { error } = await handle.client.auth.exchangeCodeForSession(code);
    if (error) return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
    return { kind: 'signedIn' };
  } catch {
    return { kind: 'failed', reason: { key: 'auth.provider.failed' } };
  }
}
