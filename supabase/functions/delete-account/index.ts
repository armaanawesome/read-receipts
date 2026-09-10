/**
 * Account deletion. Runs on Supabase Edge Functions (Deno), not in the app.
 *
 * ## Why this cannot live in the client
 *
 * Deleting a row in `auth.users` requires the service_role key, which bypasses
 * row-level security entirely. That key must never touch the app bundle --
 * every `EXPO_PUBLIC_*` value is extractable from a shipped build, and a leaked
 * service_role key hands every player full read and write over every other
 * player's rows. So the key lives here, in an environment the client cannot
 * read, and the client asks this function to act on its behalf.
 *
 * ## Why the app needs it at all
 *
 * Apple App Review Guideline 5.1.1(v): an app that lets a user create an
 * account must let them initiate deletion from inside the app. Google Play's
 * data deletion policy says the same and adds a web route. GDPR Art. 17,
 * CCPA 1798.105 and LGPD Art. 18(VI) are the law underneath the store rules.
 * See docs/LEGAL-REVIEW.md, Count 4.
 *
 * ## The security property that matters
 *
 * The id being deleted comes from the VERIFIED JWT and from nowhere else. It is
 * never read from the request body, the query string, or a header the caller
 * controls. If it were, this endpoint would let any signed-in player delete any
 * other player's account by guessing a uuid -- an authenticated account-takeover
 * primitive, shipped as a privacy feature. Read `verifyCaller` before changing
 * anything here.
 *
 * Deleting the auth user cascades to `public.case_progress` through the
 * `on delete cascade` on its user_id foreign key (supabase/migrations/
 * 0001_case_progress.sql), so there is no second delete to keep in step.
 *
 * ## Deploy
 *
 *   supabase functions deploy delete-account
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 * Do not add them to .env, eas.json, or anything the client bundle can see.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** JSON, with the CORS headers every response needs. */
function reply(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * The caller's own user id, proven by their access token, or null.
 *
 * `getUser(jwt)` verifies the signature and expiry against the project's keys.
 * A forged or expired token returns an error here rather than a user, which is
 * the whole reason the id is taken from this call and not from the request.
 */
async function verifyCaller(req: Request): Promise<string | null> {
  const header = req.headers.get('Authorization') ?? '';
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (jwt === '') return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return null;

  const { data, error } = await createClient(url, anon).auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // A deletion behind GET would be triggerable by a link or a prefetch.
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const userId = await verifyCaller(req);
  if (userId === null) return reply({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) {
    // Deliberately vague to the caller, specific in the log. A response that
    // names the missing variable tells an attacker how the function is wired.
    console.error('[delete-account] service role not configured');
    return reply({ error: 'unavailable' }, 500);
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // `userId` is the verified caller. Not a body field. Not a parameter.
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    // The message may name the project or the user; the id never goes to the
    // client, and the client has no use for the detail either way.
    console.error('[delete-account] delete failed:', error.message);
    return reply({ error: 'delete_failed' }, 500);
  }

  return reply({ ok: true }, 200);
});
