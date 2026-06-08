/**
 * Cue engine. Beeps are synthesized Web Audio oscillator tones; the spoken
 * cues are mp3s played through HTML <audio> elements (the reliable path).
 *
 * NOTE: we intentionally do NOT call `navigator.audioSession` here. Setting it
 * to "ambient" (to mix with background music) silenced the spoken cues on some
 * browsers while the beeps kept playing — so the music-mixing attempt is on hold
 * in favor of cues that reliably play. See git history if revisiting.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Resume the audio context. Call from a click/tap handler. */
export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c && c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
}

function tone(freq: number, duration: number, gain = 0.18, type: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  // Quick attack + smooth release so it doesn't click.
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Soft mid tone at the halfway point of a work interval. */
export function halfwayCue() {
  tone(660, 0.18, 0.16, "triangle");
}

/** Short tick for each of the final seconds (5,4,3,2,1). */
export function countdownCue() {
  tone(880, 0.12, 0.2, "square");
}

/** Rising "go" tone when a work interval begins. */
export function goCue() {
  tone(523, 0.1, 0.18);
  setTimeout(() => tone(784, 0.16, 0.2), 90);
}

/** Lower tone when entering a rest interval. */
export function restCue() {
  tone(392, 0.22, 0.14, "sine");
}

/** Soft, calm tone when moving to the next warmup/cooldown stretch. */
export function stretchCue() {
  tone(494, 0.2, 0.11, "sine");
}

/** Long sustained tone marking the rest→work transition (set start). */
export function longGoBeep() {
  tone(700, 0.45, 0.2, "sine");
}

/* ----------------------------- Voice cues ------------------------------ */

// Only the clips we actually play are preloaded. The 30/20/15-seconds-left
// files also exist in /public if you want to wire them up later.
const VOICE_FILES = {
  halfway: "/halfwaythere.mp3",
  countdown: "/54321.mp3",
} as const;

type VoiceKey = keyof typeof VOICE_FILES;

// The spoken clips play through HTML <audio> elements — the reliable path. We
// still set the Audio Session to "ambient" (see configureAudioSession) so the
// browser tries to mix them with other apps' audio where that API is supported.
const voiceEls: Partial<Record<VoiceKey, HTMLAudioElement>> = {};

function getVoiceEl(key: VoiceKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!voiceEls[key]) {
    const el = new Audio(VOICE_FILES[key]);
    el.preload = "auto";
    voiceEls[key] = el;
  }
  return voiceEls[key]!;
}

/**
 * Prime the voice clips inside a user gesture so later programmatic playback is
 * allowed (mobile autoplay policies). Plays each muted, then resets.
 */
export function unlockVoice(): void {
  void unlockAudio();
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

function playVoice(key: VoiceKey) {
  const el = getVoiceEl(key);
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play();
  } catch {
    /* ignore */
  }
}

/** "Halfway there" — played at the midpoint of a work set. */
export function halfwayVoice() {
  playVoice("halfway");
}

/** "5, 4, 3, 2, 1" — played heading into the end of a work set. */
export function countdownVoice() {
  playVoice("countdown");
}

/**
 * Play a spoken clip immediately from a tap, to verify voice cues are audible
 * without running a whole workout. Must be called from a click/tap handler.
 */
export function testVoice() {
  void unlockAudio();
  const el = getVoiceEl("halfway");
  if (!el) return;
  el.muted = false;
  el.currentTime = 0;
  void el.play();
}

/** Celebratory triad when the whole workout finishes. */
export function finishCue() {
  tone(523, 0.18, 0.18);
  setTimeout(() => tone(659, 0.18, 0.18), 160);
  setTimeout(() => tone(784, 0.35, 0.2), 320);
}
