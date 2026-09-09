import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearanceFor } from './tabBarClearance';

/**
 * How much bottom padding a screen inside the case tabs needs so the native tab
 * bar does not sit on top of its content.
 *
 * The confrontation screen's evidence chips were being covered by the tab bar —
 * half a chip was visible behind "Accuse" — because the tray carried
 * `paddingBottom: theme.space.lg`, twenty points, against a bar that is at least
 * forty-nine. `EvidenceBoard` has the same bug with a slightly larger number.
 *
 * ## Why this is a constant and not a measurement
 *
 * `expo-router/unstable-native-tabs` renders a real UITabBar / BottomNavigationView
 * and exposes no height. `@react-navigation/bottom-tabs` — which does have
 * `useBottomTabBarHeight` — is not installed, and pulling it in for one number
 * would add a navigator this app does not use.
 *
 * So: the platform's documented bar height, and whatever the safe area reports,
 * combined by `clearanceFor` — which is where the reasoning about the three
 * readings of `insets.bottom` lives, and why the bar is no longer added to an
 * inset that already contains it. The failure modes are not symmetric, and that
 * is still the point: over-padding leaves dead space under a docked control,
 * under-padding hides a control the player has to tap.
 */

/** UITabBar is 49pt; Android's BottomNavigationView is 56dp. */
const BAR = Platform.select({ ios: 49, android: 56, default: 56 });

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return clearanceFor(BAR, insets.bottom);
}
