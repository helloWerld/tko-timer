/**
 * Cue engine. Everything runs through one AudioContext with two master gain
 * nodes — one for beeps, one for voice — so each has an independent, adjustable
 * volume.
 *
 * Beeps are synthesized oscillator tones. Spoken cues are mp3s decoded into Web
 * Audio buffers and played through the same graph (the beeps prove Web Audio
 * output works in the browser, so the voice rides the same reliable path). An
 * HTML <audio> fallback covers the brief window before the buffers finish
 * decoding (or if decoding fails).
 */

let ctx: AudioContext | null = null;
let beepGain: GainNode | null = null;
let voiceGain: GainNode | null = null;

// Volumes, 0..MAX_VOLUME. Beeps default loud (they were quieter than music
// players). Going above 1.0 amplifies via the gain node and may clip.
export const MAX_VOLUME = 1.25;

let beepVolume = 1;
let voiceVolume = 1;

const VOL_KEY = "pulsefit.volume.v1";

function clampVol(v: number) {
  return Math.max(0, Math.min(MAX_VOLUME, v));
}

function loadVolumes() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(VOL_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.beep === "number") beepVolume = clampVol(p.beep);
    if (typeof p.voice === "number") voiceVolume = clampVol(p.voice);
  } catch {
    /* ignore */
  }
}

function saveVolumes() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      VOL_KEY,
      JSON.stringify({ beep: beepVolume, voice: voiceVolume }),
    );
  } catch {
    /* ignore */
  }
}

loadVolumes();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Lazily build the gain graph; returns the context (or null on SSR / no API). */
function graph(): AudioContext | null {
  const c = getCtx();
  if (!c) return null;
  if (!beepGain) {
    beepGain = c.createGain();
    beepGain.gain.value = beepVolume;
    beepGain.connect(c.destination);
  }
  if (!voiceGain) {
    voiceGain = c.createGain();
    voiceGain.gain.value = voiceVolume;
    voiceGain.connect(c.destination);
  }
  return c;
}

