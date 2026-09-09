import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from '@/i18n/strings';

/**
 * The confession, typed rather than dumped.
 *
 * It used to render whole inside a FadeIn and the transcript then jerked itself
 * down to the last sentence — the payoff for an entire case arriving in one
 * frame, already over by the time the player looked at it.
 *
 * Read as source text for the reason the rest of this folder's guards are:
 * vitest cannot parse react-native, so a component-coupled invariant is checked
 * by reading the file. See `bubbleMemo.test.ts` for the original of this pattern.
 */
const screen = readFileSync(join('src', 'ui', 'ConfrontationScreen.tsx'), 'utf8');
const typewriter = readFileSync(join('src', 'ui', 'Typewriter.tsx'), 'utf8');

describe('the confession types itself out', () => {
  it('renders through the Typewriter, not as a bare Text', () => {
    expect(screen).toContain('<Typewriter');
    expect(screen).toContain('text={confrontation.confession}');
    // The exact line that used to dump it.
    expect(screen).not.toContain('<Text style={styles.confessionText}>{confrontation.confession}</Text>');
  });

  it('lets Reduce Motion and a player tap take the same instant path', () => {
    expect(screen).toContain('instant={reduceMotion || skipped}');
  });

  /**
   * The one that matters most. A Close button drawn over a half-written
   * confession invites the tap that ends the scene the player just earned.
   */
  it('holds the Close button back until the last character has landed', () => {
    const revealed = screen.indexOf('revealed ? (');
    const close = screen.indexOf("t('confront.close')");
    expect(revealed).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(revealed);
  });

  it('always offers a way past it, so waiting is never the only option', () => {
    expect(screen).toContain("t('confront.skip')");
    // The passage itself, as well as the control below it.
    expect(screen).toContain('onPress={() => setSkipped(true)}');
    expect(EN['confront.skip']).toBeTruthy();
  });

  it('does not animate the scroll while the text is still growing', () => {
    expect(screen).toContain('animated: !reduceMotion && !typing');
    expect(screen).toContain('const typing = confessed && !revealed;');
  });
});

describe('Typewriter', () => {
  /**
   * Confessions run from 658 characters to 2717. A single rate that reads well
   * for the short ones makes the long ones a thirty-six second hostage
   * situation, so the passage gets a duration budget with clamps at both ends.
   */
  it('derives its rate from the length of the passage', () => {
    expect(typewriter).toContain('text.length / TARGET_SECONDS');
    expect(typewriter).toContain('MIN_CPS');
    expect(typewriter).toContain('MAX_CPS');
  });

  it('hands a screen reader the whole passage from the first frame', () => {
    expect(typewriter).toContain('accessibilityLabel={text}');
  });

  /**
   * React may run a state updater twice. Firing the caller's completion callback
   * from inside one would close the case twice, or skip the ending outright.
   */
  it('signals completion from an effect, never from inside the state updater', () => {
    expect(typewriter).toContain('const complete = shown >= text.length;');
    const updater = typewriter.slice(typewriter.indexOf('setInterval'), typewriter.indexOf('const complete'));
    expect(updater).not.toContain('done.current()');
  });

  it('stops its own interval rather than ticking on past the end', () => {
    expect(typewriter).toContain('clearInterval');
  });
});
