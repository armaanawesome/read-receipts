/**
 * The auth module's public surface.
 *
 * Screens import from '@/auth' and never from the files underneath, so the
 * client singleton and the sync internals stay one implementation detail rather
 * than several import paths to keep working.
 */

export { getSupabase, type SupabaseHandle } from './client';
export {
  decideSupabaseConfig,
  SUPABASE_URL_VAR,
  SUPABASE_ANON_KEY_VAR,
  type SupabaseConfig,
} from './config';
export {
  reduceAuth,
  initialAuthStatus,
  classifySignUp,
  describeAuthError,
  type AuthStatus,
  type AuthUser,
  type AuthEvent,
  type SignUpOutcome,
} from './session';
export {
  validateCredentials,
  normaliseEmail,
  MIN_PASSWORD_LENGTH,
  RULE_MESSAGE_KEY,
  type CredentialProblem,
  type CredentialField,
} from './credentials';
export {
  checkPassword,
  type PasswordReport,
  type PasswordRule,
  type PasswordRuleId,
  type PasswordStrength,
} from './passwordStrength';
export { deleteAccount, type DeleteAccountResult } from './deleteAccount';
export {
  syncProgress,
  describeSyncResult,
  PROGRESS_TABLE,
  type SyncResult,
} from './sync';
export { useAuth, type AuthApi, type AuthAttempt, type SignUpAttempt } from './useAuth';
