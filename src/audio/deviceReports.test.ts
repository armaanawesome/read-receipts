import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describeAuthError } from '../auth/session';

/**
 * Four device reports, each locked so it cannot come back quietly.
 *
 * Every one of these survived at least one round of fixes that looked right in
 * review and was green in this suite, because nothing here failed when the bug
 * came back. That is the gap this file closes. Each test asserts the ROOT CAUSE
 * rather than the symptom, because the symptom is only observable on a handset.
 *
 * Source files are read as text, the pattern `claimMarking.test.ts` uses:
 * `sound.ts` and `MessageList.tsx` import native modules and cannot be loaded
 * under Node, but what they must never contain can still be checked.
 */

const ROOT = join(__dirname, '../..');

/** Source with block and line comments removed, so an explanation of an old
 *  bug cannot satisfy or trip a check meant for the code itself. */
function code(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function wav(path: string): { rate: number; samples: Int16Array } {
  const b = readFileSync(join(ROOT, path));
  const rate = b.readUInt32LE(24);
  let i = 12;
  while (i < b.length) {
    const id = b.toString('ascii', i, i + 4);
    const size = b.readUInt32LE(i + 4);
    if (id === 'data') {
      const start = b.byteOffset + i + 8;
      return { rate, samples: new Int16Array(b.buffer.slice(start, start + size)) };
    }
    i += 8 + size;
  }
  throw new Error('no data chunk in ' + path);
}

describe('text tones play on every message, not once per launch', () => {
  const sound = code('src/audio/sound.ts');

  /**
   * expo-audio's Android `isLoaded` property is `playbackState == STATE_READY`.
   * A cue that has finished is in STATE_ENDED, so `isLoaded` is false on every
   * replay. Gating the rewind on it skipped the rewind exactly when it was
   * needed, and a finished player plays nothing. One tone per cue per launch.
   */
  it('never decides whether to rewind from player.isLoaded', () => {
    expect(sound).not.toMatch(/isLoaded\s*&&/);
  });

  it('always rewinds to the start before playing', () => {
    expect(sound).toMatch(/seekTo\(0\)\.then\(/);
  });
});

describe('a fast tap cannot swallow the next message tone', () => {
  /*
   * Scoped to the tap handler. `thread.messages[shown]` is CORRECT at render
   * time -- the component reads it to decide whether to draw the typing
   * indicator, and there `shown` is the committed value. The bug only exists
   * inside the callback, where `shown` is whatever the last render captured.
   */
  const list = code('src/ui/MessageList.tsx');
  const start = list.indexOf('const advance = useCallback(');
  const end = list.indexOf('}, [', start);
  const advance = start >= 0 && end > start ? list.slice(start, end) : '';

  it('can find the tap handler to check', () => {
    expect(advance).not.toBe('');
  });

  /**
   * Reading `shown` from the callback's closure let two taps before a
   * re-render reveal the same message twice -- two tones -- while the screen
   * still moved on by two, so the next message arrived silent.
   */
  it('does not reveal from the closure value of shown', () => {
    expect(advance).not.toMatch(/thread\.messages\[shown\]/);
  });

  it('claims the next index synchronously, on the tap itself', () => {
    expect(advance).toMatch(/nextRef\.current = i \+ 1/);
  });
});

describe('the clue tone is distinct from ordinary texts', () => {
  const ordinary = wav('assets/audio/message.wav');
  const clue = wav('assets/audio/messageClaim.wav');

  /**
   * The rising three-note clue tone and the falling two-note ordinary one are
   * told apart by shape, not by level. They must be genuinely different files.
   */
  it('is a different sound from the ordinary message tone', () => {
    expect(clue.samples.length / clue.rate).not.toBeCloseTo(
      ordinary.samples.length / ordinary.rate,
      2,
    );
  });

  /**
   * Playback starts from silence, so a file whose first sample is far from zero
   * pops on every play. It began at about -9200 out of 32767.
   */
  it('starts from silence rather than with a pop', () => {
    expect(Math.abs(clue.samples[0] ?? 0)).toBeLessThan(200);
  });
});

describe('the lobby music loops without a stumble', () => {
  const { rate, samples } = wav('assets/audio/bed-menu.wav');
  const seconds = samples.length / rate;
  const isWhole = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9;

  /**
   * The heartbeat is every 1.2s and the falling figure every 4s. A loop whose
   * length divides by neither restarts mid-rhythm. It was 15.4s -- a 16s loop
   * with 0.6s trimmed off -- and the pattern stumbled on every pass.
   */
  it('is a whole number of heartbeats long', () => {
    expect(isWhole(seconds / 1.2)).toBe(true);
  });

  it('is a whole number of figures long', () => {
    expect(isWhole(seconds / 4)).toBe(true);
  });

  /**
   * The last sample must lead into the first no harder than ordinary movement
   * within the file does, or the seam is an audible click.
   */
  it('joins itself without a step at the seam', () => {
    const steps: number[] = [];
    for (let k = 0; k < samples.length - 1; k += 1) {
      steps.push(Math.abs((samples[k + 1] ?? 0) - (samples[k] ?? 0)));
    }
    steps.sort((a, b) => a - b);
    const p99 = steps[Math.floor(steps.length * 0.99)] ?? 0;
    const seam = Math.abs((samples[0] ?? 0) - (samples[samples.length - 1] ?? 0));
    expect(seam).toBeLessThanOrEqual(p99);
  });
});

describe('the music inside a case flows instead of stumbling', () => {
  /*
   * The case beds were 8s drones with a hiss layer, crossfaded head-to-tail and
   * TRIMMED to 7.5s -- the same finish that made the lobby stumble. The report
   * on the handset: "the same old static noise". They are composed now, in the
   * lobby's language but not its tune, and held to the lobby's loop rules.
   */
  const CASE_LOOP = 16; // 8 pulses of 2s, 2 figures of 8s, one chord change.
  const beds = readdirSync(join(ROOT, 'assets/audio'))
    .filter((f) => f.startsWith('bed-') && f !== 'bed-menu.wav');

  it('covers every case track', () => {
    // Every case in content/cases, tutorial included. bed-menu is the lobby.
    expect(beds.length).toBe(16);
  });

  it.each(beds)('%s is exactly one loop long -- nothing trimmed', (file) => {
    const { rate, samples } = wav(`assets/audio/${file}`);
    expect(samples.length).toBe(CASE_LOOP * rate);
  });

  it.each(beds)('%s joins itself without a step at the seam', (file) => {
    const { samples } = wav(`assets/audio/${file}`);
    const steps: number[] = [];
    for (let k = 0; k < samples.length - 1; k += 1) {
      steps.push(Math.abs((samples[k + 1] ?? 0) - (samples[k] ?? 0)));
    }
    steps.sort((a, b) => a - b);
    const p99 = steps[Math.floor(steps.length * 0.99)] ?? 0;
    const seam = Math.abs((samples[0] ?? 0) - (samples[samples.length - 1] ?? 0));
    expect(seam).toBeLessThanOrEqual(p99);
  });

  it('is not the lobby track', () => {
    const menu = wav('assets/audio/bed-menu.wav');
    const first = wav(`assets/audio/${beds[0]}`);
    expect(first.samples.length / first.rate).not.toBe(menu.samples.length / menu.rate);
  });
});

describe('dragging the volume slider never restarts the music', () => {
  /*
   * A drag streams values and a touch at the left end is exactly zero. Routed
   * through the bed's state machine, that zero released the player and the next
   * frame built a new one from 0:00. The preview may only turn a live player.
   */
  const music = code('src/audio/music.ts');
  const start = music.indexOf('export function previewBedVolume(');
  const preview = start >= 0 ? music.slice(start, music.indexOf('\n}', start)) : '';

  it('previews through a function that cannot create or release a player', () => {
    expect(preview).not.toBe('');
    expect(preview).not.toMatch(/release\(|startBed\(|apply\(|createAudioPlayer/);
  });

  it('is what the settings slider previews with', () => {
    expect(code('app/settings.tsx')).toMatch(/onPreview=\{\(soundVolume\) =>\s*previewBedVolume\(/);
  });
});

describe('a stopped loop is actually stopped', () => {
  /*
   * expo-audio 57's remove() only unregisters a player; it keeps playing. Every
   * "release" left a loop running that nothing could reach: mute did nothing,
   * the slider moved only the newest copy, copies stacked after each trip to the
   * background, and the music carried on in the app switcher.
   */
  const sound = code('src/audio/sound.ts');
  const music = code('src/audio/music.ts');

  it('frees players with release(), not remove() alone', () => {
    const start = sound.indexOf('export function disposePlayer(');
    const dispose = start >= 0 ? sound.slice(start, sound.indexOf('\n}', start)) : '';
    expect(dispose).toMatch(/\.release\(\)/);
    expect(dispose).toMatch(/\.pause\(\)/);
  });

  it('never calls remove() anywhere but disposePlayer', () => {
    const outside = sound.replace(/export function disposePlayer\([\s\S]*?\n\}/, '') + music;
    expect(outside).not.toMatch(/\.remove\(\)/);
  });

  it('cannot build a second player when two cold starts land together', () => {
    expect(music).toMatch(/current !== trackId \|\| player !== null/);
  });
});

describe('leaving the app puts the music on standby', () => {
  const root = code('app/_layout.tsx');

  it('pauses on background and inactive, resumes on active', () => {
    expect(root).toMatch(/pauseBed\(\)/);
    expect(root).toMatch(/next === 'active'\)\s*\{\s*resumeBed\(\)/);
  });

  /* stopBed forgets the track, so a working stop would return to silence. */
  it('does not stop the bed when the app is backgrounded', () => {
    expect(root).not.toMatch(/stopBed\(/);
  });
});

describe('a server that cannot be reached is named as one', () => {
  /**
   * The strings a dead or unreachable Supabase host actually produces: React
   * Native's fetch rejection, and supabase-js's retryable-fetch wrapper. Both
   * must land on the message that sends the player to guest mode, not on a raw
   * pass-through the player cannot act on.
   */
  it.each(['Network request failed', 'Failed to fetch', 'TypeError: Failed to fetch'])(
    'maps "%s" to the server-issue message',
    (raw) => {
      expect(describeAuthError(raw)).toEqual({ key: 'auth.error.network' });
    },
  );
});
