import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * A passage that arrives a letter at a time.
 *
 * Built for one moment: the killer's confession, which used to appear whole and
 * then jerk the transcript down to its last sentence. The player had spent the
 * case pulling single facts out of someone one at a time, and the payoff for
 * finishing was a wall of text landing in a single frame. Typing it out gives
 * the ending the same pace as the interrogation that earned it.
 *
 * ## Why the rate is derived and not fixed
 *
 * Confessions run from 658 characters to 2717. At any single rate that reads
 * well for the short ones, the long ones become a hostage situation — 2717
 * characters at a comfortable 75/sec is thirty-six seconds of watching. So the
 * passage is given a duration budget instead of a speed, clamped at both ends so
 * a short confession is not slowed to a crawl and a long one is not flicked past
 * too fast to read along with.
 *
 * ## What it does NOT do
 *
 * It does not own whether to animate. `instant` is the caller's decision, which
 * is what lets Reduce Motion and a player's tap-to-skip be the same code path,
 * and what keeps this component from having to know either concept exists.
 */

/** ~40 updates a second: fine enough to read as letters, coarse enough to be cheap. */
const FRAME_MS = 25;

/** Seconds the whole passage aims to take, before the clamps below. */
const TARGET_SECONDS = 18;

/** Characters per second, floor and ceiling. */
const MIN_CPS = 55;
const MAX_CPS = 150;

interface Props {
  readonly text: string;
  readonly style?: StyleProp<TextStyle>;
  /** Draw the whole passage at once — Reduce Motion, or the player skipped. */
  readonly instant: boolean;
  /** Fired once the last character is on screen, however it got there. */
  readonly onDone: () => void;
}

export function Typewriter({ text, style, instant, onDone }: Props) {
  const [shown, setShown] = useState(0);

  /*
   * Held in a ref, not read from the closure. A caller that rebuilds this
   * callback on every render would otherwise restart the animation on every
   * render, and the confession would never finish typing.
   */
  const done = useRef(onDone);
  done.current = onDone;

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (instant) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const cps = Math.min(MAX_CPS, Math.max(MIN_CPS, text.length / TARGET_SECONDS));
    const step = Math.max(1, Math.round((cps * FRAME_MS) / 1000));
    timer.current = setInterval(
      () => setShown((n) => Math.min(text.length, n + step)),
      FRAME_MS,
    );
    return () => {
      if (timer.current !== null) clearInterval(timer.current);
      timer.current = null;
    };
  }, [text, instant]);

  /*
   * Completion is derived, never signalled from inside the state updater —
   * React may run an updater twice, and firing the caller's callback twice would
   * be a side effect in a function that is required to be pure.
   */
  const complete = shown >= text.length;
  useEffect(() => {
    if (!complete) return;
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
    done.current();
  }, [complete]);

  /*
   * The label carries the whole passage from the first frame. Without it a
   * screen reader would be handed a string that grows under it forty times a
   * second, and VoiceOver would either stutter or read a sentence that is not
   * finished being written.
   */
  return (
    <Text style={style} accessibilityLabel={text}>
      {text.slice(0, shown)}
    </Text>
  );
}
