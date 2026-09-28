import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, type LayoutChangeEvent } from 'react-native';
import { theme } from '@/ui/theme';
import { useTranslator } from '@/i18n/useTranslator';
import {
  VOLUME_STEPS,
  stepForVolume,
  volumeAtPosition,
  volumeForStep,
  volumeStepLabel,
} from './volumeSteps';

/**
 * A continuous volume slider.
 *
 * It replaces a six-bar stepped rail. The rail's own note argued that a slider
 * "would mean a new native module and a dev-client rebuild" — true of
 * `@react-native-community/slider`, and not true of this. React Native ships
 * PanResponder, so a drag costs nothing but the code below and needs no rebuild.
 *
 * PanResponder rather than react-native-gesture-handler, which is also
 * installed: this needs one axis, one finger, and no negotiation with a scroll
 * view's gesture, so the platform's own answer is the smaller one.
 *
 * ## The value is committed on release, not during the drag
 *
 * Settings autosave: every change to the store writes the whole blob to
 * AsyncStorage. Calling `onChange` per move event would issue a write per frame
 * for the length of a drag. So the thumb follows the finger from local state and
 * the store hears once, at the end — which is also the moment the value is what
 * the player actually meant.
 */

const TRACK_HEIGHT = 4;
const THUMB = 22;
/** The row stays a 44pt target even though the track it draws is 4pt tall. */
const ROW_HEIGHT = theme.hit.min;

export function VolumeSlider({
  volume,
  onChange,
  onPreview,
  disabled,
}: {
  volume: number;
  onChange: (next: number) => void;
  /**
   * Called on every move while a finger is down, with the position under it.
   * NOT persisted -- `onChange` still commits once, on release, for the reason
   * above. This exists so the player HEARS the level change as they drag,
   * which is how anybody judges a volume control. A slider that only acts on
   * release and gives no audible sign until then reads as one that does nothing.
   */
  onPreview?: (next: number) => void;
  disabled: boolean;
}) {
  const t = useTranslator();
  const [trackWidth, setTrackWidth] = useState(0);
  /** Non-null only while a finger is down. The thumb follows this, not the prop. */
  const [dragging, setDragging] = useState<number | null>(null);

  /*
   * PanResponder is built once and would otherwise close over the first render's
   * width and callback forever — the classic stale-closure bug, and here it
   * would present as a slider that works until the screen re-renders and then
   * silently computes against a width of zero.
   */
  const latest = useRef({ trackWidth, onChange, onPreview, disabled, volume });
  latest.current = { trackWidth, onChange, onPreview, disabled, volume };

  /**
   * The track's left edge in window coordinates.
   *
   * Needed because the gesture is measured in absolute screen space — see the
   * note on `valueAt`. Re-measured on every layout, since a rotation or a font
   * scale change moves it.
   */
  const trackRef = useRef<View>(null);
  const trackLeft = useRef(0);
  const measure = () => {
    trackRef.current?.measureInWindow((x) => {
      trackLeft.current = x;
    });
  };

  /**
   * Absolute X to a volume.
   *
   * **This used to read `e.nativeEvent.locationX`, and that was the bug that
   * made the whole game silent.** `locationX` is the touch position relative to
   * *the view under the finger*, not to the element holding the responder. The
   * thumb is a 22pt child sitting on the track, so the moment a drag reached the
   * thumb — which is immediately, because you grab the thumb to drag it — the
   * reading collapsed to a number between 0 and 22 measured inside the thumb.
   * Divided by the track width, that pinned the volume at about `22 / width`,
   * which on this layout is 0.2, and no drag could push past it.
   *
   * It was worse than a stuck control. Touching the slider once *committed* 0.2,
   * and 0.2 on the square response curve is 0.04 amplitude — every cue and bed
   * landing near -35dBFS. A single tap on the volume control permanently muted
   * the game, and nothing downstream in the audio pipeline could recover it.
   *
   * `gestureState.moveX` and `x0` are in window coordinates and do not care
   * which child is under the finger, which is exactly the property this needs.
   */
  const valueAt = (windowX: number): number =>
    volumeAtPosition(windowX - trackLeft.current, latest.current.trackWidth, latest.current.volume);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        onPanResponderGrant: (_e, g) => {
          // Re-measure on touch as well as on layout: the settings screen
          // scrolls, and a view that was measured before it settled would
          // otherwise carry a stale origin for the whole drag.
          measure();
          const start = valueAt(g.x0);
          setDragging(start);
          latest.current.onPreview?.(start);
        },
        onPanResponderMove: (_e, g) => {
          const next = valueAt(g.moveX);
          setDragging(next);
          latest.current.onPreview?.(next);
        },
        onPanResponderRelease: (_e, g) => {
          // `moveX` is 0 for a tap that never moved, so fall back to where the
          // touch started rather than committing the far left of the track.
          const next = valueAt(g.moveX || g.x0);
          setDragging(null);
          latest.current.onChange(next);
        },
        // A cancelled gesture — a call arriving, a parent claiming the responder
        // — must not leave the thumb parked somewhere the player never chose,
        // nor the music playing at a level that was never committed.
        onPanResponderTerminate: () => {
          setDragging(null);
          latest.current.onPreview?.(latest.current.volume);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const shown = dragging ?? volume;
  const step = stepForVolume(shown);

  return (
    <View
      style={styles.row}
      /*
       * One adjustable element, as the rail had. A screen reader user changes
       * this by swiping up and down, and the increments land on the same six
       * stops the rail used — a continuous drag is a pointer affordance, and
       * offering a swipe a hundred indistinguishable stops is not a finer
       * control, only a slower one.
       */
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('a11y.volume')}
      accessibilityValue={{ min: 0, max: VOLUME_STEPS, now: step, text: volumeStepLabel(step) }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = Math.min(VOLUME_STEPS, Math.max(0, step + delta));
        if (next !== step) onChange(volumeForStep(next));
      }}
      {...pan.panHandlers}
    >
      {/*
        Measured HERE rather than on the row above, which is the element that
        carries the accessibility role and the responder handlers. Measured
        there it reported nothing at all - not a wrong width, no layout event
        ever - and the thumb sat at zero however loud the volume was.
        src/ui/ClaimTimeline.tsx measures the same way on a plain styled View,
        which is the shape that works.
      */}
      <View
        ref={trackRef}
        style={[styles.track, disabled && styles.dim]}
        onLayout={(e: LayoutChangeEvent) => {
          setTrackWidth(e.nativeEvent.layout.width);
          // Width comes from the layout event; the window X does not, so it has
          // to be measured separately whenever the layout changes.
          measure();
        }}
      >
        <View style={[styles.fill, { width: `${shown * 100}%` }]} />
      </View>
      <View
        style={[
          styles.thumb,
          disabled && styles.dim,
          /*
           * Percentage plus a negative margin, so the thumb is positioned
           * without knowing any width. At 0 it sits flush left, at 1 its right
           * edge meets the end of the track, and in between it slides by the
           * track minus its own width - the same travel a measured version
           * gives, with nothing to measure and so nothing to measure wrongly.
           */
          { left: `${shown * 100}%`, marginLeft: -THUMB * shown },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: ROW_HEIGHT, justifyContent: 'center' },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: theme.color.rail,
    overflow: 'hidden',
  },
  fill: { height: TRACK_HEIGHT, backgroundColor: theme.color.accent },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: theme.color.accent,
    // A ring in the page colour, so the thumb keeps its edge where it overlaps
    // the filled part of its own track.
    borderWidth: 2,
    borderColor: theme.color.bg,
  },
  dim: { opacity: 0.4 },
});
