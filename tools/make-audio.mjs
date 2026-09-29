/**
 * Synthesises every sound the game makes, straight to WAV.
 *
 * ## Why synthesis rather than sourcing audio
 *
 * This is a competition entry, so every asset in it has to be clearly licensed.
 * Sound generated here has no third-party rights attached at all, which is a
 * stronger position than "the licence page said CC0 in September". It is also
 * reproducible: the cues are a function of this file, so changing the text tone
 * is an edit and a re-run rather than a hunt through a sample pack.
 *
 * ## Why WAV
 *
 * There is no ffmpeg on this machine, and writing an AAC encoder is not a
 * reasonable thing to do for five sound effects. WAV is uncompressed, which is
 * why everything here is mono and why the sample rates are the lowest that still
 * carry the content: cues at 22.05kHz because their brightness lives under 8kHz,
 * and music beds at 16kHz because a drone has almost no energy above 4kHz at
 * all. Both decode natively on iOS and Android with no extra work.
 *
 * Run: node tools/make-audio.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'assets/audio';

/* ------------------------------------------------------------------ core -- */

/** A mono buffer of float samples in -1..1. */
const buffer = (seconds, rate) => new Float32Array(Math.ceil(seconds * rate));

/**
 * Exponential decay, which is what physical things actually do.
 *
 * A linear fade sounds synthetic on a percussive cue because nothing in the
 * world loses energy at a constant rate — a struck object dumps most of it
 * immediately and trails off. `curve` is how sharp that is: 12 reads as a click,
 * 3 as a struck bell.
 */
const decay = (t, length, curve = 8) => Math.exp((-curve * t) / length);

/** Fade in over `attack` seconds, so a tone never starts with a click. */
const attackAt = (t, attack) => (t < attack ? t / attack : 1);

function addTone(buf, rate, { freq, start, length, gain, curve = 8, attack = 0.004, harmonic = 0 }) {
  const from = Math.floor(start * rate);
  const count = Math.floor(length * rate);
  for (let i = 0; i < count; i += 1) {
    const at = from + i;
    if (at >= buf.length) break;
    const t = i / rate;
    const phase = 2 * Math.PI * freq * t;
    // A touch of second harmonic keeps a pure sine from sounding like a test
    // signal, without turning the cue into an instrument.
    const wave = Math.sin(phase) + harmonic * Math.sin(2 * phase);
    buf[at] += wave * gain * decay(t, length, curve) * attackAt(t, attack);
  }
}

/**
 * Filtered noise: the body of anything struck, snapped, or latched.
 *
 * A one-pole low-pass over white noise, because the difference between a wooden
 * knock and a snare drum is mostly where the noise stops. `cutoff` is in Hz.
 */
function addNoise(buf, rate, { start, length, gain, cutoff, curve = 14 }) {
  const from = Math.floor(start * rate);
  const count = Math.floor(length * rate);
  const alpha = Math.min(1, (2 * Math.PI * cutoff) / rate);
  let last = 0;
  for (let i = 0; i < count; i += 1) {
    const at = from + i;
    if (at >= buf.length) break;
    last += alpha * (Math.random() * 2 - 1 - last);
    buf[at] += last * gain * decay(i / rate, length, curve);
  }
}

/**
 * Normalise to a target peak, then hard-guard.
 *
 * Cues are mixed against each other by the gains in `cues.ts` at runtime, so
 * what matters here is that no file clips and that they all arrive at a
 * consistent loudness for those gains to act on.
 */
function normalise(buf, peak = 0.89) {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max === 0) return buf;
  const scale = peak / max;
  for (let i = 0; i < buf.length; i += 1) buf[i] = Math.max(-1, Math.min(1, buf[i] * scale));
  return buf;
}

/** 16-bit PCM mono WAV. */
function writeWav(name, buf, rate) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  const out = Buffer.concat([header, data]);
  writeFileSync(join(OUT, name), out);
  return out.length;
}

/* ------------------------------------------------------------------ cues -- */

const CUE_RATE = 22050;

/** A text arriving. Two soft blips a fourth apart — the shape every phone uses. */
function message() {
  const buf = buffer(0.34, CUE_RATE);
  addTone(buf, CUE_RATE, { freq: 880, start: 0, length: 0.1, gain: 0.5, curve: 9, harmonic: 0.12 });
  addTone(buf, CUE_RATE, {
    freq: 1174.7,
    start: 0.085,
    length: 0.2,
    gain: 0.55,
    curve: 7,
    harmonic: 0.1,
  });
  return buf;
}

