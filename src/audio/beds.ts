/**
 * The looping background beds: one for the menu, one per case.
 *
 * Every file is SYNTHESISED by `tools/make-audio.mjs`, like the cues, so none of
 * them carries a licence question. 16kHz mono: the lobby is a 24s loop, each
 * case a 16s one (500KB), about 8.8MB for the set.
 *
 * ## Composed, not droned
 *
 * The cases used to get a drone -- room tone, eight seconds, trimmed to 7.5 --
 * and on a handset it read as "the same old static noise". They now share the
 * lobby's language (a minor pad, a slow pulse, a short figure) without its
 * tune: a pad that moves between two chords, a single pulse every two seconds
 * rather than a heartbeat, and a figure whose key and shape come from the case
 * id. Quiet enough to read over, and it goes somewhere. Every file is exactly
 * one loop with nothing trimmed; `deviceReports.test.ts` checks each one.
 */

/**
 * `null` means "no bed for this id", and the player treats that as silence
 * rather than an error — the same rule the cue registry follows, and what lets a
 * new case ship before anybody has generated a bed for it.
 *
 * The requires must be literal: React Native resolves them at bundle time, so
 * this cannot be a loop over case ids.
 */
export const BED_SOURCES: Readonly<Record<string, number | null>> = {
  menu: require('../../assets/audio/bed-menu.wav'),
  tutorial: require('../../assets/audio/bed-tutorial.wav'),
  'the-lighthouse': require('../../assets/audio/bed-the-lighthouse.wav'),
  'the-understudy': require('../../assets/audio/bed-the-understudy.wav'),
  'the-night-round': require('../../assets/audio/bed-the-night-round.wav'),
  'the-wake': require('../../assets/audio/bed-the-wake.wav'),
  'the-listener': require('../../assets/audio/bed-the-listener.wav'),
  'deep-field': require('../../assets/audio/bed-deep-field.wav'),
  'the-long-course': require('../../assets/audio/bed-the-long-course.wav'),
  'the-bothy': require('../../assets/audio/bed-the-bothy.wav'),
  'sunday-service': require('../../assets/audio/bed-sunday-service.wav'),
  'the-cut': require('../../assets/audio/bed-the-cut.wav'),
  'open-mic': require('../../assets/audio/bed-open-mic.wav'),
  'the-allotments': require('../../assets/audio/bed-the-allotments.wav'),
  'the-helpline': require('../../assets/audio/bed-the-helpline.wav'),
  'the-reunion': require('../../assets/audio/bed-the-reunion.wav'),
  'the-night-ferry': require('../../assets/audio/bed-the-night-ferry.wav'),
};

/** The menu's bed. Named rather than inlined, because two screens ask for it. */
export const MENU_BED = 'menu';

/** The asset for a track id, or null when nothing has been generated for it. */
export function bedSource(trackId: string): number | null {
  return BED_SOURCES[trackId] ?? null;
}
