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
     * ALWAYS rewind, then play. Never branch on `player.isLoaded`.
     *
     * This is the bug behind every "the text tone is not working" report, and
     * the reason three rounds of fixes to these lines never reached it. The old
     * guard was `if (player.isLoaded && player.currentTime > 0) rewind`.
     *
     * expo-audio's Android `isLoaded` property is `playbackState == STATE_READY`
     * (node_modules/expo-audio/android/.../AudioModule.kt). A cue that has
     * finished playing is in STATE_ENDED, not STATE_READY, so on every REPLAY
     * `isLoaded` read false, the rewind was skipped, and `play()` was handed a
     * player parked at the end of its clip. A finished ExoPlayer plays nothing.
     * Every cue therefore sounded exactly once per launch and was silent for the
     * rest of it. The status EVENT special-cases ENDED as loaded, which is why
     * it looked fine in logs; the property JS actually reads does not.
     *
     * Seeking to 0 is harmless on a fresh player -- it records the position --
     * and required on a finished one, so there is nothing to branch on at all.
     * The seek runs on the main queue and resolves once applied; `play()` then
     * follows on BOTH outcomes, so a rejected seek still makes a sound.
     *
     * `play` is wrapped because it runs in a later microtask, outside the
     * try/catch around this function. A throw there would otherwise be an
     * unhandled rejection that never reaches diagnostics.
     */
    const play = (): void => {
      try {
        player.play();
      } catch (e) {
        note('failed', `cue:${id}`, describe(e));
      }
    };
    player.seekTo(0).then(play, play);
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
