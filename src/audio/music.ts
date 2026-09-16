import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { bedSource } from './beds';
import { audioSessionReady, primeAudio } from './sound';
import { resolveBedVolume, type VolumePrefs } from './volume';
import { describe, note } from './diagnostics';

/**
 * The looping background bed. One at a time, ever.
 *
 * Sibling of sound.ts and built to the same rules: every decision was made in a
 * pure file (beds.ts) and tested there, no background drone is worth a crash, so
 * every native call is guarded — and every guard reports, because a bed that
 * fails silently is how seventeen tracks went unheard for a month.
 *
 * ## Why a module-level player rather than one per track
 *
 * Cues keep a player each because they retrigger constantly and creating one per
 * sting would stutter. A bed is the opposite: exactly one plays, it plays for
 * minutes, and holding seventeen decoded loops in memory to save a swap that
 * happens only when the player changes screen would waste a phone's RAM for no
 * gain anybody could hear.
 */

let player: AudioPlayer | null = null;
/** Which track that player holds, so an unchanged track is never restarted. */
let current: string | null = null;
/**
 * The track the app WANTS playing, which is not the same question as which one
 * has a player.
 *
 * Kept separately so muting can release the native player without losing the
 * answer to "what should be playing here". Without it, turning the volume to
 * zero and back up again would leave silence: the player is gone, and the only
 * thing that knew the track id went with it.
 */
let desired: string | null = null;

/**
 * Play `trackId` on a loop, or stop everything when it is null.
 *
 * Idempotent on the track: calling it repeatedly with the same id only updates
 * the volume. That matters because the screens driving this re-render for
 * reasons with nothing to do with audio, and a bed that restarted from the top
 * on every render would be a stutter rather than a soundtrack.
 */
export function playBed(trackId: string | null, prefs: VolumePrefs): void {
  desired = trackId;
  apply(prefs);
}

/**
 * Re-apply the player's volume settings to whatever is already playing.
 *
 * ## The bug this exists for
 *
 * `useBed` runs inside `useFocusEffect`, so it re-fires only while ITS screen is
 * the one in front. The volume slider lives in Settings, which is pushed on top
 * of the home screen — so while somebody is dragging that slider, the only hook
 * that could change the bed's volume belongs to a screen that is blurred and is
 * not listening. The drone carried on at whatever level it started at, and the
 * first device report said exactly that: "the slider is moving but volume is not
 * decreasing or increasing".
 *
 * Volume is a property of the audio session rather than of a screen, so it is
 * driven from the root layout, which is mounted for the life of the app and can
 * never be the blurred one.
 */
export function setBedVolume(prefs: VolumePrefs): void {
  apply(prefs);
}

function apply(prefs: VolumePrefs): void {
  const trackId = desired;
  const volume = resolveBedVolume(prefs);

  // Muted, silenced by Reduce Motion, or nothing wanted. Release the player
  // rather than leave a silent one holding the audio session open — but keep
  // `desired`, so turning the volume back up resumes instead of going quiet
  // until the player happens to change screen.
  if (trackId === null || volume <= 0) {
    if (trackId !== null && current !== null) {
      note('skipped', `bed:${trackId}`, whyBedSilent(prefs));
    }
    release();
    return;
  }

  const source = bedSource(trackId);
  // No bed generated for this case yet. Silence, not an error.
  if (source === null) {
    if (current !== null) note('skipped', `bed:${trackId}`, 'no asset in beds.ts');
    release();
    return;
  }

  /*
   * Already ours. Only the volume can have changed — which is the whole point
   * of this path, and is what `setBedVolume` comes here to do.
   *
   * Checked on `current` alone rather than on `current && player`, because the
   * cold path below sets `current` before the player exists, and a second call
   * arriving in that window would otherwise start a second copy of the same
   * loop over the first.
   */
  if (current === trackId) {
    if (player) player.volume = volume;
    return;
  }

  // Claim the slot synchronously, so the guard above is true for any call that
  // lands while the session is still being configured.
  release();
  current = trackId;

  if (audioSessionReady()) {
    startBed(trackId, source, volume);
    return;
  }

  /*
   * Cold start, and this is the common case rather than an edge one: the menu
   * bed is the first audio the app asks for, so before this it was reliably
   * handed a session that had not been configured yet.
   */
  void primeAudio().then(() => {
    // A different screen may have taken the slot while we waited.
    if (current === trackId) startBed(trackId, source, volume);
  });
}

function startBed(trackId: string, source: number, volume: number): void {
  try {
    const next = createAudioPlayer(source, { keepAudioSessionActive: true });
    next.loop = true;
    next.volume = volume;
    next.play();
    player = next;
    note('played', `bed:${trackId}`, `volume ${volume.toFixed(3)}, looping`);
  } catch (e) {
    // A missing codec, a device with no audio route, a player released under us.
    // Background music is the last thing that should take a case down.
    note('failed', `bed:${trackId}`, describe(e));
    release();
  }
}

/**
 * Which rule silenced the bed.
 *
 * Beds have one gate cues do not — Reduce Motion kills them outright, where a
 * `signal` cue survives it — and that is the gate most likely to surprise
 * somebody who turned it on for the animations.
 */
function whyBedSilent(prefs: VolumePrefs): string {
  if (!prefs.soundEnabled) return 'sound is switched off in settings';
  if (prefs.reduceMotion) return 'reduceMotion silences beds outright';
  return `slider at ${prefs.soundVolume} resolves to zero amplitude`;
}

/** Drop the native player, keeping the answer to what ought to be playing. */
function release(): void {
  try {
    player?.remove();
  } catch {
    // Already gone.
  }
  player = null;
  current = null;
}

/**
 * Stop, release, and forget the track.
 *
 * The public stop, for leaving the app entirely. `release()` is the internal
 * one that a mute goes through, and the difference is `desired`: a mute has to
 * remember what to bring back.
 */
export function stopBed(): void {
  desired = null;
  release();
}
