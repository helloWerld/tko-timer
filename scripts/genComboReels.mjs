// Regenerate the combo-trainer reel content.
//
//   node scripts/genComboReels.mjs
//
// Keeps every reel's id, starting punch, style, and combo count (so the home
// filters stay balanced) but rebuilds the combo list.
//
// Reel shape: combo 1 is a single punch, and every stage adds exactly one
// move (punches AND defense moves both count), capping at 5 moves — reels
// with more than 5 combos finish with several different 5-move variations.
// Within that fixed ladder of lengths the *content* still varies — remixed
// endings, same-hand punch substitutions, head→body retargets, defense woven
// into different spots — so stages aren't just the previous combo plus one
// punch on the end. Seeded per reel id, so re-runs are deterministic.
import fs from "node:fs";

const FILE = "lib/comboReels.ts";
const MAX_MOVES = 5;

// ---------- boxing flow rules (orthodox) ----------
// 1 jab, 2 cross, 3 lead hook, 4 rear hook, 5 lead uppercut, 6 rear uppercut.
// Continuations follow hand alternation plus the classic same-hand links
// (1-1 and 3-3 doubles, 2-3, 3-4, 5-2, 6-3 ...).
const NEXT = {
  1: [2, 2, 2, 1, 3, 6, 4], // weighted: 1-2 is the bread and butter
  2: [3, 3, 1, 5],
  3: [2, 2, 4, 6, 3],
  4: [3, 5, 2],
  5: [2, 2, 3],
  6: [3, 3, 5, 1],
};
const BODYABLE = new Set([1, 2, 3, 4, 6]); // no 5b clip; 5b is rare anyway
// All defense moves are directional: slipL = "slip left", duckR = "duck
// right", etc. (No roll — a roll is the same movement as a duck.)
const DEFENSE = ["slipL", "slipR", "blockL", "blockR", "duckL", "duckR"];
const LEAD = [1, 3, 5];
const REAR = [2, 4, 6];

// ---------- seeded rng ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------- token helpers ----------
const isPunch = (t) => /^[1-6]b?$/.test(t);
const num = (t) => Number(t[0]);
const isBody = (t) => t.endsWith("b");
const punches = (toks) => toks.filter(isPunch);

// Append flow-valid punches (as string tokens) until `arr` holds `len`.
// No triples, doubles only for jabs/lead hooks, and ping-pong patterns
// (A-B-A-B) are damped so combos don't read like a metronome.
function extendWalk(rng, arr, len) {
  let tries = 0;
  while (arr.length < len && tries++ < 120) {
    const last = num(arr.at(-1));
    const n = pick(rng, NEXT[last]);
    const prev2 = arr.length >= 2 ? num(arr.at(-2)) : 0;
    if (n === last && (prev2 === n || !(n === 1 || n === 3))) continue;
    const prev3 = arr.length >= 3 ? num(arr.at(-3)) : 0;
    if (n === prev2 && last === prev3 && rng() < 0.7) continue;
    arr.push(String(n));
  }
  return arr;
}

const walk = (rng, starter, len) => extendWalk(rng, [String(starter)], len);

// ---------- variation operators (punch skeleton in, tokens out) ----------

// Keep an opening chunk of the base combo, re-walk the rest.
function remixEnding(rng, toks, len) {
  const base = punches(toks).map((t) => String(num(t)));
  const keep = Math.max(1, Math.min(base.length - 1, 1 + Math.floor(rng() * 2)));
  return extendWalk(rng, base.slice(0, keep), len);
}