/** A claim going on the record. One tick, felt more than heard. */
function pin() {
  const buf = buffer(0.14, CUE_RATE);
  addNoise(buf, CUE_RATE, { start: 0, length: 0.03, gain: 0.5, cutoff: 6000, curve: 26 });
  addTone(buf, CUE_RATE, {
    freq: 2093,
    start: 0,
    length: 0.07,
    gain: 0.3,
    curve: 20,
    attack: 0.001,
  });
  return buf;
}

/**
 * Two statements that cannot both be true — the game's one real reward.
 *
 * Built as a latch rather than a chime: a mechanical clunk, then a rising figure
 * that resolves upward. The clunk is what makes it read as "something opened"
 * instead of "you scored points", which suits a game about proving a thing
 * rather than collecting one.
 */
function contradiction() {
  const buf = buffer(0.75, CUE_RATE);
  addNoise(buf, CUE_RATE, { start: 0, length: 0.05, gain: 0.55, cutoff: 2600, curve: 22 });
  addTone(buf, CUE_RATE, { freq: 146.8, start: 0, length: 0.16, gain: 0.5, curve: 13 });
  addTone(buf, CUE_RATE, {
    freq: 587.3,
    start: 0.07,
    length: 0.3,
    gain: 0.42,
    curve: 6,
    harmonic: 0.18,
  });
  addTone(buf, CUE_RATE, {
    freq: 880,
    start: 0.2,
    length: 0.5,
    gain: 0.46,
    curve: 4,
    harmonic: 0.14,
  });
  return buf;
}

/**
 * She stops arguing. Slow, and the only cue allowed to take its time.
 *
 * "Low" is what this used to be, and low is what made it inaudible: its
 * strongest partial measured 159Hz, under the point where a handset speaker
 * starts working. Same interval, same pacing, moved up an octave.
 */
function confession() {
  const buf = buffer(1.5, CUE_RATE);
  addTone(buf, CUE_RATE, { freq: 440, start: 0, length: 1.3, gain: 0.5, curve: 3, attack: 0.02 });
  addTone(buf, CUE_RATE, {
    freq: 349.2,
    start: 0.18,
    length: 1.2,
    gain: 0.42,
    curve: 3,
    attack: 0.03,
  });
  addTone(buf, CUE_RATE, { freq: 261.6, start: 0, length: 1.4, gain: 0.34, curve: 2.4, attack: 0.02 });
  return buf;
}

/**
 * Naming somebody. A gavel: two knocks, wood not metal.
 *
 * Handcuffs and a cell door were the other two options in the brief. Both are
 * literal about a consequence this game never shows — nobody is arrested on
 * screen, the case simply closes — whereas a gavel is the sound of a judgement
 * being recorded, which is exactly what the accusation screen does.
 */
function accusation() {
  /*
   * The knock was pitched at 92Hz, which on a phone is a knock you cannot hear —
   * its measured dominant was 42Hz. A real gavel on a bench is mostly midrange
   * anyway: the body of the block, not the room it sits in. Moved up, with the
   * noise transient carrying more of the strike.
   */
  const buf = buffer(0.6, CUE_RATE);
  for (const start of [0, 0.13]) {
    addNoise(buf, CUE_RATE, { start, length: 0.05, gain: 0.75, cutoff: 3400, curve: 30 });
    addTone(buf, CUE_RATE, { freq: 262, start, length: 0.13, gain: 0.55, curve: 16, attack: 0.001 });
    addTone(buf, CUE_RATE, { freq: 524, start, length: 0.07, gain: 0.42, curve: 22, attack: 0.001 });
  }
  return buf;
}

/**
 * A pairing that does not contradict, and a killer who has an answer for you.
 *
 * The counterpart to `contradiction()`, and deliberately not a buzzer. The
 * engine's refusal is a LESSON — it says the two claims are about different
 * people, or different times — so this is a soft falling minor third that reads
 * as "no, but keep going" rather than as a penalty. A game that scolds you for
 * testing a hypothesis stops people testing hypotheses.
 *
 * Pitched at E5/C5 for the same reason everything else moved up: 300Hz is about
 * where a handset speaker starts working at all.
 */