/** Resume the audio context. Call from a click/tap handler. */
export async function unlockAudio(): Promise<void> {
  const c = graph();
  if (c && c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
}

/* --------------------------- Volume controls --------------------------- */

export function getVolumes(): { beep: number; voice: number } {
  return { beep: beepVolume, voice: voiceVolume };
}

export function setBeepVolume(v: number): void {
  beepVolume = clampVol(v);
  if (beepGain) beepGain.gain.value = beepVolume;
  saveVolumes();
}

export function setVoiceVolume(v: number): void {
  voiceVolume = clampVol(v);
  if (voiceGain) voiceGain.gain.value = voiceVolume;
  // HTMLMediaElement.volume only accepts 0..1 (the buffer path handles >1).
  const elVol = Math.min(1, voiceVolume);
  (Object.values(voiceEls) as HTMLAudioElement[]).forEach((el) => {
    if (el) el.volume = elVol;
  });
  saveVolumes();
}

/* ------------------------------- Beeps -------------------------------- */

function tone(
  freq: number,
  duration: number,
  gain = 0.5,
  type: OscillatorType = "sine",
) {
  const c = graph();
  if (!c || !beepGain) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  // Quick attack + smooth release so it doesn't click.
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(beepGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Soft mid tone at the halfway point of a work interval (beep mode). */
export function halfwayCue() {
  tone(660, 0.18, 0.55, "triangle");
}

/** Short tick for each of the final seconds (5,4,3,2,1). */
export function countdownCue() {
  tone(880, 0.12, 0.7, "square");
}

/** Rising "go" tone when a work interval begins. */
export function goCue() {
  tone(523, 0.1, 0.6);
  setTimeout(() => tone(784, 0.16, 0.65), 90);
}

/** Lower tone when entering a rest interval. */
export function restCue() {
  tone(392, 0.22, 0.45, "sine");
}

/** Soft, calm tone when moving to the next warmup/cooldown stretch. */
export function stretchCue() {
  tone(494, 0.2, 0.4, "sine");
}

/** Long sustained tone marking the rest→work transition (set start). */
export function longGoBeep() {
  tone(700, 0.45, 0.65, "sine");
}

/** Celebratory triad when the whole workout finishes. */
export function finishCue() {
  tone(523, 0.18, 0.55);
  setTimeout(() => tone(659, 0.18, 0.55), 160);
  setTimeout(() => tone(784, 0.35, 0.6), 320);
}

/** Play a sample beep (for the volume slider). Call from a tap. */
export function testBeep() {
  void unlockAudio();
  countdownCue();
}

/* ------------------------------- Voice -------------------------------- */

// Human-recorded voice clips.
//  getReady  — start of the Get Ready screen (prep)
//  prepGo    — last 3 seconds of the Get Ready screen ("3, 2, 1, go")
//  halfway   — midpoint of a work round
//  toWork    — work round ending straight into another work round (5s)
//  toRest    — work round ending into a rest period (5s)
//  restEnd   — rest period ending into the next work round (3s)
const VOICE_FILES = {
  getReady: "/getready.m4a",
  prepGo: "/321_go.m4a",
  halfway: "/halfwaythere.m4a",
  toWork: "/54321_nextround.m4a",
  toRest: "/54321_rest.m4a",
  restEnd: "/321_nextround.m4a",
} as const;

type VoiceKey = keyof typeof VOICE_FILES;

const voiceBuffers: Partial<Record<VoiceKey, AudioBuffer>> = {};
let voiceLoadStarted = false;

async function loadVoiceBuffers(): Promise<void> {
  const c = graph();
  if (!c || voiceLoadStarted) return;
  voiceLoadStarted = true;
  await Promise.all(
    (Object.keys(VOICE_FILES) as VoiceKey[]).map(async (key) => {
      try {
        const res = await fetch(VOICE_FILES[key]);
        const data = await res.arrayBuffer();
        voiceBuffers[key] = await c.decodeAudioData(data);
      } catch {
        /* fall back to the <audio> element for this clip */
      }
    }),
  );
}

/** Start decoding the clips early (e.g. on the builder) so they're ready. */
export function preloadVoice(): void {
  void loadVoiceBuffers();
}

// HTML <audio> fallback, used until the buffer is ready (or if decode fails).
const voiceEls: Partial<Record<VoiceKey, HTMLAudioElement>> = {};

function getVoiceEl(key: VoiceKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!voiceEls[key]) {
    const el = new Audio(VOICE_FILES[key]);
    el.preload = "auto";
    el.volume = Math.min(1, voiceVolume);
    voiceEls[key] = el;
  }
  return voiceEls[key]!;
}

/** Resume audio, load buffers, and prime the fallback elements (within a tap). */
export function unlockVoice(): void {
  void unlockAudio();
  void loadVoiceBuffers();
  (Object.keys(VOICE_FILES) as VoiceKey[]).forEach((key) => {
    const el = getVoiceEl(key);
    if (!el) return;
    el.muted = true;
    el
      .play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  });
}

// Guard against the same clip firing twice in quick succession (e.g. React
// StrictMode double-invoking an effect in dev). Voice cues are always seconds
// apart, so a short window is safe.
const lastVoiceAt: Partial<Record<VoiceKey, number>> = {};

function playVoice(key: VoiceKey) {
  const now = Date.now();
  if (lastVoiceAt[key] && now - lastVoiceAt[key]! < 250) return;
  lastVoiceAt[key] = now;

  const c = graph();
  const buffer = voiceBuffers[key];
  // Preferred path: decoded buffer through the voice gain node.
  if (c && voiceGain && buffer) {
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(voiceGain);
    src.start();
    return;
  }
  // Fallback: HTML <audio> element (volume capped at 1.0).
  const el = getVoiceEl(key);
  if (!el) return;
  try {
    el.volume = Math.min(1, voiceVolume);
    el.currentTime = 0;
    void el.play();
  } catch {
    /* ignore */
  }
}

/** "Get ready" — played at the start of the prep / Get Ready screen. */
export function getReadyVoice() {
  playVoice("getReady");
}

/** "3, 2, 1, go" — played in the last 3 seconds of the Get Ready screen. */
export function prepGoVoice() {
  playVoice("prepGo");
}

/** "Halfway there" — played at the midpoint of a work set. */
export function halfwayVoice() {
  playVoice("halfway");
}

/** Work-set 5s countdown when the next round is more work (no rest). */
export function countdownToWorkVoice() {
  playVoice("toWork");
}

/** Work-set 5s countdown when a rest period comes next. */
export function countdownToRestVoice() {
  playVoice("toRest");
}

/** Rest-period 3s countdown into the next work round. */
export function restEndVoice() {
  playVoice("restEnd");
}

/** Play a spoken clip immediately (for testing / the volume slider). */
export function testVoice() {
  void unlockAudio();
  void loadVoiceBuffers();
  playVoice("halfway");
}
