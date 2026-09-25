import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { CUES, type CueId } from './cues';
import { CUE_SOURCES } from './registry';
import { resolveVolume, type VolumePrefs } from './volume';
import { describe, note } from './diagnostics';

/**
 * The one place expo-audio is touched.
 *
 * Everything decidable was decided in volume.ts and tested there; what is left
 * here is lifecycle, which is not testable in Node and is kept as small as
 * possible for that reason.
 *
 * Three rules hold this together:
 *  - A cue with no asset is a silent no-op, not an error. That is what lets the
 *    game ship before the audio does.
 *  - A sound effect is never worth a crash. Every native call is guarded.
 *  - Every one of those guards reports to `diagnostics.ts`. Silent to the
 *    player, never silent to us — see that file for why this is not optional.
 */

/** One player per cue, created on first use and reused. */
const players: Partial<Record<CueId, AudioPlayer>> = {};

/**
 * The audio session, configured once.
 *
 * ## `playsInSilentMode: true`, and this is the line that silenced the game
 *
 * It was `false`, reasoned about as though it only meant the iOS mute switch:
 * someone playing on a train with the ringer off expects silence. On **Android
 * that flag does something much broader** — expo-audio's own type documentation
 * is explicit that when it is `false`, "playback is suppressed when the ringer
 * mode is silent or vibrate". Most people carry a phone on vibrate. So the whole
 * soundtrack was being suppressed at the session level, for most users, before a
 * single sample was read. No amount of retuning the files could reach that, and
 * two rounds of retuning did not.
 *
 * Ringer mode governs alerts, not media. A game belongs on the media stream, and
 * this app already gives the player a real way to silence it — a sound toggle
 * and a volume slider in Settings — which is a better control than a hardware
 * switch that was never asked about this app in particular.
 *
 * `mixWithOthers` stays: a 150ms sting must not stop the podcast somebody is
 * listening to.
 *
 * ## Why this is a promise and not a boolean
 *
 * It was a boolean, and it was set to `true` **synchronously, before
 * `setAudioModeAsync` had resolved**. `playCue` then called `play()` on the same
 * tick. So the first cue of a cold start — which on a fresh launch is every cue
 * the player is waiting to hear — was handed to an audio session that had not
 * been configured yet. Worse, a rejected configuration was never retried,
 * because the flag already said "primed": one transient failure at launch
 * silenced the process for its whole life.
 *
 * Now the promise is the memo. Callers can wait for it, a rejection clears it so
 * the next cue tries again, and `sessionReady` exists only to keep the warm path
 * synchronous.
 */
let session: Promise<void> | null = null;
let sessionReady = false;

export function primeAudio(): Promise<void> {
  session ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  }).then(
    () => {
      sessionReady = true;
      note('played', 'session', 'audio session configured');
    },
    (e: unknown) => {
      // Cleared so a later cue can try again rather than inheriting a dead
      // session for the life of the process.
      session = null;
      note('failed', 'session', describe(e));
    },
  );
  return session;
}

/** Whether the session is up. For the diagnostic screen; nothing else reads it. */
export function audioSessionReady(): boolean {
  return sessionReady;
}

/**
 * Plays a cue at the volume the player's settings resolve to.
 *
 * Takes prefs rather than reading the store, so the decision stays visible at
 * the call site and this module keeps its one-way dependency on volume.ts.
 */
export function playCue(id: CueId, prefs: VolumePrefs): void {
  const volume = resolveVolume(prefs, CUES[id]);
  // Muted, or a flourish under Reduce Motion. Nothing to create, nothing to
  // load — but say which, because "switched off" and "resolved to zero" are
  // the two states that used to look identical from a bug report.
  if (volume <= 0) {
    note('skipped', `cue:${id}`, whySilent(prefs, CUES[id].role));
    return;
  }

  const source = CUE_SOURCES[id];
  // No asset authored for this cue yet. Not a warning — this is the shipped state.
  if (source === null) {
    note('skipped', `cue:${id}`, 'no asset in registry.ts');
    return;
  }

  // Warm path: the session is up, so play on this tick exactly as before.
  if (sessionReady) {
    start(id, source, volume);
    return;
  }

  /*
   * Cold path: configure the session, THEN play. This is the one thing that has
   * to wait, and it waits for a promise that cannot reject — primeAudio()
   * handles its own rejection — so the old failure mode where a rejected
   * promise swallowed the sound cannot come back through this door.
   */
  void primeAudio().then(() => start(id, source, volume));
}

function start(id: CueId, source: number, volume: number): void {
  try {
    const player = (players[id] ??= createAudioPlayer(source, {
      // Without this the session deactivates when the sting ends, which
      // interrupts any video or audio the player had going.
      keepAudioSessionActive: true,
    }));
    player.volume = volume;
    /*
     * Rewind, THEN play — and play on both outcomes of the rewind.
     *
     * Two bugs have lived on these four lines, and the fix for each one caused
     * the other. Getting it right means refusing both, not picking a side.
     *
     * It was `seekTo(0).then(play).catch(() => {})`. That makes playback
     * conditional on a promise that can reject — seeking a player that has not
     * finished loading fails — and the empty catch swallowed the error AND the
     * sound.
     *
     * So it became a fire-and-forget seek with an unconditional synchronous
     * `play()` after it. That fixed the swallowing and broke the replay. One
     * player is created per cue and reused, so once a cue has finished its
     * `currentTime` sits at the END of the clip; calling `play()` there does
     * nothing at all on AVPlayer or ExoPlayer, and the abandoned seek only
     * landed in time for the tap AFTER the next one. The result was a text tone
     * that alternated — played, silent, played, silent — which is reported, three
     * times over, as "the text tone is not working".
     *
     * Waiting for the seek fixes the replay. Playing in BOTH branches keeps the
     * first fix: a rejected seek still gets its sound, it just gets it from
     * wherever the playhead happens to be, which is a far smaller defect than
     * silence. Nothing here can swallow a cue any more.
     */
    if (player.isLoaded && player.currentTime > 0) {
      player.seekTo(0).then(
        () => player.play(),
        () => player.play(),
      );
    } else {
      player.play();
    }
    note('played', `cue:${id}`, `volume ${volume.toFixed(3)}, loaded ${String(player.isLoaded)}`);
  } catch (e) {
    // A missing codec, a released player, a device with no audio route. None of
    // them are worth taking the case down for — but all of them are worth
    // knowing about, which is the difference between this catch and the one it
    // replaced.
    note('failed', `cue:${id}`, describe(e));
  }
}

/**
 * Which rule produced the silence, in words.
 *
 * Three settings can each independently zero a cue, and a player reporting "I
 * hear nothing" cannot tell you which. Neither could we, until this line.
 */
function whySilent(prefs: VolumePrefs, role: 'signal' | 'flourish'): string {
  if (!prefs.soundEnabled) return 'sound is switched off in settings';
  if (prefs.reduceMotion && role === 'flourish') {
    return 'reduceMotion silences flourish cues';
  }
  return `slider at ${prefs.soundVolume} resolves to zero amplitude`;
}

/** Frees the native players. For a settings screen unmount or a memory warning. */
export function releaseAudio(): void {
  for (const id of Object.keys(players) as CueId[]) {
    try {
      players[id]?.remove();
    } catch {
      // Already gone. Nothing to do.
    }
    delete players[id];
  }
}
