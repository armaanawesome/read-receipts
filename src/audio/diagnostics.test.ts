import { describe as it_describes, expect, test, beforeEach } from 'vitest';
import { audioLog, clearAudioLog, describe, note } from './diagnostics';

beforeEach(() => {
  clearAudioLog();
});

it_describes('the audio log', () => {
  test('records what happened, oldest first', () => {
    note('skipped', 'cue:pin', 'sound is switched off', 1);
    note('played', 'cue:contradiction', 'volume 0.490', 2);

    expect(audioLog().map((e) => e.subject)).toEqual(['cue:pin', 'cue:contradiction']);
  });

  test('keeps the reason, which is the whole point of recording a skip', () => {
    note('skipped', 'bed:menu', 'reduceMotion silences beds', 1);

    expect(audioLog()[0]?.detail).toBe('reduceMotion silences beds');
  });

  /**
   * A cue fires on every arriving message, so an unbounded log would be a slow
   * leak in the one module that is supposed to be harmless.
   */
  test('is bounded, and drops the oldest rather than the newest', () => {
    for (let i = 0; i < 200; i++) note('played', `cue:${i}`, 'x', i);

    const log = audioLog();
    expect(log.length).toBe(60);
    // The newest survived; the oldest did not.
    expect(log[log.length - 1]?.subject).toBe('cue:199');
    expect(log.some((e) => e.subject === 'cue:0')).toBe(false);
  });
});

it_describes('describe()', () => {
  test('prefers an Error message', () => {
    expect(describe(new Error('no audio route'))).toBe('no audio route');
  });

  /** An Error with no message would otherwise render as an empty line. */
  test('falls back to the name when an Error carries no message', () => {
    expect(describe(new Error())).toBe('Error');
  });

  test('passes a thrown string through', () => {
    expect(describe('NativeModule missing')).toBe('NativeModule missing');
  });

  /**
   * The case this function exists for. A rejected native promise is often a
   * plain object, and `String(e)` would render `[object Object]` at exactly the
   * moment somebody needed to read the message.
   */
  test('reads message off a plain rejected object', () => {
    expect(describe({ message: 'Player released' })).toBe('Player released');
  });

  test('serialises a plain object that has no message', () => {
    expect(describe({ code: 'E_SESSION' })).toBe('{"code":"E_SESSION"}');
  });

  test('survives a circular object rather than throwing inside a catch', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(() => describe(circular)).not.toThrow();
  });
});
