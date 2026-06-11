// Eval harness for boxing mode. Run with: npx tsx scripts/evalBoxing.mjs
import { BOXING_COMBOS, RECOVERY_MOVES, boxingComboPool } from "../lib/boxing.ts";
import { BOXING_FORMATS, scaledIntervals } from "../lib/formats.ts";
import { generateBoxingWorkout } from "../lib/generateBoxingWorkout.ts";

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("  ✗ " + msg);
};
const ok = (msg) => console.log("  ✓ " + msg);

// ---- 1. Data / parser ----
console.log("\n[1] Combo data");
console.log(`  parsed ${BOXING_COMBOS.length} combos, ${RECOVERY_MOVES.length} recovery moves`);

const ids = new Set();
for (const c of BOXING_COMBOS) {
  if (ids.has(c.id)) fail(`duplicate combo id: ${c.id} (${c.notation})`);
  ids.add(c.id);
}
const recIds = new Set();
for (const m of RECOVERY_MOVES) {
  if (recIds.has(m.id)) fail(`duplicate recovery id: ${m.id} (${m.name})`);
  recIds.add(m.id);
}
if (ids.size === BOXING_COMBOS.length) ok("all combo ids unique");
if (recIds.size === RECOVERY_MOVES.length) ok("all recovery ids unique");

const byNotation = (n) => BOXING_COMBOS.find((c) => c.notation === n);
const spot = [
  ["1 - 2 - 3", { punches: 3, moves: 3, difficulty: "beginner", hasSlipBlock: false, hasDuck: false, hasFootwork: false }],
  ["1 - 2 - 3 - 4", { punches: 4, moves: 4, difficulty: "intermediate" }],
  ["2 - 3 - 2 - 3 - 2", { punches: 5, moves: 5, difficulty: "advanced" }],
  ["SL - 2", { punches: 1, moves: 2, difficulty: "beginner", hasSlipBlock: true }],
  // 3 punches but 4 total moves → intermediate under the move-based rule.
  ["1 - 2 - DL - 4", { punches: 3, moves: 4, difficulty: "intermediate", hasDuck: true }],
  ["1 - 2 - 3 - PL", { punches: 3, moves: 4, difficulty: "intermediate", hasFootwork: true }],
  ["1 - 4B", { punches: 2, moves: 2, difficulty: "beginner" }],
  ["BL - 2 - 3 - 2 - 3", { punches: 4, moves: 5, difficulty: "advanced", hasSlipBlock: true }],
];
for (const [notation, expect] of spot) {
  const c = byNotation(notation);
  if (!c) { fail(`combo not found: ${notation}`); continue; }
  for (const [k, v] of Object.entries(expect)) {
    if (c[k] !== v) fail(`${notation}: ${k}=${c[k]} expected ${v}`);
  }
}
if (!failures) ok("spot-checked punch counts / flags / difficulty");

const dist = BOXING_COMBOS.reduce((a, c) => ((a[c.difficulty] = (a[c.difficulty] || 0) + 1), a), {});
console.log(`  difficulty distribution (by moves): ${JSON.stringify(dist)}`);
const maxPunch = Math.max(...BOXING_COMBOS.map((c) => c.punches));
const minPunch = Math.min(...BOXING_COMBOS.map((c) => c.punches));
console.log(`  punches range: ${minPunch}..${maxPunch}`);
if (minPunch >= 1) ok("every combo has at least one punch");
else fail("found combo with 0 punches");
// Difficulty must agree with the move-count rule for every combo.
const badRule = BOXING_COMBOS.filter((c) => {
  const expected = c.moves <= 3 ? "beginner" : c.moves === 4 ? "intermediate" : "advanced";
  return c.difficulty !== expected;
});
if (badRule.length) fail(`${badRule.length} combos violate the move-count level rule`);
else ok("difficulty matches move-count rule for all combos");

// ---- 2. Pool filtering ----
console.log("\n[2] Pool filtering");
const allOff = { includeSlips: false, includeDucks: false, includeFootwork: false };
const allOn = { includeSlips: true, includeDucks: true, includeFootwork: true };
const moveCap = { beginner: 3, intermediate: 4, advanced: 99 };
for (const level of ["beginner", "intermediate", "advanced"]) {
  const cap = moveCap[level];
  const pool = boxingComboPool(level, allOn);
  const overCap = pool.filter((c) => c.moves > cap);
  if (overCap.length) fail(`${level}: ${overCap.length} combos exceed move ceiling ${cap}`);
  const pure = boxingComboPool(level, allOff);
  const leaked = pure.filter((c) => c.hasSlipBlock || c.hasDuck || c.hasFootwork);
  if (leaked.length) fail(`${level} all-off: ${leaked.length} combos leaked defensive moves`);
  console.log(`  ${level}: ${pool.length} combos (all on), ${pure.length} pure-punch (all off)`);
}
// Advanced (all on) must equal the whole library — "any combination".
if (boxingComboPool("advanced", allOn).length !== BOXING_COMBOS.length)
  fail("advanced/all-on should include every combo");
