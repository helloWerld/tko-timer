/**
 * Voice playback for the combo trainer — completely separate from the timer's
 * audio engine. Sequences the pre-generated "Russell from Jabster" clips in
 * /public/combo-voice (one clip per token: "1".."6", "1b".."6b",
 * slipL/slipR/blockL/blockR/duckL/duckR, reel-complete) so any combo can be
 * spoken by chaining clips.
 */

const CLIP_GAP_S = 0.12; // breathing room between chained token clips

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let playing: { sources: AudioBufferSourceNode[]; cancelled: boolean } | null =
  null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture (tap) so iOS lets us play audio afterwards. */
export function unlockComboAudio(): void {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

function loadClip(name: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return cached;
  const c = context();
  const p = !c
    ? Promise.resolve(null)
    : fetch(`/combo-voice/${name}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((data) => c.decodeAudioData(data))
        .catch(() => null);
  buffers.set(name, p);
  return p;
}

/** Warm the token clips a combo needs (plus the done line) before playback. */
export function preloadComboClips(tokens: string[]): void {
  for (const t of tokens) void loadClip(t);
  void loadClip("reel-complete");
}

export function stopComboSpeech(): void {
  if (!playing) return;
  playing.cancelled = true;
  for (const s of playing.sources) {
    try {
      s.stop();
    } catch {}
  }
  playing = null;
}

/** Speak a sequence of clip names back-to-back. Cancels anything in flight. */
async function playSequence(names: string[]): Promise<void> {
  const c = context();
  if (!c) return;
  if (c.state === "suspended") await c.resume().catch(() => {});
  stopComboSpeech();
  const run = { sources: [] as AudioBufferSourceNode[], cancelled: false };
  playing = run;
  const clips = await Promise.all(names.map(loadClip));
  if (run.cancelled) return;
  let at = c.currentTime + 0.05;
  for (const buf of clips) {
    if (!buf) continue;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(at);
    run.sources.push(src);
    at += buf.duration + CLIP_GAP_S;
  }
}

/** Speak one combo, e.g. "1-2b-slip-3" → one, two to the body, slip, three. */
export function speakCombo(combo: string): void {
  void playSequence(combo.split("-"));
}

export function speakReelComplete(): void {
  void playSequence(["reel-complete"]);
}