// Swap one non-first punch for another punch thrown with the same hand.
function substitute(rng, toks) {
  const out = punches(toks).map((t) => String(num(t)));
  const idxs = out.map((_, i) => i).filter((i) => i > 0);
  for (const i of idxs.sort(() => rng() - 0.5)) {
    const cur = num(out[i]);
    const hand = LEAD.includes(cur) ? LEAD : REAR;
    const after = i + 1 < out.length ? num(out[i + 1]) : 0;
    const options = hand.filter(
      (p) =>
        p !== cur &&
        NEXT[num(out[i - 1])].includes(p) &&
        p !== num(out[i - 1]) && // no new doubles against either neighbor
        (!after || (p !== after && NEXT[p].includes(after))),
    );
    if (options.length) {
      out[i] = String(pick(rng, options));
      return out;
    }
  }
  return out;
}

// Punch skeleton of exactly `punchLen` punches: fresh walk, or a variation of
// an earlier combo in the reel (trimmed/extended to fit).
function skeleton(rng, combos, starter, punchLen) {
  if (!combos.length || punchLen <= 2 || rng() < 0.45)
    return walk(rng, starter, punchLen);
  const base = pick(rng, combos);
  const toks =
    rng() < 0.5 ? remixEnding(rng, base, punchLen) : substitute(rng, base);
  return extendWalk(rng, toks.slice(0, punchLen), punchLen);
}

// ---------- style decorators (token count preserved / exact) ----------

// Send 1-2 punches to the body.
function retarget(rng, toks, maxBody) {
  const out = [...toks];
  const idxs = out
    .map((t, i) => (isPunch(t) && !isBody(t) && BODYABLE.has(num(t)) ? i : -1))
    .filter((i) => i >= 0)
    .sort(() => rng() - 0.5);
  let have = out.filter((t) => isPunch(t) && isBody(t)).length;
  for (const i of idxs) {
    if (have >= maxBody) break;
    out[i] = num(out[i]) + "b";
    have++;
  }
  return out;
}

// Weave `count` defense moves between punches (never first or last, never
// adjacent — combos should finish on a punch).
function insertDefense(rng, toks, count) {
  const out = [...toks];
  for (let k = 0; k < count; k++) {
    const gaps = [];
    for (let i = 1; i < out.length; i++)
      if (!DEFENSE.includes(out[i - 1]) && !DEFENSE.includes(out[i] ?? ""))
        gaps.push(i);
    if (!gaps.length) break;
    out.splice(pick(rng, gaps), 0, pick(rng, DEFENSE));
  }
  return out;
}

// ---------- reel builder ----------

// Build one stage's combo at exactly `t` moves (tokens).
function stageCombo(rng, combos, starter, style, t) {
  if (t === 1) {
    const body =
      style === "Body shots" && BODYABLE.has(starter) && rng() < 0.3;
    return [body ? starter + "b" : String(starter)];
  }
  // Defense reels trade 1-2 of the move slots for defense moves.
  const d =
    style === "Defense" && t >= 4 && rng() < 0.65
      ? t === MAX_MOVES && rng() < 0.3
        ? 2
        : 1
      : 0;
  let toks = skeleton(rng, combos, starter, t - d);
  if (style === "Body shots" && rng() < 0.75)
    toks = retarget(rng, toks, t >= 4 ? 2 : 1);
  if (d) toks = insertDefense(rng, toks, d);
  return toks;
}

