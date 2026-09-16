import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CASES } from '../../content/cases/index';
import { resolveBedVolume, resolveVolume } from './volume';
import { CUES } from './cues';

/**
 * The bed files and the cases cannot drift apart.
 *
 * Checks run on FILENAMES rather than on `beds.ts`, for the reason
 * `caseArtAssets.test.ts` sets out for the art map: that module is a list of
 * `require` calls on binaries, and requiring a WAV outside Metro throws. So the
 * registry is verified by the shape of the directory it points at, and the only
 * thing imported here is the arithmetic, which lives in `volume.ts` precisely so
 * that it can be.
 */

const AUDIO = join(__dirname, '../../assets/audio');
const files = (): string[] => (existsSync(AUDIO) ? readdirSync(AUDIO) : []);

const prefs = (over: Partial<Parameters<typeof resolveBedVolume>[0]> = {}) => ({
  soundEnabled: true,
  soundVolume: 1,
  reduceMotion: false,
  ...over,
});

describe('resolveBedVolume', () => {
  it('is silent when sound is off', () => {
    expect(resolveBedVolume(prefs({ soundEnabled: false }))).toBe(0);
  });

  /**
   * Unlike a `signal` cue, which survives Reduce Motion because losing it would
   * hide the moment a contradiction landed, a drone carries nothing. Somebody
   * who asked for less sensory load should not be handed seventeen of them.
   */
  it('is silent under Reduce Motion, even at full volume', () => {
    expect(resolveBedVolume(prefs({ reduceMotion: true }))).toBe(0);
  });

  /**
   * Under the cues, but audibly so. This asserted 0.2 while the bed files were
   * themselves normalised to half scale, and the two compounded to roughly
   * -36dBFS at the default slider — a number this test was perfectly happy with
   * and no human could hear. The test moved because the rule did.
   *
   * It moved a second time, and in the other direction, for a better reason
   * than either: somebody finally heard it. 0.5 put the bed around -24dBFS
   * while `message` landed near -30, so the drone ran continuously OVER the cue
   * it was meant to sit behind. The device report was "weird static noise", and
   * that the text tone never arrived — one number produced both complaints.
   *
   * 0.24 is the answer to the second of those. Do not raise it back without a
   * listener saying the bed has become inaudible, because the last two times
   * this number was chosen by reasoning alone it was wrong in both directions.
   */
  it('sits under the cues at the same slider position, but stays audible', () => {
    expect(resolveBedVolume(prefs())).toBeCloseTo(0.24, 5);
  });

  /**
   * The bed has to stay under `message` specifically, which is the cue it
   * masked. Asserted as a relationship rather than as two literals, so this
   * fails if either gain is nudged into overlapping again.
   */
  it('stays below the message cue at the same slider position', () => {
    expect(resolveBedVolume(prefs())).toBeLessThan(resolveVolume(prefs(), CUES.message));
  });

  it('follows the slider on the same square curve the cues use', () => {
    expect(resolveBedVolume(prefs({ soundVolume: 0.5 }))).toBeCloseTo(0.25 * 0.24, 5);
    expect(resolveBedVolume(prefs({ soundVolume: 0 }))).toBe(0);
  });

  it('never returns anything outside 0..1', () => {
    for (const v of [-5, 0, 0.3, 1, 42, Number.NaN]) {
      const out = resolveBedVolume(prefs({ soundVolume: v }));
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(1);
      expect(Number.isNaN(out)).toBe(false);
    }
  });
});

describe('audio assets', () => {
  it('ships a bed for the menu and for every case', () => {
    const present = new Set(files());
    expect(present.has('bed-menu.wav')).toBe(true);
    for (const c of CASES) {
      expect(present.has(`bed-${c.id}.wav`), `no bed for ${c.id}`).toBe(true);
    }
  });

  /** A bed nothing can reach is dead weight in the bundle. */
  it('ships no bed that no case and no screen asks for', () => {
    const known = new Set(['bed-menu.wav', ...CASES.map((c) => `bed-${c.id}.wav`)]);
    for (const f of files().filter((n) => n.startsWith('bed-'))) {
      expect(known.has(f), `${f} has no case`).toBe(true);
    }
  });

  it('ships every cue the engine can fire', () => {
    const present = new Set(files());
    for (const cue of ['message', 'pin', 'contradiction', 'confession', 'accusation']) {
      expect(present.has(`${cue}.wav`), `no file for the ${cue} cue`).toBe(true);
    }
  });

  /**
   * Every file is generated, so a truncated or half-written one is a real
   * possibility and would be silent on a device rather than loud. The header is
   * cheap to check and catches it.
   */
  it('writes real RIFF/WAVE files, mono 16-bit, with a matching data length', () => {
    for (const name of files().filter((n) => n.endsWith('.wav'))) {
      const b = readFileSync(join(AUDIO, name));
      expect(b.toString('ascii', 0, 4), `${name} header`).toBe('RIFF');
      expect(b.toString('ascii', 8, 12), `${name} format`).toBe('WAVE');
      expect(b.readUInt16LE(22), `${name} channels`).toBe(1);
      expect(b.readUInt16LE(34), `${name} bit depth`).toBe(16);
      expect(b.readUInt32LE(40), `${name} truncated`).toBe(b.length - 44);
    }
  });
});
