import { describe, it, expect } from 'vitest';
import { clearanceFor } from './tabBarClearance';

/**
 * The regression this file exists for shipped: every docked control on the case
 * tabs sat roughly a tab-bar height above the tab bar, because the bar was being
 * added to an inset that already contained it.
 */
describe('clearanceFor', () => {
  const IOS_BAR = 49;
  const ANDROID_BAR = 56;

  it('adds the bar when the navigator has not consumed the inset', () => {
    // Home indicator only. The bar is genuinely not accounted for yet.
    expect(clearanceFor(IOS_BAR, 34)).toBe(83);
  });

  it('adds the bar when there is no inset at all', () => {
    expect(clearanceFor(IOS_BAR, 0)).toBe(49);
  });

  it('does NOT add the bar a second time when the inset already carries it', () => {
    // iOS 26's native tab bar reports 49 + 34 through the safe area. Adding BAR
    // again produced 132 and put a bar-height of dead space under every dock.
    expect(clearanceFor(IOS_BAR, 83)).toBe(83);
    expect(clearanceFor(ANDROID_BAR, 80)).toBe(80);
  });

  it('never returns less than the inset, so nothing lands under the home indicator', () => {
    for (const inset of [0, 20, 34, 48, 49, 60, 83, 120]) {
      expect(clearanceFor(IOS_BAR, inset)).toBeGreaterThanOrEqual(inset);
    }
  });

  it('never returns less than the bar, so nothing lands under the bar', () => {
    for (const inset of [0, 20, 34, 48, 49, 60, 83, 120]) {
      expect(clearanceFor(IOS_BAR, inset)).toBeGreaterThanOrEqual(IOS_BAR);
    }
  });

  /**
   * The boundary is the whole rule. At exactly the bar height the inset is
   * treated as bar-inclusive, which is the conservative reading: it still clears
   * the bar exactly.
   */
  it('treats an inset of exactly the bar height as already containing it', () => {
    expect(clearanceFor(IOS_BAR, 49)).toBe(49);
    expect(clearanceFor(IOS_BAR, 48)).toBe(97);
  });
});