function buildReel(rng, starter, style, n) {
  const combos = [];
  let guard = 0;
  while (combos.length < n && guard++ < 400) {
    const t = Math.min(combos.length + 1, MAX_MOVES);
    const toks = stageCombo(rng, combos, starter, style, t);
    if (toks.length !== t) continue; // walk/insert fell short — retry
    const combo = toks.join("-");
    const prev = combos.at(-1);
    if (combos.some((c) => c.join("-") === combo)) continue; // dupe
    // Reject "previous + one more on the end" ladders once combos have shape.
    // Growing the single opening punch is unavoidable; growing a 2-move combo
    // (1-2 → 1-2-3) is a classic teach, so let it through occasionally.
    if (prev && combo.startsWith(prev.join("-") + "-")) {
      if (prev.length >= 3) continue;
      if (prev.length === 2 && rng() < 0.6) continue;
    }
    combos.push(toks);
  }
  if (process.env.DEBUG && combos.length < n)
    console.error(`guard dry: got ${combos.length}/${n} (${style}, starter ${starter})`);
  // If the reject loop ran dry, pad with fresh decorated walks (prefix rule
  // dropped, stage lengths kept).
  let padGuard = 0;
  while (combos.length < n && padGuard++ < 100) {
    const t = Math.min(combos.length + 1, MAX_MOVES);
    const toks = stageCombo(rng, [], starter, style, t);
    if (toks.length !== t) continue;
    if (!combos.some((c) => c.join("-") === toks.join("-"))) combos.push(toks);
  }
  // Style guarantee: a Defense reel must actually contain defense moves.
  if (
    style === "Defense" &&
    !combos.some((c) => c.some((x) => DEFENSE.includes(x)))
  ) {
    const last = combos.length - 1;
    const trimmed = punches(combos[last]).slice(0, MAX_MOVES - 1);
    combos[last] = insertDefense(rng, trimmed, 1);
  }
  return combos.map((c) => c.join("-"));
}

// ---------- run ----------
const src = fs.readFileSync(FILE, "utf8");
const old = JSON.parse(src.match(/COMBO_REELS: ComboReel\[\] = (\[[\s\S]*\]);/)[1]);

const out = old.map((r, i) => {
  const rng = mulberry32(1234567 + i * 7919);
  return {
    id: r.id,
    starter: r.starter,
    style: r.style,
    combos: buildReel(rng, r.starter, r.style, r.combos.length),
  };
});

// ---------- report ----------
let pairs = 0,
  prefix = 0;
for (const r of out)
  for (let i = 0; i < r.combos.length - 1; i++) {
    pairs++;
    if (r.combos[i + 1].startsWith(r.combos[i] + "-")) prefix++;
  }
console.log(
  `prefix-extension rate: ${((100 * prefix) / pairs).toFixed(1)}% (${prefix}/${pairs})`,
);
const bad = [];
for (const r of out) {
  if (r.style === "Body shots" && !r.combos.some((c) => c.includes("b")))
    bad.push(`${r.id}: body reel without body shots`);
  if (
    r.style === "Defense" &&
    !r.combos.some((c) => DEFENSE.some((d) => c.includes(d)))
  )
    bad.push(`${r.id}: defense reel without defense`);
  r.combos.forEach((c, i) => {
    const t = c.split("-");
    if (t.length !== Math.min(i + 1, MAX_MOVES))
      bad.push(`${r.id}: stage ${i + 1} has ${t.length} moves in ${c}`);
    if (!t.every((x) => isPunch(x) || DEFENSE.includes(x)))
      bad.push(`${r.id}: bad token in ${c}`);
    if (DEFENSE.includes(t.at(-1)))
      bad.push(`${r.id}: ends on defense in ${c}`);
    for (let k = 2; k < t.length; k++)
      if (
        isPunch(t[k]) &&
        num(t[k]) === num(t[k - 1] ?? "x") &&
        num(t[k]) === num(t[k - 2] ?? "x")
      )
        bad.push(`${r.id}: triple in ${c}`);
  });
}
console.log(bad.length ? bad.join("\n") : "checks: all clean");
for (const id of ["R001", "R005", "R018", "R150", "R301"]) {
  const r = out.find((x) => x.id === id);
  console.log(`${r.id} [${r.style}, starts ${r.starter}]:`);
  for (const c of r.combos) console.log("   " + c);
}

const header = src.slice(0, src.indexOf("export const COMBO_REELS"));
fs.writeFileSync(
  FILE,
  header +
    "export const COMBO_REELS: ComboReel[] = " +
    JSON.stringify(out).replace(/\},\{/g, "},\n{") +
    ";\n",
);
console.log(`wrote ${FILE} (${out.length} reels)`);