function refused() {
  const buf = buffer(0.4, CUE_RATE);
  addTone(buf, CUE_RATE, {
    freq: 659.3,
    start: 0,
    length: 0.16,
    gain: 0.4,
    curve: 11,
    harmonic: 0.1,
  });
  addTone(buf, CUE_RATE, {
    freq: 523.3,
    start: 0.1,
    length: 0.3,
    gain: 0.44,
    curve: 7,
    harmonic: 0.08,
  });
  return buf;
}

/**
 * The file closing. Arrives after the epilogue, once the case is actually over.
 *
 * Quieter and slower than `confession()` on purpose: the confession is the
 * climax and this is the door shutting behind it. A triumphant sting here would
 * step on the moment the player just earned.
 */
function caseClosed() {
  const buf = buffer(1.4, CUE_RATE);
  // The thud of a cover coming down, carried by the transient rather than a
  // fundamental the speaker cannot move.
  addNoise(buf, CUE_RATE, { start: 0, length: 0.07, gain: 0.4, cutoff: 2000, curve: 20 });
  addTone(buf, CUE_RATE, { freq: 392, start: 0.02, length: 1.1, gain: 0.44, curve: 3, attack: 0.02 });
  addTone(buf, CUE_RATE, {
    freq: 493.9,
    start: 0.12,
    length: 1.0,
    gain: 0.36,
    curve: 3,
    attack: 0.03,
  });
  addTone(buf, CUE_RATE, {
    freq: 587.3,
    start: 0.22,
    length: 0.95,
    gain: 0.3,
    curve: 2.6,
    attack: 0.03,
  });
  return buf;
}

/**
 * A message that puts something on the record.
 *
 * The bright sibling of `message()`. These are the bubbles the chat already
 * draws differently — bold, white, with an accent edge — because they carry a
 * claim the player can pin, and they are the only messages in the game that are
 * worth stopping on. They sounded identical to small talk.
 *
 * An ASCENDING major figure against the falling fourth of the ordinary tone, so
 * the two are told apart by shape rather than by pitch alone — which is what
 * still works for somebody listening at low volume on a phone speaker.
 *
 * Deliberately above the ordinary tone and well clear of the bed: C6/E6/G6 sits
 * where nothing else in the mix lives.
 */
function messageClaim() {
  const buf = buffer(0.55, CUE_RATE);
  const notes = [
    { f: 1046.5, t: 0 },
    { f: 1318.5, t: 0.075 },
    { f: 1568.0, t: 0.15 },
  ];
  for (const { f, t } of notes) {
    addTone(buf, CUE_RATE, {
      freq: f,
      start: t,
      length: 0.34,
      gain: 0.42,
      curve: 7,
      harmonic: 0.14,
      attack: 0.003,
    });
  }
  // A touch of air on the strike, so it reads as a bell rather than a beep.
  addNoise(buf, CUE_RATE, { start: 0, length: 0.02, gain: 0.16, cutoff: 9000, curve: 34 });
  /*
   * 2ms fade-in over the whole buffer. The tones already have an attack, but
   * the noise burst at start 0 does not, so the file began on a sample of
   * about -9200 out of 32767. Playback starts from silence, so that jump was a
   * pop on the front of every clue tone -- the one sound that most needs to
   * be clean.
   */
  const fadeIn = Math.floor(0.002 * CUE_RATE);
  for (let i = 0; i < fadeIn; i += 1) buf[i] *= i / fadeIn;
  return buf;
}

/**
 * A button doing what buttons do. The lightest thing in the set.
 *
 * `flourish`, so Reduce Motion silences it — this is the one cue that carries no
 * information whatever, and it is also the one that fires most often. Kept very
 * short and very quiet for the reason cues.ts argues at length: a deduction game
 * played with the phone face up must not sound like keyboard clatter.
 */
function tap() {
  const buf = buffer(0.07, CUE_RATE);
  addNoise(buf, CUE_RATE, { start: 0, length: 0.016, gain: 0.34, cutoff: 7200, curve: 40 });
  addTone(buf, CUE_RATE, {
    freq: 1568,
    start: 0,
    length: 0.04,
    gain: 0.2,
    curve: 30,
    attack: 0.001,
  });
  return buf;
}

/* ----------------------------------------------------------------- music -- */

const MUSIC_RATE = 16000;

