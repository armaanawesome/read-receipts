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
/** Eight seconds. A drone is near-stationary, so a short loop is not a short cue. */
const LOOP = 8;

/**
 * An ambient bed, seeded by name.
 *
 * Not a composition, and it should not pretend to be one: two detuned low
 * oscillators, a fifth above them, and a slow noise swell. What varies per case
 * is the root note and the rate of that swell, which is enough for two cases to
 * feel like different rooms without any of them having a tune to get sick of.
 *
 * The last half second crossfades into the first, so the loop has no seam. A
 * drone that clicks once every eight seconds is worse than no drone at all.
 */
function bed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;

  /*
   * Roots from a minor scale — an octave and a half ABOVE where this started.
   *
   * The first version used 55–78Hz because that is where a room tone lives on
   * studio monitors. On the device it was silence, and measurably so: a phone
   * speaker is a few millimetres across and rolls off hard below roughly 300Hz,
   * so every one of the seventeen beds was being asked to move air at a
   * frequency the hardware cannot. Nobody heard any of it.
   *
   * These sit at 165–233Hz and carry an explicit octave partial on top, so the
   * loudest energy in the file lands at 330–466Hz where a phone speaker actually
   * works. The perceived pitch stays low enough to read as a room, not a tune.
   */
  const ROOTS = [164.81, 174.61, 185.0, 196.0, 220.0, 233.08];
  const root = ROOTS[h % ROOTS.length];
  const swell = 0.05 + ((h >> 3) % 7) * 0.011;

  const buf = buffer(LOOP, MUSIC_RATE);
  const n = buf.length;

  for (let i = 0; i < n; i += 1) {
    const t = i / MUSIC_RATE;
    // Two oscillators a few cents apart beat slowly against each other, which is
    // what stops a sustained tone sounding like a dial tone.
    const a = Math.sin(2 * Math.PI * root * t);
    const b = Math.sin(2 * Math.PI * root * 1.004 * t);
    const fifth = Math.sin(2 * Math.PI * root * 1.5 * t) * 0.42;
    /*
     * The partials above the root are what survive a small speaker, so they
     * carry most of the weight and the root itself is only the thing that gives
     * them a pitch. Measured rather than guessed: with the root dominant, 57% of
     * each bed's energy sat below 300Hz and was simply discarded by the
     * hardware. This split puts the majority above it.
     */
    const octave = Math.sin(2 * Math.PI * root * 2 * t) * 0.46;
    const twelfth = Math.sin(2 * Math.PI * root * 3 * t) * 0.2;
    const breath = Math.sin(2 * Math.PI * swell * t) * 0.5 + 0.5;
    buf[i] =
      (a + b) * 0.16 +
      fifth * (0.35 + 0.4 * breath) +
      octave * (0.5 + 0.5 * breath) +
      twelfth * (0.3 + 0.5 * breath);
  }

  // A slow filtered-noise layer, so it reads as a room rather than as a synth.
  let last = 0;
  for (let i = 0; i < n; i += 1) {
    last += 0.0016 * (Math.random() * 2 - 1 - last);
    const breath = Math.sin((2 * Math.PI * swell * i) / MUSIC_RATE) * 0.5 + 0.5;
    buf[i] += last * 9 * (0.3 + 0.7 * breath);
  }

  // Seamless: crossfade the tail over the head, then drop the tail.
  const fade = Math.floor(0.5 * MUSIC_RATE);
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    buf[i] = buf[i] * k + buf[n - fade + i] * (1 - k);
  }
  /*
   * 0.85, not 0.5. A bed is attenuated again at runtime by BED_GAIN in
   * volume.ts, so half-scale here compounded into roughly -36dBFS on the
   * device — under the noise floor of the room most people play in.
   */
  return normalise(buf.subarray(0, n - fade), 0.85);
}

/* ------------------------------------------------------------------ main -- */

mkdirSync(OUT, { recursive: true });

const CUES = { message, pin, contradiction, confession, accusation, refused, caseClosed, tap };
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
  const bytes = writeWav(`bed-${name}.wav`, bed(name), MUSIC_RATE);
  total += bytes;
  console.log(`bed   ${name.padEnd(16)} ${(bytes / 1024).toFixed(0)}KB`);
}

console.log(
  `\ntotal ${(total / 1024 / 1024).toFixed(1)}MB across ${Object.keys(CUES).length + TRACKS.length} files`,
);
