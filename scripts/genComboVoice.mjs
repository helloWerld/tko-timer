// Generate the combo-trainer voice clips with the "Russell from Jabster"
// cloned ElevenLabs voice (Jabster style guide §A9 — same voice + settings as
// the Jabster video skills, NOT the stock voice used for the timer cues).
//
//   npx tsx scripts/genComboVoice.mjs            # key read from ~/.config/elevenlabs/api.env
//   FORCE=1 npx tsx scripts/genComboVoice.mjs    # re-generate all
//
// Writes /public/combo-voice/*.mp3 — one clip per spoken token (numbers,
// "to the body" variants, defense words) plus the reel-complete line. The
// trainer sequences these at runtime to announce any combo.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

// §A9: numbers spelled as words, body shots spoken as "to the body",
// punctuation-only pacing (periods, no SSML breaks).
const items = [
  ...NUMBERS.map((w, i) => ({ file: `${i + 1}`, text: `${w}.` })),
  ...NUMBERS.map((w, i) => ({ file: `${i + 1}b`, text: `${w} to the body.` })),
  { file: "slipL", text: "Slip left." },
  { file: "slipR", text: "Slip right." },
  { file: "blockL", text: "Block left." },
  { file: "blockR", text: "Block right." },
  { file: "duckL", text: "Duck left." },
  { file: "duckR", text: "Duck right." },
  { file: "reel-complete", text: "Reel complete. Nice work." },
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

const key = apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
let made = 0, skipped = 0, failed = 0;
for (const { file, text } of items) {
  const out = path.join(OUT_DIR, `${file}.mp3`);
  if (fs.existsSync(out) && !process.env.FORCE) {
    skipped++;
    continue;
  }
  console.log(`  ${file}.mp3  <-  "${text}"`);
  (await tts(text, out, key)) ? made++ : failed++;
}
console.log(`done: ${made} generated, ${skipped} skipped, ${failed} failed`);
if (failed) process.exit(1);
