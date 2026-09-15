/**
 * What the audio layer actually did, in order.
 *
 * ## Why this exists
 *
 * Every failure path in `sound.ts` and `music.ts` is a silent catch, and each
 * one is individually right: a 150ms sting must never take a case down. The
 * cost was paid somewhere else. Four separate rounds of audio fixes shipped
 * against no feedback signal at all, because from outside the module these four
 * states are indistinguishable:
 *
 *   - the player has sound switched off,
 *   - the cue has no asset,
 *   - the native call threw,
 *   - it played perfectly and was too quiet to hear.
 *
 * HANDOFF §7j is the record of what that costs: three rounds of retuning aimed
 * at the third case when the truth was the fourth, and the operative bug was
 * upstream of all of them.
 *
 * This module is the signal. It records rather than throws, so the catches stay
 * silent to the player and stop being silent to us.
 *
 * Imports nothing — same rule as `volume.ts` — so it runs in the Node suite.
 */

export type AudioEventKind =
  /** A native play() was actually called. */
  | 'played'
  /** A rule decided not to play. Not an error; the reason is the point. */
  | 'skipped'
  /** A native call threw or a promise rejected. */
  | 'failed';

export interface AudioEvent {
  readonly kind: AudioEventKind;
  /** What it was about: `cue:pin`, `bed:menu`, or `session`. */
  readonly subject: string;
  /** Why, in words somebody can act on rather than a code. */
  readonly detail: string;
  readonly at: number;
}

/**
 * Bounded, because this runs on the hot path of the whole game — a cue fires on
 * every message that arrives — and an unbounded array would be a slow leak in a
 * module whose entire purpose is to be harmless.
 */
const LIMIT = 60;

let events: readonly AudioEvent[] = [];

/**
 * `at` is a parameter with a default rather than a call to `Date.now()` inside,
 * so the test can assert ordering without sleeping or mocking the clock.
 */
export function note(
  kind: AudioEventKind,
  subject: string,
  detail: string,
  at: number = Date.now(),
): void {
  const next = [...events, { kind, subject, detail, at }];
  events = next.length > LIMIT ? next.slice(next.length - LIMIT) : next;
}

/** Oldest first. The debug screen reverses it; the order here is the truth. */
export function audioLog(): readonly AudioEvent[] {
  return events;
}

export function clearAudioLog(): void {
  events = [];
}

/**
 * An unknown thrown value as a line of text.
 *
 * `catch (e)` gives `unknown`, and the interesting cases are not all `Error`:
 * a rejected native promise on Android arrives as a plain object often enough
 * that `String(e)` alone would render `[object Object]` at exactly the moment
 * somebody needed the message.
 */
export function describe(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === 'string') return e;
  if (e !== null && typeof e === 'object') {
    const message = (e as { message?: unknown }).message;
    if (typeof message === 'string' && message !== '') return message;
    try {
      return JSON.stringify(e);
    } catch {
      // Circular. Fall through to the generic line below.
    }
  }
  return String(e);
}
