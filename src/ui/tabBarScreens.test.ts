import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every screen under the case tabs has to clear the tab bar itself.
 *
 * `expo-router/unstable-native-tabs` draws a real floating UITabBar OVER the
 * screen rather than shrinking it, so a scroller that ends at its own last row
 * ends underneath the bar. There is no container to fix this once for everyone
 * — each tab renders its own scroller — so the rule is per screen, and three
 * screens had quietly forgotten it:
 *
 * - `BriefingScreen`, whose "Open the messages" button sat under the bar on any
 *   case with a brief long enough to push it down. That is why it looked like
 *   it only happened on *some* cases: a short brief centres and clears the bar
 *   by luck.
 * - the inbox in `threads.tsx`, which padded 32pt against a bar of at least 49.
 * - `CaseClosedScreen`, which used the raw `insets.bottom` — the exact reading
 *   `tabBarClearance.ts` exists to correct.
 *
 * Read as source text because vitest cannot parse react-native; see
 * `bubbleMemo.test.ts` for the original of this pattern.
 */
const TAB_DIR = join('app', 'case', '[caseId]');

/**
 * Every screen that owns a bottom edge inside the tabs. Adding a screen here is
 * the cheap half of the rule; the test below makes forgetting it expensive.
 */
const UNDER_TABS = [
  join(TAB_DIR, 'threads.tsx'),
  join('src', 'ui', 'BriefingScreen.tsx'),
  join('src', 'ui', 'CaseClosedScreen.tsx'),
  join('src', 'ui', 'EvidenceBoard.tsx'),
  join('src', 'ui', 'AccusationScreen.tsx'),
  join('src', 'ui', 'ConfrontationScreen.tsx'),
];

describe('screens inside the case tabs clear the tab bar', () => {
  it.each(UNDER_TABS)('%s asks for the clearance', (file) => {
    expect(readFileSync(file, 'utf8')).toContain('useTabBarClearance');
  });

  /**
   * The specific mistake, not just the missing call. `insets.bottom` reads
   * bar-INCLUSIVE under iOS 26 native tabs and bar-exclusive everywhere else,
   * so a screen that trusts it directly is correct on one device and wrong on
   * the next. `clearanceFor` is where that reasoning lives.
   */
  it.each(UNDER_TABS)('%s never pads the bottom from the raw inset', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/(?:padding|margin)Bottom: insets\.bottom/);
  });

  /**
   * A fourth tab would render outside every assertion above and nothing would
   * say so. This fails the moment one is added, which is the only moment the
   * reminder is useful.
   */
  it('knows every tab route, so a new one cannot arrive unchecked', () => {
    const routes = readdirSync(TAB_DIR)
      .filter((f) => f.endsWith('.tsx') && !f.startsWith('_'))
      .sort();
    expect(routes).toEqual(['accuse.tsx', 'board.tsx', 'threads.tsx']);
  });
});
