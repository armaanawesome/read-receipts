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
 * Play `trackId` on a loop, or stop everything when it is null.
 *
 * Idempotent on the track: calling it repeatedly with the same id only updates
 * the volume. That matters because the screens driving this re-render for
 * reasons with nothing to do with audio, and a bed that restarted from the top
 * on every render would be a stutter rather than a soundtrack.
 */
export function playBed(trackId: string | null, prefs: VolumePrefs): void {
  const volume = resolveBedVolume(prefs);

  // Muted, silenced by Reduce Motion, or nowhere to play. Tear down rather than
  // leave a silent player holding the audio session open.
  if (trackId === null || volume <= 0) {
    if (trackId !== null) note('skipped', `bed:${trackId}`, whyBedSilent(prefs));
    stopBed();
    return;
  }

  const source = bedSource(trackId);
  // No bed generated for this case yet. Silence, not an error.
  if (source === null) {
    note('skipped', `bed:${trackId}`, 'no asset in beds.ts');
    stopBed();
    return;
  }

  /*
   * Already ours. Only the volume can have changed.
   *
   * Checked on `current` alone rather than on `current && player`, because the
   * cold path below sets `current` before the player exists — and a second
   * focus event arriving in that window would otherwise start a second copy of
   * the same loop over the top of the first.
   */
  if (current === trackId) {
    if (player) player.volume = volume;
    return;
  }

  // Claim the slot synchronously, so the guard above is true for any call that
  // lands while the session is still being configured.
  stopBed();
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
    stopBed();
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

/** Stop and release. Safe to call when nothing is playing. */
export function stopBed(): void {
  try {
    player?.remove();
  } catch {
    // Already gone.
  }
  player = null;
  current = null;
}
