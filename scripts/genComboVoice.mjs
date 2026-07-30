// Generate + verify the combo-trainer voice clips with the "Russell from
// Jabster" cloned ElevenLabs voice (Jabster style guide §A9 — same voice +
// settings as the Jabster video skills, NOT the stock voice used for the
// timer cues).
//
//   npx tsx scripts/genComboVoice.mjs            # key read from ~/.config/elevenlabs/api.env
//   FORCE=1 npx tsx scripts/genComboVoice.mjs    # re-generate all
//
// Writes /public/combo-voice/*.mp3 — one clip per spoken token (numbers,
// "body" variants, directional defense) plus the reel-complete line. The
// trainer sequences these at runtime to announce any combo.
//
// The cloned voice occasionally hallucinates artifacts on short clips
// (stochastic — the fix is to regenerate, per the Jabster audio guide), so
// every clip is VERIFIED: edge silence trimmed, duration bounds checked, and
// the audio transcribed back with whisper to confirm it says exactly what it
// should. Failures regenerate automatically.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const VOICE_ID = "tcLkqe2xUmHhTR82Gjuu"; // "Russell from Jabster" (cloned)
const MODEL_ID = "eleven_multilingual_v2";
// §A9 settings — keep in lockstep with the Jabster skills' voice_cues.py.
const SETTINGS = {
  stability: 0.52,
  similarity_boost: 0.9,
  style: 0.28,
  use_speaker_boost: true,
  speed: 1.0,
};
const OUT_DIR = path.join("public", "combo-voice");
const KEY_ENV = path.join(os.homedir(), ".config", "elevenlabs", "api.env");
const WHISPER_MODEL = "mlx-community/whisper-base-mlx";
const MAX_ATTEMPTS = 4;

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  try {
    for (const line of fs.readFileSync(KEY_ENV, "utf8").split("\n")) {
      if (line.includes("ELEVENLABS_API_KEY")) {
        return line.split("=", 2)[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
  console.error("Missing ELEVENLABS_API_KEY (env or ~/.config/elevenlabs/api.env).");
  process.exit(1);
}

const NUMBERS = ["One", "Two", "Three", "Four", "Five", "Six"];

// §A9: numbers spelled as words, punctuation-only pacing (no SSML breaks).
// Body shots are called "<number> body" ("Three body."), defense moves carry
// their direction ("Slip left.").
const items = [
  ...NUMBERS.map((w, i) => ({ file: `${i + 1}`, text: `${w}.`, maxDur: 1.5 })),
  ...NUMBERS.map((w, i) => ({
    file: `${i + 1}b`,
    text: `${w} body.`,
    maxDur: 2.0,
  })),
  { file: "slipL", text: "Slip left.", maxDur: 2.0 },
  { file: "slipR", text: "Slip right.", maxDur: 2.0 },
  { file: "blockL", text: "Block left.", maxDur: 2.0 },
  { file: "blockR", text: "Block right.", maxDur: 2.0 },
  { file: "duckL", text: "Duck left.", maxDur: 2.0 },
  { file: "duckR", text: "Duck right.", maxDur: 2.0 },
  { file: "reel-complete", text: "Reel complete. Nice work.", maxDur: 3.5 },
];

async function tts(text, outPath, key, retries = 3) {
  for (let a = 0; a < retries; a++) {
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": key,
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: MODEL_ID,
            voice_settings: SETTINGS,
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length < 800) throw new Error(`suspiciously small response (${data.length}B)`);
      fs.writeFileSync(outPath, data);
      return true;
    } catch (e) {
      if (a === retries - 1) {
        console.error(`  FAILED ${path.basename(outPath)}: ${e.message}`);
        return false;
      }
      await new Promise((r) => setTimeout(r, 2000 + 2000 * a));
    }
  }
}

// ---------- verification ----------

function probe(file) {
  return Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1", file,
    ]).toString().trim(),
  );
}

/** Trim leading/trailing silence (keeps ~50ms edges) so cues fire tight and
 * the app's measured durations match the actual speech. */
function trimSilence(file) {
  const tmp = file.replace(/\.mp3$/, ".trim.mp3");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", file,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05," +
      "areverse," +
      "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05," +
      "areverse",
    "-b:a", "128k", tmp,
  ]);
  fs.renameSync(tmp, file);
}

// Digits and homophones map to the canonical word — whisper hearing "for
// body" or "real complete" is correct audio, not an artifact.
const CANON = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
  won: "one", to: "two", too: "two", for: "four", fore: "four",
  real: "reel",
};
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => CANON[w] ?? w)
    .join(" ");
}

const whisperDir = fs.mkdtempSync(path.join(os.tmpdir(), "combo-voice-verify-"));
function transcribe(file) {
  execFileSync(
    "mlx_whisper",
    [file, "--model", WHISPER_MODEL, "--language", "en",
     "--output-format", "txt", "--output-dir", whisperDir],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  const txt = path.join(
    whisperDir,
    path.basename(file).replace(/\.mp3$/, ".txt"),
  );
  return fs.readFileSync(txt, "utf8").trim();
}

/** null if the clip passes, otherwise a reason string. */
function verify(file, item) {
  const dur = probe(file);
  if (!(dur >= 0.2 && dur <= item.maxDur)) return `duration ${dur.toFixed(2)}s`;
  const heard = normalize(transcribe(file));
  const want = normalize(item.text);
  if (heard !== want) return `heard "${heard}" (want "${want}")`;
  return null;
}

// ---------- run ----------
const key = apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
let ok = 0,
  failed = 0;
for (const item of items) {
  const out = path.join(OUT_DIR, `${item.file}.mp3`);
  if (fs.existsSync(out) && !process.env.FORCE) {
    // Existing clips still get verified so a bad one can't linger silently.
    const reason = verify(out, item);
    if (!reason) {
      ok++;
      continue;
    }
    console.log(`  ${item.file}.mp3 exists but ${reason} — regenerating`);
  }
  let passed = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !passed; attempt++) {
    if (!(await tts(item.text, out, key))) break;
    trimSilence(out);
    const reason = verify(out, item);
    if (!reason) {
      console.log(
        `  ${item.file}.mp3  "${item.text}"  ${probe(out).toFixed(2)}s  ok${attempt > 1 ? ` (attempt ${attempt})` : ""}`,
      );
      passed = true;
    } else {
      console.log(`  ${item.file}.mp3 attempt ${attempt}: ${reason} — retrying`);
    }
  }
  passed ? ok++ : failed++;
}
console.log(`done: ${ok} verified ok, ${failed} failed`);
if (failed) process.exit(1);
