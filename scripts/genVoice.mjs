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
// Adam — deep American male. A default voice (free-tier API can use it).
// Library/community voices (e.g. lXyLz3Gu0YqdG8RfvIyZ, Josh) require a paid
// plan; set ELEVENLABS_VOICE_ID + FORCE=1 to use one once upgraded.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
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
  "prep-go": "Three, two, one. Go!",
  halfway: "Halfway there! Keep going!",
  "to-work": "Five, four, three, two, one. Next round!",
  "to-rest": "Five, four, three, two, one. Rest.",
  "rest-end": "Three, two, one. Next round!",
};

const items = [
  ...[...phrases].map((text) => ({ file: slug(text), text, cue: false })),
  ...Object.entries(CUES).map(([file, text]) => ({ file, text, cue: true })),
];

// Countdown cues fire a fixed number of seconds before a step ends, so they're
// time-compressed (pitch-preserved) to land on the transition. The per-second
// beeps already carry the precise timing; this just keeps the voice aligned.
const FIT_SECONDS = {
  "to-work": 4.8, // fires with ~5s left
  "to-rest": 4.8,
  "rest-end": 2.9, // fires with ~3s left
};

function probe(f) {
  return Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1", f,
    ]).toString().trim(),
  );
}

function fitDuration(file, target) {
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

// Short word clips need steadier settings — very low stability / high style
// makes the model ramble or add breaths on one- or two-word inputs. The cue
// sentences can carry a little more energy.
const SETTINGS_PHRASE = {
  stability: 0.7,
  similarity_boost: 0.75,
  style: 0.1,
  use_speaker_boost: true,
};
const SETTINGS_CUE = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.35,
  use_speaker_boost: true,
};

async function tts(text, voiceSettings) {
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
        voice_settings: voiceSettings,
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
    let note = "";
    if (it.cue) {
      const buf = await tts(it.text, SETTINGS_CUE);
      fs.writeFileSync(out, buf);
      if (FIT_SECONDS[it.file]) {
        note = ` → fit ${fitDuration(out, FIT_SECONDS[it.file]).toFixed(1)}s`;
      }
    } else {
      // Word clips can occasionally ramble (the model adds breaths/filler on
      // short text). Retry and keep the shortest that's within budget.
      const words = it.text.trim().split(/\s+/).length;
      const maxDur = words * 0.85 + 0.9;
      let bestDur = Infinity;
      for (let attempt = 1; attempt <= 6; attempt++) {
        const tmp = `${out}.try${attempt}.mp3`;
        fs.writeFileSync(tmp, await tts(it.text, SETTINGS_PHRASE));
        const dur = probe(tmp);
        if (dur < bestDur) {
          bestDur = dur;
          fs.renameSync(tmp, out);
        } else {
          fs.rmSync(tmp);
        }
        if (bestDur <= maxDur) break;
        if (attempt < 4) note = ` (retry, ${dur.toFixed(1)}s>${maxDur.toFixed(1)}s)`;
      }
      note = ` ${bestDur.toFixed(1)}s` + (bestDur > maxDur ? ` (over ${maxDur.toFixed(1)}s)` : "");
    }
    made++;
    console.log(`  ✓ ${it.file}.mp3  "${it.text}"${note}`);
  } catch (e) {
    console.error(`  ✗ ${it.file}.mp3 — ${e.message}`);
    process.exitCode = 1;
  }
}
console.log(`\nDone — ${made} new clip(s).`);