/**
 * The music inside a case: composed, in the lobby's language, never its tune.
 *
 * ## Why this replaced the drone
 *
 * Every case used to get `bed()`: two detuned oscillators, a stack of partials
 * and a hiss layer, 8 seconds, then the last half second crossfaded over the
 * first and TRIMMED off -- the exact finish that made the lobby stumble. On a
 * handset it read as "the same old static noise": nothing moved but the hiss,
 * and it came round every 7.5 seconds.
 *
 * So it is built the way `menuBed()` is, because the player accepted that one:
 *
 *  - A minor pad in the case's own key, but it MOVES -- i, swelling across to
 *    VI and back once per loop on a cosine, so the harmony is always on its way
 *    somewhere. The lobby holds one chord; a case breathes between two.
 *  - One soft pulse every two seconds. Slower than the lobby's 1.2s heartbeat
 *    and single rather than double: a clock, not a pulse rate. The player is
 *    reading here, so it keeps time without asking for attention.
 *  - A three-note figure every eight seconds, rising over the first chord and
 *    falling over the second, from one of three shapes picked by the case id.
 *    The lobby's figure only falls.
 *
 * Sixteen seconds: 8 pulses, 2 figures, one chord cycle, all exact. Every
 * oscillator completes a whole number of cycles, every swell is periodic in the
 * loop, no note's tail reaches the seam, and nothing is trimmed -- only the air
 * is crossfaded, inside its own buffer. `deviceReports.test.ts` checks the
 * length and the seam of every file.
 *
 * Everything stays under 880Hz, where both message cues live -- see the note on
 * the lobby below about a bed masking a cue.
 */
const CASE_LOOP = 16;

function caseBed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;

  const rate = MUSIC_RATE;
  const buf = buffer(CASE_LOOP, rate);
  const n = buf.length;
  const whole = (f) => Math.round(f * CASE_LOOP) / CASE_LOOP;

  // The case's key. Same six roots the drones used, so each case keeps its room.
  const ROOTS = [164.81, 174.61, 185.0, 196.0, 220.0, 233.08];
  const r = ROOTS[h % ROOTS.length];

  // Minor-key ratios: 1, flat third, fifth, flat sixth, flat seventh below.
  const M3 = 1.1892;
  const P5 = 1.4983;
  const M6 = 1.5874;
  const DOWN7 = 0.8909;

  const voice = (f, g) => ({ f: whole(f), fd: whole(f * 1.003), g });
  const I = [voice(r, 0.2), voice(r * M3, 0.14), voice(r * P5, 0.12), voice(r * 2, 0.06)];
  const VI = [voice(r * 0.7937, 0.18), voice(r, 0.14), voice(r * M3, 0.12), voice(r * M6, 0.06)];

  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    // i at the top of the loop, VI at the middle, back to i -- once per loop.
    const toVI = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / CASE_LOOP);
    // Two breaths per loop, so it swells on each chord.
    const breath = 0.5 - 0.5 * Math.cos((4 * Math.PI * t) / CASE_LOOP);
    let v = 0;
    for (const [chord, w] of [
      [I, 1 - toVI],
      [VI, toVI],
    ]) {
      for (const { f, fd, g } of chord) {
        v += (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * fd * t) * 0.6) * g * w;
      }
    }
    buf[i] = v * (0.6 + 0.4 * breath) * 0.5;
  }

  // The clock: one soft pulse every two seconds, on the root. The last tail ends
  // at 14.4s.
  const PULSE = 2;
  for (let k = 0; k < CASE_LOOP / PULSE; k += 1) {
    addTone(buf, rate, {
      freq: whole(r),
      start: k * PULSE,
      length: 0.4,
      gain: 0.3,
      curve: 9,
      attack: 0.008,
      harmonic: 0.5,
    });
  }

  /*
   * The figure, rising over i and falling over VI, an octave up. Three shapes,
   * chosen by the case id so neighbouring cases do not share one. The highest
   * note anywhere is 2 * 233 * 1.587 = 740Hz, under the cues.
   */
  const SHAPES = [
    [
      [1, M3, P5],
      [M6, P5, M3],
    ],
    [
      [P5, M6, P5],
      [M3, 1, DOWN7],
    ],
    [
      [M3, 1, P5],
      [M6, M3, 1],
    ],
  ];
  const shape = SHAPES[(h >>> 4) % SHAPES.length];
  shape.forEach((notes, phrase) => {
    notes.forEach((ratio, k) => {
      addTone(buf, rate, {
        freq: r * 2 * ratio,
        start: phrase * 8 + 1 + k * 0.6,
        // Decays to about 1% before it is cut, so no note ends on a click.
        length: 2.4,
        gain: 0.14,
        curve: 4.5,
        attack: 0.03,
        harmonic: 0.12,
      });
    });
  });

  // Air, quieter than the lobby's, crossfaded within its own buffer so the file
  // stays exactly one loop long.
  const fade = Math.floor(0.5 * rate);
  const air = new Float32Array(n + fade);
  let last = 0;
  for (let i = 0; i < air.length; i += 1) {
    last += 0.22 * (Math.random() * 2 - 1 - last);
    air[i] = last * 0.02;
  }
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    air[i] = air[i] * k + air[n + i] * (1 - k);
  }
  for (let i = 0; i < n; i += 1) buf[i] += air[i];

  return normalise(buf, 0.85);
}

