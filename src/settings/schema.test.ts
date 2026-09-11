import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isLocaleTag,
  parseSettings,
  parseStoredSettings,
  settingsEqual,
} from './schema';

/**
 * The contract is: a corrupt blob falls back to defaults, it never throws.
 *
 * Settings are read on every haptic and every sound, so a throw from here would
 * surface in the middle of a case rather than on the screen that caused it.
 */
describe('parseSettings', () => {
  it('accepts a complete, valid blob unchanged', () => {
    const stored = {
      soundEnabled: false,
      soundVolume: 0.25,
      hapticsEnabled: false,
      reduceMotion: true,
      localeTag: 'fr',
      // Deliberately the non-defaults, so this asserts the fields survive a round
      // trip rather than merely agreeing with what the defaults would have been.
      hasSeenLanding: true,
      tutorialDismissed: true,
      hasChosenSetup: true,
    };
    expect(parseSettings(stored)).toEqual(stored);
  });

  /**
   * The one that decides whether a returning player meets the front door.
   *
   * Every settings blob written before the landing existed lacks this field, and
   * `.catch` gives those `false` — "has not been through the door" — so it shows
   * once for everyone who already has the app. Defaulting the other way would
   * silently skip it, and skipping it is the one thing it must not do: it is
   * where signing in now lives.
   *
   * The blob below deliberately still carries `hasSeenHowToPlay`, the field the
   * landing replaced. That is what a real device holds today, and the assertion
   * is that a retired key is dropped rather than mistaken for the new one.
   */
  it('treats a blob written before the landing existed as not yet seen', () => {
    const olderBuild = {
      soundEnabled: true,
      soundVolume: 0.7,
      hapticsEnabled: true,
      reduceMotion: false,
      localeTag: 'en',
      hasSeenHowToPlay: true,
    };
    const parsed = parseSettings(olderBuild);
    expect(parsed.hasSeenLanding).toBe(false);
    expect(parsed.tutorialDismissed).toBe(false);
    // Same direction, same reason: a blob written before the setup screen
    // existed has not been through it, so the screen shows once.
    expect(parsed.hasChosenSetup).toBe(false);
    expect(parsed).not.toHaveProperty('hasSeenHowToPlay');
  });

  it('fills in a missing field without discarding the fields that survived', () => {
    // A build that adds a new setting must not reset the four the player already
    // chose just because the fifth was not in the blob they saved last week.
    const parsed = parseSettings({ soundEnabled: false, soundVolume: 0.25 });
    expect(parsed.soundEnabled).toBe(false);
    expect(parsed.soundVolume).toBe(0.25);
    expect(parsed.reduceMotion).toBe(DEFAULT_SETTINGS.reduceMotion);
  });

  it('replaces a field of the wrong type and keeps the rest', () => {
    const parsed = parseSettings({ soundEnabled: 'yes', soundVolume: 0.25 });
    expect(parsed.soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled);
    expect(parsed.soundVolume).toBe(0.25);
  });

  it.each([
    ['above the range', 1.5],
    ['below the range', -0.2],
    ['not a number', 'loud'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('returns the default volume when the stored value is %s', (_label, soundVolume) => {
    expect(parseSettings({ soundVolume }).soundVolume).toBe(DEFAULT_SETTINGS.soundVolume);
  });

  it('accepts the exact ends of the volume range', () => {
    expect(parseSettings({ soundVolume: 0 }).soundVolume).toBe(0);
    expect(parseSettings({ soundVolume: 1 }).soundVolume).toBe(1);
  });

  it('falls back to English when the stored locale is no longer shipped', () => {
    // Dropping a language between releases is normal. The player who had it
    // selected must land on English, not on a screen of missing keys.
    //
    // `ja` rather than an invented tag, because this stopped being hypothetical
    // on 2026-08-14: Japanese was in the picker with an empty catalogue and was
    // removed. Anyone who had chosen it still has this exact string on disk.
    expect(parseSettings({ localeTag: 'ja' }).localeTag).toBe(DEFAULT_SETTINGS.localeTag);
    expect(parseSettings({ localeTag: 'kl' }).localeTag).toBe(DEFAULT_SETTINGS.localeTag);
  });

  it.each([
    ['null', null],
    ['a string', 'not an object'],
    ['an array', [1, 2, 3]],
    ['a number', 7],
  ])('returns the defaults for a blob that is %s', (_label, raw) => {
    expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('parseStoredSettings', () => {
  it('round-trips what the app itself writes', () => {
    const written = JSON.stringify(DEFAULT_SETTINGS);
    expect(parseStoredSettings(written)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns the defaults for a truncated write rather than throwing', () => {
    // This is the realistic corruption: the process died mid-write. It has to
    // start the app, not crash it.
    expect(parseStoredSettings('{"soundEnabled":tr')).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ['nothing stored yet', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('returns the defaults for %s', (_label, raw) => {
    expect(parseStoredSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('isLocaleTag', () => {
  it('accepts a shipped tag, including one with a region', () => {
    expect(isLocaleTag('en')).toBe(true);
    expect(isLocaleTag('pt-BR')).toBe(true);
  });

  it('rejects an unshipped tag and any non-string', () => {
    expect(isLocaleTag('kl')).toBe(false);
    expect(isLocaleTag('')).toBe(false);
    expect(isLocaleTag(null)).toBe(false);
    expect(isLocaleTag(7)).toBe(false);
  });
});

describe('settingsEqual', () => {
  it('is true for equal values held in different objects', () => {
    expect(settingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS })).toBe(true);
  });

  it.each([
    ['soundEnabled', { soundEnabled: false }],
    ['soundVolume', { soundVolume: 0.1 }],
    ['hapticsEnabled', { hapticsEnabled: false }],
    ['reduceMotion', { reduceMotion: true }],
    ['localeTag', { localeTag: 'pt-BR' as const }],
  ])('is false when %s differs', (_label, patch) => {
    expect(settingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, ...patch })).toBe(false);
  });
});
