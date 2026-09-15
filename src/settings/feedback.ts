import * as Haptics from 'expo-haptics';
import { playCue } from '@/audio/sound';
import type { CueId } from '@/audio/cues';
import { currentSettings } from './settingsStore';

/**
 * Every haptic and every sound in the game goes through here.
 *
 * Before this existed, six components imported expo-haptics directly. That is
 * what made a "Haptics" switch impossible rather than merely unimplemented:
 * there was no single place the preference could be read, so the switch would
 * have been a decoration that toggled a stored boolean nothing consulted.
 *
 * Consequence, and it is the important one: no component may import expo-haptics
 * again. A direct call is a call that ignores the player's setting.
 */

/** Fire-and-forget. A rejected haptic must not become an unhandled rejection. */
function fire(effect: Promise<void>): void {
  void effect.catch(() => {
    // No vibrator, no permission, or an emulator. Never worth surfacing.
  });
}

export const feedback = {
  /** Moving between options. The lightest thing the phone can do. */
  selection(): void {
    if (!currentSettings().hapticsEnabled) return;
    fire(Haptics.selectionAsync());
  },

  /**
   * A primary button being pressed. Sound and a light knock together.
   *
   * Its own method rather than folded into `selection()`, deliberately. Several
   * controls already pair `selection()` with a cue of their own — a claim chip
   * plays `pin` — and adding a tap in there would fire two sounds on one press.
   * This is for the buttons that currently produce nothing at all: the front
   * door, the end of setup, the ways out of a finished case.
   */
  tap(): void {
    const settings = currentSettings();
    if (settings.hapticsEnabled) fire(Haptics.selectionAsync());
    playCue('tap', settings);
  },

  impact(style: 'light' | 'medium'): void {
    if (!currentSettings().hapticsEnabled) return;
    fire(
      Haptics.impactAsync(
        style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ),
    );
  },

  notify(type: 'success' | 'warning'): void {
    if (!currentSettings().hapticsEnabled) return;
    fire(
      Haptics.notificationAsync(
        type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ),
    );
  },

  /**
   * Plays a sound cue at whatever the player's settings resolve to.
   *
   * A no-op until that cue has an asset in src/audio/registry.ts, which is the
   * shipped state today.
   */
  cue(id: CueId): void {
    playCue(id, currentSettings());
  },
};