/**
 * The lobby, and the only track in the game that is composed rather than seeded.
 *
 * ## Why the menu gets its own generator
 *
 * The case screens once got a drone, whose job was to be forgotten while
 * somebody reads a murder out of a phone -- see `caseBed()` for why that went.
 * A drone was always wrong for the one screen the player is NOT reading on. The home screen is
 * where they choose, and a drone there is just a hum — the note back was that it
 * sounded bad, and that it should be ominous without being unpleasant, and
 * engaging.
 *
 * So this has what a drone deliberately lacks: a pulse, and a figure that
 * arrives and goes away again.
 *
 *  - A slow heartbeat, every 1.2s. Momentum with no melody attached, and the
 *    single most ominous rhythm there is because everybody already has one.
 *  - A minor triad pad underneath, breathing.
 *  - A falling three-note figure every four bars — A, G, E. Minor, unresolved,
 *    and sparse enough that it never becomes a tune to get sick of.
 *
 * TWENTY-FOUR seconds, and the number is load-bearing. It is the shortest
 * length both rhythms divide exactly: 20 heartbeats at 1.2s, 6 figures at 4s.
 * It was 16, which neither divides -- 16 / 1.2 is 13.33 beats -- so the loop
 * could never have been rhythmically seamless. Worse, it was then finished
 * with the crossfade-and-trim the old drones used: blend the last 0.6s into the
 * first 0.6s and cut it off. Right for a drone, which has no rhythm to break.
 * Wrong here. It shortened the file to 15.4s, and the blend that joined the
 * ends FADED THE REAL DOWNBEAT OUT -- measured at half the strength of every
 * other beat -- while pulling the 15.6s beat forward into the first 0.6s. So
 * the loop came round early and opened on a weak, displaced beat: the rhythm
 * stumbled every 15.4 seconds. The first device report called that 'plays for
 * a bit then abruptly plays again', which is exactly it.
 *
 * So nothing is trimmed any more. The pad's partials are rounded to a whole
 * number of cycles per loop and it breathes once per loop, so it joins itself
 * exactly; no heartbeat or figure tail crosses the seam; and only the noise,
 * which has no phase to preserve, is crossfaded -- inside its own buffer, so
 * the file stays exactly MENU_LOOP long.
 *
 * Everything sits between 110 and 700Hz ON PURPOSE. Both message cues live from
 * 880Hz up, and the last round of this proved that a bed occupying a cue's band
 * masks it into a bug report — see the note on `message` in cues.ts.
 */
const MENU_LOOP = 24;

