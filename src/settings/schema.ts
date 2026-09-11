import { z } from 'zod';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleTag } from '@/i18n/locales';

/**
 * Player preferences, validated the same way saves are.
 *
 * Settings are read on every haptic and every sound — that is, on the hot path
 * of the whole game. A corrupt blob here cannot be allowed to throw, because the
 * throw would not happen on the settings screen where it could be understood; it
 * would happen the next time someone tapped a claim chip. So every field falls
 * back independently and the whole object falls back as a unit.
 */

export interface Settings {
  readonly soundEnabled: boolean;
  /**
   * The slider position the player chose, 0–1. NOT an amplitude — the mapping
   * from this to actual loudness is a curve, and it lives in src/audio/volume.ts.
   */
  readonly soundVolume: number;
  readonly hapticsEnabled: boolean;
  readonly reduceMotion: boolean;
  readonly localeTag: LocaleTag;
  /**
   * Whether this person has been through the front door — the screen that
   * offers signing in or playing as a guest.
   *
   * This replaces `hasSeenHowToPlay`, which gated a five-page slideshow that no
   * longer exists. The walkthrough now runs inside the Bakehouse as coach marks
   * on the real controls, and what that needs to know is not "have you read the
   * instructions" but "have you done any of it yet" — which the save already
   * answers. See src/tutorial/steps.ts.
   *
   * A preference rather than a save, because it is per-person rather than
   * per-case, and because it has to survive "reset progress": somebody clearing
   * their playthroughs is not asking to be signed out.
   */
  readonly hasSeenLanding: boolean;
  /**
   * The player asked the coach marks to stop.
   *
   * Separate from `hasSeenLanding` because they answer different questions and
   * are set at different moments. Turning this back off is what the Settings
   * "How to play" row does — there is no slideshow left to open, so the row
   * re-arms the real thing instead.
   */
  readonly tutorialDismissed: boolean;
  /**
   * Whether this person has been through the first-run setup screen -- the one
   * that asks for language, sound, vibration and reduce-motion.
   *
   * Separate from `hasSeenLanding` because it is asked EARLIER and answers a
   * different question. The order is deliberate: setup runs before the landing
   * screen so the pitch arrives in the player's own language rather than in
   * English with a language picker buried two screens away.
   *
   * Defaults to false, so everyone who already has the app sees the screen once
   * on their next launch. That is the right direction to err: the alternative
   * silently denies the choice to every existing player, and the screen costs
   * four taps at worst.
   */
  readonly hasChosenSetup: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  soundVolume: 0.7,
  hapticsEnabled: true,
  reduceMotion: false,
  localeTag: DEFAULT_LOCALE,
  hasSeenLanding: false,
  tutorialDismissed: false,
  hasChosenSetup: false,
};

/**
 * Whether a stored tag is still a language this build ships.
 *
 * Dropping a locale is a normal thing to do between releases, and the player who
 * had it selected must land back on English rather than on a screen of missing
 * translation keys.
 */
export function isLocaleTag(value: unknown): value is LocaleTag {
  return typeof value === 'string' && SUPPORTED_LOCALES.some((l) => l.tag === value);
}

const settingsBlob = z.object({
  soundEnabled: z.boolean().catch(DEFAULT_SETTINGS.soundEnabled),
  /**
   * `.min(0).max(1)` also rejects NaN and both infinities, because every
   * comparison against NaN is false and the infinities fall outside the range.
   * An out-of-range number returns to the default rather than being clamped:
   * clamping silently rewrites a value the player never chose, and a default is
   * at least a value they can recognise and change.
   */
  soundVolume: z.number().min(0).max(1).catch(DEFAULT_SETTINGS.soundVolume),
  hapticsEnabled: z.boolean().catch(DEFAULT_SETTINGS.hapticsEnabled),
  reduceMotion: z.boolean().catch(DEFAULT_SETTINGS.reduceMotion),
  /**
   * `z.custom` rather than `z.enum(tags as [string, ...string[]])`: building the
   * tuple zod wants would need a cast, and a cast is the one thing this file
   * exists to avoid.
   */
  localeTag: z.custom<LocaleTag>(isLocaleTag).catch(DEFAULT_SETTINGS.localeTag),
  /**
   * Both default to false, so a blob written before they existed — including
   * one still carrying the retired `hasSeenHowToPlay`, which zod drops as an
   * unknown key — reads as "has not been through the door" and "coach marks
   * still on". Erring the other way would silently skip the front door for
   * everyone who already has the app, and skipping it is the one thing it
   * cannot do: it is where signing in now lives.
   */
  hasSeenLanding: z.boolean().catch(DEFAULT_SETTINGS.hasSeenLanding),
  tutorialDismissed: z.boolean().catch(DEFAULT_SETTINGS.tutorialDismissed),
  hasChosenSetup: z.boolean().catch(DEFAULT_SETTINGS.hasChosenSetup),
});

/** Never throws. Anything unrecognisable becomes the defaults. */
export function parseSettings(raw: unknown): Settings {
  const parsed = settingsBlob.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/**
 * The full stored-string path, including the JSON parse.
 *
 * Worth its own function because the JSON parse is where a truncated write
 * actually fails, and testing it end to end is what proves a half-written blob
 * starts the app on defaults instead of crashing it.
 */
export function parseStoredSettings(json: string | null | undefined): Settings {
  if (json === null || json === undefined || json === '') return DEFAULT_SETTINGS;
  try {
    return parseSettings(JSON.parse(json) as unknown);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Field-by-field, so the autosave subscription can tell a real settings change
 * from any other store update and skip a write to disk for the latter.
 */
export function settingsEqual(a: Settings, b: Settings): boolean {
  return (
    a.soundEnabled === b.soundEnabled &&
    a.soundVolume === b.soundVolume &&
    a.hapticsEnabled === b.hapticsEnabled &&
    a.reduceMotion === b.reduceMotion &&
    a.localeTag === b.localeTag &&
    a.hasSeenLanding === b.hasSeenLanding &&
    a.tutorialDismissed === b.tutorialDismissed &&
    a.hasChosenSetup === b.hasChosenSetup
  );
}
