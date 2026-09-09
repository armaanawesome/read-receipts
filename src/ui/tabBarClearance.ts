/**
 * How a tab-bar height and a safe-area inset combine into one bottom clearance.
 *
 * Split out of `useTabBarClearance` with zero imports so it can actually be
 * tested: that file pulls in `react-native` and `react-native-safe-area-context`
 * at module scope, and vitest cannot parse either.
 *
 * ## The double count this exists to prevent
 *
 * The rule used to be `BAR + insets.bottom` unconditionally, on the assumption
 * that the inset is either the home indicator alone (34) or nothing at all (0).
 * There is a third reading, and it is the one iOS 26 actually gives: the native
 * tab bar sets its own additional safe-area inset on the content below it, so
 * `insets.bottom` comes back already carrying the bar — about 83 on a device
 * with a home indicator. Adding `BAR` to that padded every docked control by a
 * second bar height, which is the strip of dead space that sat between the
 * board's "Run the check" button and the tab bar.
 *
 * An inset at least as tall as the bar can only mean the bar is already in it —
 * a home indicator alone never reaches 49pt — so that reading is safe to trust
 * exactly, and trusting it exactly is what puts a docked control flush against
 * the top of the bar instead of a bar-height above it.
 */
export function clearanceFor(bar: number, insetBottom: number): number {
  return insetBottom >= bar ? insetBottom : bar + insetBottom;
}
