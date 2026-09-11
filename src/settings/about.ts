import type { StringKey } from '@/i18n/strings';

/**
 * The About block's content and formatting, with no dependency on expo-constants.
 *
 * The screen reads the real version off `Constants.expoConfig` and passes it in.
 * Keeping the formatting here means the awkward cases — a config that failed to
 * load, a platform with no build number — are tested rather than discovered in a
 * screenshot of a support email.
 */

/**
 * "1.0.0 (5)", or as much of it as actually exists.
 *
 * `Constants.expoConfig` is nullable at runtime, and versionCode is a number on
 * Android while buildNumber is a string on iOS, so both shapes arrive here.
 */
export function versionLine(
  version: string | null | undefined,
  build: string | number | null | undefined,
): string {
  const v = typeof version === 'string' ? version.trim() : '';
  // A version row that says nothing is worse than one that admits it: the first
  // thing support asks for is the build, and "" reads as a rendering bug.
  if (v === '') return 'Unknown';

  const b = typeof build === 'number' ? String(build) : typeof build === 'string' ? build.trim() : '';
  return b === '' ? v : `${v} (${b})`;
}

/**
 * What the app does with the player's data, in the app.
 *
 * Deliberately shown as text rather than a link to a hosted privacy policy:
 * there is no such page yet, and a settings row that opens a 404 is worse than
 * no row. Every line here is a claim about shipped behaviour — check it against
 * the code before editing it.
 *
 * Keys rather than prose, because this panel is translated like the rest of the
 * screen. This file owns which points appear and in what order; the wording of
 * each lives in `src/i18n/strings.ts` next to the other settings strings, so a
 * translator meets the whole screen in one file.
 *
 * The sync line is not optional. Progress is uploaded to Supabase the moment a
 * player signs in (src/auth/sync.ts), and for a while this panel still said it
 * lived only on the device -- a false statement about where personal data goes,
 * made in five languages. See docs/LEGAL-REVIEW.md, Count 2. If a future change
 * moves data somewhere new, it belongs in this list in the same commit.
 */
export const PRIVACY_POINTS: readonly StringKey[] = [
  'settings.privacy.progress',
  'settings.privacy.account',
  'settings.privacy.purchases',
  'settings.privacy.noTracking',
  'settings.privacy.deletion',
  'settings.privacy.policy',
];

/**
 * Where the legal documents actually live.
 *
 * GitHub rather than a marketing site, because there is no marketing site and a
 * settings row that opens a 404 is worse than no row. These URLs are public,
 * permanent, and render the Markdown properly on a phone. Google Play accepts a
 * link of this shape as the privacy policy URL, which is the requirement that
 * made them load-bearing rather than a nicety.
 *
 * Kept here, beside PRIVACY_POINTS, so the panel that summarises the policy and
 * the row that opens it cannot end up pointing at different things. If a real
 * domain ever exists, this is the one place to change.
 */
const REPO = 'https://github.com/armaanawesome/read-receipts/blob/master';
export const PRIVACY_URL = `${REPO}/PRIVACY.md`;
export const TERMS_URL = `${REPO}/TERMS.md`;

export interface Licence {
  readonly name: string;
  readonly licence: string;
}

/**
 * Third-party components, not this app's own licence.
 *
 * The repo splits its own licensing in two -- MIT for the code, proprietary for
 * the cases and assets. See LICENSE and CONTENT-LICENSE. Nothing in this list
 * claims to describe either.
 *
 * A name and a licence type is NOT the notice MIT requires. The full notice
 * text for every dependency lives in THIRD-PARTY-NOTICES.md at the repo root,
 * which is what actually discharges the obligation; this list is the in-app
 * summary that points a curious player at it.
 */
export const LICENCES: readonly Licence[] = [
  { name: 'React and React Native', licence: 'MIT' },
  { name: 'Expo SDK', licence: 'MIT' },
  { name: 'Expo Router', licence: 'MIT' },
  { name: 'React Native Reanimated', licence: 'MIT' },
  { name: 'React Native Gesture Handler', licence: 'MIT' },
  { name: 'React Native Screens', licence: 'MIT' },
  { name: 'React Native Safe Area Context', licence: 'MIT' },
  { name: 'React Native Purchases (RevenueCat)', licence: 'MIT' },
  { name: 'Async Storage', licence: 'MIT' },
  { name: 'Zustand', licence: 'MIT' },
  { name: 'Zod', licence: 'MIT' },
  { name: 'i18n-js', licence: 'MIT' },
  { name: 'supabase-js', licence: 'MIT' },
];
