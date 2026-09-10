import { getSupabase } from './client';
import { describeAuthError } from './session';
import type { Message } from '@/i18n/message';

/**
 * Delete the signed-in player's account, for good.
 *
 * The work happens in the `delete-account` Edge Function
 * (supabase/functions/delete-account/index.ts), because removing a row from
 * `auth.users` needs the service_role key and that key must never reach a
 * client bundle. This file is the call and the error mapping, nothing else.
 *
 * ## What goes, and what stays
 *
 * Goes: the auth user, which is the email address, and every `case_progress`
 * row belonging to it -- the foreign key cascades, so one delete does both.
 *
 * Stays: the saves already written to this device, and the purchase. Both are
 * deliberate. Local saves are the player's own copy and erasing them is a
 * separate, clearly-labelled button. The purchase lives on the player's Apple
 * or Google account, not on ours; deleting a game account must not destroy
 * something they paid for, and Restore Purchases still works afterwards.
 * `settings.account.deleteDetail` says exactly this before they tap.
 *
 * ## Why it does not throw
 *
 * Same reason as `syncProgress`: accounts are optional in this game, so every
 * caller has to handle "there is no account system" anyway. A screen that has
 * to try/catch to find that out is a screen that will forget to.
 */
export type DeleteAccountResult =
  /** Gone. The caller should sign out and say so. */
  | { kind: 'deleted' }
  /** Nothing was attempted -- no account system, or nobody signed in. */
  | { kind: 'skipped'; reason: Message }
  | { kind: 'failed'; reason: Message };

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const handle = getSupabase();
  if (handle.kind !== 'ready') {
    return { kind: 'skipped', reason: { key: 'signIn.off.title' } };
  }

  try {
    const { data, error: sessionError } = await handle.client.auth.getSession();
    if (sessionError) return { kind: 'failed', reason: describeAuthError(sessionError.message) };
    if (!data.session) return { kind: 'skipped', reason: { key: 'signIn.off.title' } };

    /*
     * The function reads the caller's id out of this token and deletes that
     * account and no other. Nothing about which account to delete is sent from
     * here -- see the security note in the function itself.
     */
    const { error } = await handle.client.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) {
      return { kind: 'failed', reason: { key: 'settings.account.deleteFailed' } };
    }

    /*
     * Sign out locally even though the server-side user is gone. Without it the
     * app keeps a session for an account that no longer exists, and the next
     * refresh fails in a way that surfaces as a confusing auth error rather
     * than as "you deleted your account".
     *
     * A failure here is not worth reporting: the account IS deleted, which is
     * what the player asked for, and the stale token is dead on arrival.
     */
    await handle.client.auth.signOut().catch(() => undefined);

    return { kind: 'deleted' };
  } catch (e) {
    return { kind: 'failed', reason: describeAuthError(e instanceof Error ? e.message : String(e)) };
  }
}