if (!failures) ok("pools respect move ceiling and element toggles");

// ---- 3. Generator invariants ----
console.log("\n[3] Generator invariants");
const base = {
  mode: "boxing", goal: "full", intensity: "medium", targetMinutes: 20,
  soundMode: "voice", includeWarmup: true, includeCooldown: true,
};
let combos = 0;
const toggles = [allOn, allOff, { includeSlips: true, includeDucks: false, includeFootwork: false }];
const comboByNotation = new Map(BOXING_COMBOS.map((c) => [c.notation, c]));
const punchesOf = (step) => comboByNotation.get(step.exercise?.cue)?.punches ?? 0;
for (const fmt of BOXING_FORMATS) {
  for (const difficulty of ["beginner", "intermediate", "advanced"]) {
    for (const intensity of ["low", "medium", "high"]) {
      for (const t of toggles) {
        for (const targetMinutes of [5, 20, 45]) {
          combos++;
          const settings = { ...base, formatId: fmt.id, difficulty, intensity, targetMinutes, ...t };
          const w = generateBoxingWorkout(settings);
          const comboIds = new Set(boxingComboPool(difficulty, t).map((c) => c.id));
          const recoveryIds = new Set(RECOVERY_MOVES.map((m) => m.id));
          for (const s of w.steps) {
            if (s.kind === "work") {
              if (!comboIds.has(s.exercise?.id)) fail(`${fmt.id}/${difficulty}: work step combo not in pool`);
            } else if (s.kind === "recovery") {
              if (!s.exercise || !recoveryIds.has(s.exercise.id)) fail(`${fmt.id}: recovery step missing recovery move`);
            } else if (s.kind === "roundRest") {
              if (s.exercise) fail(`${fmt.id}: roundRest should be passive (no exercise)`);
            }
          }

          // Group work steps by round.
          const workByRound = new Map();
          for (const s of w.steps) {
            if (s.kind !== "work") continue;
            (workByRound.get(s.round) ?? workByRound.set(s.round, []).get(s.round)).push(s);
          }
          const roundNums = [...workByRound.keys()].sort((a, b) => a - b);

          if (fmt.repeat) {
            // Interval format: every round must repeat the same combo sequence.
            const sig = (r) => workByRound.get(r).map((s) => s.exercise.id).join("|");
            const first = sig(roundNums[0]);
            if (!roundNums.every((r) => sig(r) === first))
              fail(`${fmt.id}: interval rounds are not identical`);
          } else {
            // Progression: punches must be non-decreasing across the whole
            // work sequence (early rounds simpler than later ones).
            const seq = w.steps.filter((s) => s.kind === "work").map(punchesOf);
            for (let i = 1; i < seq.length; i++)
              if (seq[i] < seq[i - 1]) { fail(`${fmt.id}/${difficulty}: progression not monotonic`); break; }
          }

          // Round count is integer, so the best achievable is within one
          // round-block of the target. (Tiny targets + long formats are forced
          // to a single round — same constraint as the strength generator.)
          const { work: w2, rest: r2, roundRest: rr2 } = scaledIntervals(fmt, intensity);
          const roundCost = fmt.exercisesPerRound * w2 + (fmt.exercisesPerRound - 1) * r2 + rr2;
          if (Math.abs(w.totalSeconds - targetMinutes * 60) > roundCost + 5)
            fail(`${fmt.id}/${difficulty}/${intensity}/${targetMinutes}m: total ${w.totalSeconds}s further than one round (${roundCost}s) from target`);
        }
      }
    }
  }
}
console.log(`  exercised ${combos} setting combinations`);
if (!failures) ok("all generated workouts satisfy invariants (progression + intervals)");

// ---- 4. Format config ----
console.log("\n[4] Format config");
const rounds60 = BOXING_FORMATS.find((f) => f.id === "box-rounds");
if (rounds60?.baseWork === 60 && rounds60?.baseRest === 30 && rounds60?.baseRoundRest === 30)
  ok("Boxing Rounds = 60s work / 30s recovery / 30s round rest");
else fail(`Boxing Rounds timing wrong: ${JSON.stringify(rounds60)}`);
const intervals = BOXING_FORMATS.find((f) => f.id === "box-intervals");
if (intervals?.repeat === true) ok("Intervals format present with repeat=true");
else fail("Intervals format missing or not marked repeat");

console.log(`\n${failures ? "FAIL" : "PASS"} — ${failures} failure(s)\n`);
process.exit(failures ? 1 : 0);
