import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EN } from '@/i18n/strings';
import { LICENCES, PRIVACY_POINTS, versionLine } from './about';

describe('versionLine', () => {
  it('pairs the version with an iOS build number string', () => {
    expect(versionLine('1.0.0', '5')).toBe('1.0.0 (5)');
  });

  it('pairs the version with an Android versionCode number', () => {
    // Android hands this over as a number, iOS as a string. Both reach this row.
    expect(versionLine('1.0.0', 5)).toBe('1.0.0 (5)');
  });

  it('shows the version alone when there is no build number', () => {
    expect(versionLine('1.0.0', null)).toBe('1.0.0');
    expect(versionLine('1.0.0', undefined)).toBe('1.0.0');
    expect(versionLine('1.0.0', '  ')).toBe('1.0.0');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace', '   '],
  ])('admits it does not know when the version is %s', (_label, version) => {
    // Constants.expoConfig is nullable at runtime. An empty row reads as a
    // rendering bug; "Unknown" reads as a fact, and support asks for a build
    // number first every time.
    expect(versionLine(version, '5')).toBe('Unknown');
  });

  it('handles a build number with no version at all', () => {
    expect(versionLine(null, null)).toBe('Unknown');
  });
});

describe('the licence list', () => {
  it('names something and a licence for every entry', () => {
    for (const entry of LICENCES) {
      expect(entry.name.trim()).not.toBe('');
      expect(entry.licence.trim()).not.toBe('');
    }
  });

  it('lists nothing twice', () => {
    // Copy-paste is how these lists rot; a duplicate row is the visible symptom.
    const names = LICENCES.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the privacy points', () => {
  it('says something', () => {
    expect(PRIVACY_POINTS.length).toBeGreaterThan(0);
    for (const point of PRIVACY_POINTS) {
      expect(point.trim()).not.toBe('');
    }
  });
});

/**
 * The panel is a set of CLAIMS about shipped behaviour. This is the test that
 * makes them cost something to get wrong.
 *
 * It exists because they were wrong. The panel told players, in five languages,
 * that their progress "is stored on this device" and that deleting the app
 * deletes it. Neither survived `src/auth/sync.ts` landing -- progress is
 * uploaded to Supabase keyed by user_id and outlives an uninstall. about.ts
 * even carried a comment predicting exactly this failure, and a comment did not
 * stop it happening. See docs/LEGAL-REVIEW.md, Count 2.
 *
 * A false statement about where personal data goes is a GDPR Art. 13 problem
 * and an FTC Act section 5 problem, in whichever language it is read.
 */
describe('the privacy panel tells the truth about sync', () => {
  /*
   * Read as text rather than imported. The question is not what sync.ts
   * exports -- it is whether this repo contains code that writes player data to
   * a server at all. A future module doing the same thing under another name
   * should trip this too, which is why the check is on the behaviour's
   * signature and not on one function's identity.
   */
  const syncSource = readFileSync('src/auth/sync.ts', 'utf8');
  const uploadsToAServer = syncSource.includes('.upsert(');

  it('mentions the account whenever the code uploads progress', () => {
    if (!uploadsToAServer) return;

    const shown = PRIVACY_POINTS.map((k) => EN[k] ?? '').join(' ').toLowerCase();
    expect(
      shown.includes('account'),
      'src/auth/sync.ts upserts player progress to a server, so the privacy ' +
        'panel has to say an account stores something. Add a point to ' +
        'PRIVACY_POINTS and write it in all five locales.',
    ).toBe(true);
  });

  it('does not claim progress lives only on the device', () => {
    if (!uploadsToAServer) return;

    const progress = (EN['settings.privacy.progress'] ?? '').toLowerCase();
    // The exact sentence that shipped, and the shape of it. "on this device" is
    // fine and true; "only on this device" is the lie.
    expect(progress).not.toContain('only on this device');
    expect(progress.includes('sign in') || progress.includes('account')).toBe(true);
  });

  it('does not promise that deleting the app deletes everything', () => {
    if (!uploadsToAServer) return;

    const deletion = (EN['settings.privacy.deletion'] ?? '').toLowerCase();
    expect(
      deletion.includes('account'),
      'Deleting the app does not touch rows on the server. The deletion point ' +
        'has to say what survives and how to remove it.',
    ).toBe(true);
  });

  it('points somewhere a player can read the full policy', () => {
    const shown = PRIVACY_POINTS.map((k) => EN[k] ?? '').join(' ').toLowerCase();
    expect(shown).toContain('privacy policy');
  });
});
