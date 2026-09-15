import type { CueGain } from './volume';

/**
 * Every sound the game can make, and what each one is for.
 *
 * ## The count went from five to eight, on purpose
 *
 * This file used to argue for keeping the set at four: a deduction game played
 * with the phone face up on a table needs its sound to mean something, and a cue
 * per interaction would turn the soundtrack into keyboard clatter until the two
 * that matter stopped registering. That argument is still right about clatter
 * and it was wrong about the gap it left.
 *
 * What the audit found was not a missing flourish. It was that **four moments
 * already fired a haptic and stayed silent** — a failed COMPARE, a deflected
 * press, a refused accusation, a claim going on the record. Somebody had already
 * judged each of those worth marking; only half the marking got built. A game
 * whose whole pitch is that a wrong pairing teaches you something cannot let the
 * teaching moment be the one with no sound.
 *
 * So the three added here are:
 *
 *  - `refused` — the counterpart to `contradiction`, and the reason for the
 *    change. A `signal`, because it carries the engine's explanation.
 *  - `caseClosed` — the payoff screen had no audio of any kind.
 *  - `tap` — the one concession to ordinary UI feedback, and the only cue in the
 *    set that carries no information. `flourish`, so Reduce Motion silences it,
 *    and mixed low enough to sit under everything else.
 *
 * The clatter rule still holds for everything NOT in this list: tab changes,
 * scrolling, typing, navigation. If a fourth thing wants a sound, it needs a
 * reason as good as those three.
 */
export type CueId =
  | 'message'
  | 'pin'
  | 'contradiction'
  | 'confession'
  | 'accusation'
  | 'refused'
  | 'caseClosed'
  | 'tap';

export interface Cue extends CueGain {
  readonly id: CueId;
}

export const CUES: Record<CueId, Cue> = {
  /** A bubble arrived. You are already watching it appear. */
  message: { id: 'message', role: 'flourish', gain: 0.45 },
  /** A claim went onto the board. The chip already changed state. */
  pin: { id: 'pin', role: 'flourish', gain: 0.35 },
  /** Two statements cannot both be true. This is the game; it is never silent. */
  contradiction: { id: 'contradiction', role: 'signal', gain: 1 },
  /** She admits it. The one moment the game is allowed to be loud. */
  confession: { id: 'confession', role: 'signal', gain: 0.9 },
  /**
   * A name being put to the record. A gavel, twice.
   *
   * `signal`, not `flourish`: naming somebody is the one irreversible-feeling
   * move in the game, and a player with Reduce Motion on still needs to hear
   * that it landed. Pitched under the confession, which is the louder moment.
   */
  accusation: { id: 'accusation', role: 'signal', gain: 0.8 },
  /**
   * The pairing does not hold, the press was deflected, the accusation was
   * refused.
   *
   * `signal`, and that is the whole argument for this cue existing: the engine
   * explains WHY two claims do not contradict, and that explanation is the
   * thing this game has instead of a dialogue tree. Somebody with Reduce Motion
   * on still needs to know the board answered them.
   *
   * Pitched under `contradiction` so a refusal never feels louder than a proof.
   */
  refused: { id: 'refused', role: 'signal', gain: 0.55 },
  /** The file closing, after the epilogue. Under the confession it follows. */
  caseClosed: { id: 'caseClosed', role: 'signal', gain: 0.7 },
  /**
   * A button. The only cue here that tells the player nothing they cannot see,
   * so it is the only new one that is a `flourish` — and the quietest thing in
   * the set, because it is also by far the most frequent.
   */
  tap: { id: 'tap', role: 'flourish', gain: 0.22 },
};

/**
 * Written out rather than derived from `Object.keys(CUES)`, which returns
 * `string[]` and would need a cast to become `CueId[]`. The test below is what
 * keeps the two in step instead.
 */
export const CUE_IDS: readonly CueId[] = [
  'message',
  'pin',
  'contradiction',
  'confession',
  'accusation',
  'refused',
  'caseClosed',
  'tap',
];
