// Generate all spoken audio with ElevenLabs (vibrant energetic male — Josh).
//
//   ELEVENLABS_API_KEY=sk_... npx tsx scripts/genVoice.mjs
//   FORCE=1 ELEVENLABS_API_KEY=... npx tsx scripts/genVoice.mjs   # re-generate all
//
// Writes /public/voice/*.mp3:
//   - one clip per unique combo-name phrase ("Jab", "Lead Hook", …) + "up-next"
//   - the six fixed timer cues (get ready, countdowns, halfway, next round, rest)
// The runtime strings the phrase clips together to announce any combo, so we
// only ever generate ~36 short files regardless of how many combos exist.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { BOXING_COMBOS } from "../lib/boxing.ts";

const API_KEY = process.env.ELEVENLABS_API_KEY;
// Liam — young, energetic American male. A default voice (free-tier API can use
// it). Library/community voices (e.g. lXyLz3Gu0YqdG8RfvIyZ, Josh) require a paid
// plan; set ELEVENLABS_VOICE_ID + FORCE=1 to use one once upgraded.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const OUT_DIR = path.join("public", "voice");

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY. Add it to .env.local or pass it inline.");
  process.exit(1);
}

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Vocabulary: "Up next" + every distinct comma-separated combo-name segment.
const phrases = new Set(["Up next"]);
for (const c of BOXING_COMBOS) {
  c.name.split(",").forEach((seg) => phrases.add(seg.trim()));
}

// Fixed timer cues. Ellipses pace the countdowns roughly one number per second
// to sit over the per-second beeps (tune by ear after first generation).
const CUES = {
  getready: "Get ready!",
  "prep-go": "Three... two... one... Go!",
  halfway: "Halfway there! Keep going!",
  "to-work": "Five... four... three... two... one... Next round!",
  "to-rest": "Five... four... three... two... one... Rest.",
  "rest-end": "Three... two... one... Next round!",
};

const items = [
  ...[...phrases].map((text) => ({ file: slug(text), text })),
  ...Object.entries(CUES).map(([file, text]) => ({ file, text })),
];

// Countdown cues fire a fixed number of seconds before a step ends, so they're
// time-compressed (pitch-preserved) to land on the transition. The per-second
// beeps already carry the precise timing; this just keeps the voice aligned.
const FIT_SECONDS = {
  "to-work": 4.8, // fires with ~5s left
  "to-rest": 4.8,
  "rest-end": 2.9, // fires with ~3s left
};

function fitDuration(file, target) {
  const probe = (f) =>
    Number(
      execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", f,
      ]).toString().trim(),
    );
  const dur = probe(file);
  if (dur <= target + 0.05) return dur; // already short enough
  const tempo = Math.max(0.5, Math.min(2.0, dur / target));
  const tmp = file.replace(/\.mp3$/, ".fit.mp3");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", file,
    "-filter:a", `atempo=${tempo}`, "-b:a", "128k", tmp,
  ]);
  fs.renameSync(tmp, file);
  return probe(file);
}

async function tts(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        // Lower stability + higher style = more lively/energetic delivery.
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.6,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log(`Generating ${items.length} clips → ${OUT_DIR}/ (voice ${VOICE_ID})\n`);

let made = 0;
for (const it of items) {
  const out = path.join(OUT_DIR, `${it.file}.mp3`);
  if (process.env.FORCE !== "1" && fs.existsSync(out)) {
    console.log(`  · skip ${it.file}.mp3 (exists)`);
    continue;
  }
  try {
    const buf = await tts(it.text);
    fs.writeFileSync(out, buf);
    let note = "";
    if (FIT_SECONDS[it.file]) {
      const fitted = fitDuration(out, FIT_SECONDS[it.file]);
      note = ` → fit ${fitted.toFixed(1)}s`;
    }
    made++;
    console.log(`  ✓ ${it.file}.mp3  "${it.text}"  (${(buf.length / 1024).toFixed(0)} KB)${note}`);
  } catch (e) {
    console.error(`  ✗ ${it.file}.mp3 — ${e.message}`);
    process.exitCode = 1;
  }
}
console.log(`\nDone — ${made} new clip(s).`);