function menuBed() {
  const rate = MUSIC_RATE;
  const buf = buffer(MENU_LOOP, rate);
  const n = buf.length;

  /*
   * A frequency nudged to complete a whole number of cycles in one loop, so the
   * sample after the last one is the first one. The largest shift below is under
   * 0.03Hz, which nobody can hear; a phase jump every 24s, everybody can.
   */
  const whole = (f) => Math.round(f * MENU_LOOP) / MENU_LOOP;

  // A minor: the pad. Low, quiet, and slowly breathing.
  const PAD = [
    { f: 220.0, g: 0.2 },
    { f: 261.63, g: 0.15 },
    { f: 329.63, g: 0.12 },
    { f: 440.0, g: 0.07 },
  ].map(({ f, g }) => ({ f: whole(f), fd: whole(f * 1.003), g }));

  // One breath per loop, so the swell ends exactly where it began.
  const BREATH = 1 / MENU_LOOP;

  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    const breath = Math.sin(2 * Math.PI * BREATH * t) * 0.5 + 0.5;
    let v = 0;
    for (const { f, fd, g } of PAD) {
      // A few cents of detune per partial keeps the pad from sounding like a
      // held organ chord. Both partials are whole-cycle, so the beating between
      // them also repeats exactly on the loop.
      v += Math.sin(2 * Math.PI * f * t) * g;
      v += Math.sin(2 * Math.PI * fd * t) * g * 0.6;
    }
    buf[i] = v * (0.55 + 0.45 * breath) * 0.5;
  }

  // The heartbeat. Two thumps a fifth of a second apart, then a long wait.
  // 20 beats in 24s; the last tail ends at 23.22s, so none crosses the seam.
  const BEATS = Math.round(MENU_LOOP / 1.2);
  for (let beat = 0; beat < BEATS; beat += 1) {
    const at = beat * 1.2;
    for (const [off, gain] of [
      [0, 0.5],
      [0.2, 0.32],
    ]) {
      addTone(buf, rate, {
        freq: 110,
        start: at + off,
        length: 0.22,
        gain,
        curve: 16,
        attack: 0.004,
        harmonic: 0.5,
      });
      addNoise(buf, rate, {
        start: at + off,
        length: 0.035,
        gain: gain * 0.28,
        cutoff: 1400,
        curve: 26,
      });
    }
  }

  // The figure: A - G - E, falling, once every four seconds. 6 in 24s; the last
  // one's tail ends at 22.74s.
  const FIGURE = [440.0, 392.0, 329.63];
  const PHRASES = Math.round(MENU_LOOP / 4);
  for (let phrase = 0; phrase < PHRASES; phrase += 1) {
    FIGURE.forEach((f, k) => {
      addTone(buf, rate, {
        freq: f,
        start: phrase * 4 + 0.4 + k * 0.42,
        length: 1.5,
        gain: 0.2,
        curve: 3.2,
        attack: 0.02,
        harmonic: 0.22,
      });
    });
  }

  /*
   * Air, at the same corner the case beds use -- and the only layer that is
   * crossfaded. Noise has no phase to keep, so it is generated a little LONGER
   * than the loop, its overhang is blended into its own start, and exactly one
   * loop's worth is kept. The file does not get shorter, which is the mistake
   * the old version made.
   */
  const fade = Math.floor(0.5 * rate);
  const air = new Float32Array(n + fade);
  let last = 0;
  for (let i = 0; i < air.length; i += 1) {
    last += 0.22 * (Math.random() * 2 - 1 - last);
    air[i] = last * 0.045;
  }
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    air[i] = air[i] * k + air[n + i] * (1 - k);
  }
  for (let i = 0; i < n; i += 1) buf[i] += air[i];

  return normalise(buf, 0.85);
}

/* ------------------------------------------------------------------ main -- */

mkdirSync(OUT, { recursive: true });

const CUES = {
  message,
  messageClaim,
  pin,
  contradiction,
  confession,
  accusation,
  refused,
  caseClosed,
  tap,
};
let total = 0;
for (const [name, make] of Object.entries(CUES)) {
  const bytes = writeWav(`${name}.wav`, normalise(make()), CUE_RATE);
  total += bytes;
  console.log(`cue   ${name.padEnd(16)} ${(bytes / 1024).toFixed(0)}KB`);
}

const TRACKS = [
  'menu',
  'tutorial',
  'the-lighthouse',
  'the-understudy',
  'the-night-round',
  'the-wake',
  'the-listener',
  'deep-field',
  'the-long-course',
  'the-bothy',
  'sunday-service',
  'the-cut',
  'open-mic',
  'the-allotments',
  'the-helpline',
  'the-reunion',
  'the-night-ferry',
];
for (const name of TRACKS) {
  // The lobby is composed rather than seeded — see the note on menuBed().
  const samples = name === 'menu' ? menuBed() : caseBed(name);
  const bytes = writeWav(`bed-${name}.wav`, samples, MUSIC_RATE);
  total += bytes;
  console.log(`bed   ${name.padEnd(16)} ${(bytes / 1024).toFixed(0)}KB`);
}

console.log(
  `\ntotal ${(total / 1024 / 1024).toFixed(1)}MB across ${Object.keys(CUES).length + TRACKS.length} files`,
);
