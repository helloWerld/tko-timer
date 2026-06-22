import {
  COOLDOWN_MOVES,
  WARMUP_MOVES,
  stretchPool,
} from "./exercises";
import {
  RECOVERY_MOVES,
  boxingComboPool,
  comboComplexity,
  comboToExercise,
  type BoxingCombo,
} from "./boxing";
import { getFormat, scaledIntervals } from "./formats";
import { clamp, pickSequence, shuffle } from "./generateWorkout";
import type {
  Exercise,
  GeneratedWorkout,
  IntervalStep,
  WorkoutSettings,
} from "./types";

const PREP_SECONDS = 10;
const WARMUP_HOLD = 30;
const COOLDOWN_HOLD = 30;
// Fixed rest that bookends the main work: one after the warm-up before round 1,
// and one after the last round before the cool-down.
const TRANSITION_REST = 30;

/**
 * Pick `count` combos that ramp from simplest to most complex. The pool is
 * sorted by complexity and split into `count` contiguous buckets; one random
 * combo is drawn from each, so the result spans the full range — easiest first,
 * hardest last — while still varying run to run. When the pool is smaller than
 * `count`, adjacent buckets collapse onto the same combo (i.e. it repeats).
 */
function rampedSelection(pool: BoxingCombo[], count: number): BoxingCombo[] {
  const out: BoxingCombo[] = [];
  if (pool.length === 0 || count <= 0) return out;
  const sorted = [...pool].sort((a, b) => comboComplexity(a) - comboComplexity(b));
  for (let i = 0; i < count; i++) {
    const lo = Math.floor((i * sorted.length) / count);
    const hi = Math.max(lo + 1, Math.floor(((i + 1) * sorted.length) / count));
    out.push(shuffle(sorted.slice(lo, hi))[0]);
  }
  return out;
}

/**
 * Boxing-mode generator. Mirrors generateWorkout's timing math, but work steps
 * are punch combos and the short rests between combos are filled with active
 * recovery moves. The longer between-round rests stay passive (breathe/water).
 */
export function generateBoxingWorkout(
  settings: WorkoutSettings,
): GeneratedWorkout {
  const format = getFormat(settings.formatId);
  const { work, rest, roundRest } = scaledIntervals(format, settings.intensity, {
    work: settings.customWork,
    rest: settings.customRest,
  });
  const perRound = format.exercisesPerRound;

  const totalTarget = settings.targetMinutes * 60;
  const warmupCount = settings.includeWarmup
    ? clamp(Math.round((totalTarget * 0.15) / WARMUP_HOLD), 2, 6)
    : 0;
  const cooldownCount = settings.includeCooldown
    ? clamp(Math.round((totalTarget * 0.12) / COOLDOWN_HOLD), 2, 5)
    : 0;
  const warmupSeconds = warmupCount * WARMUP_HOLD;
  const cooldownSeconds = cooldownCount * COOLDOWN_HOLD;
  // A transition rest is only added where it borders the main work.
  const warmupRest = warmupCount > 0 ? TRANSITION_REST : 0;
  const cooldownRest = cooldownCount > 0 ? TRANSITION_REST : 0;

  const roundCost = perRound * work + (perRound - 1) * rest + roundRest;
  const mainTarget =
    totalTarget -
    PREP_SECONDS -
    warmupSeconds -
    warmupRest -
    cooldownRest -
    cooldownSeconds;
  const rounds = Math.max(1, Math.round(mainTarget / roundCost));

  // Combo pool for the chosen level + enabled elements.
  const comboPool = boxingComboPool(settings.difficulty, {
    includeSlips: settings.includeSlips,
    includeDucks: settings.includeDucks,
    includeFootwork: settings.includeFootwork,
  });

  // Build the per-round combo sets so the whole workout ramps simplest→hardest:
  // straight punches first, then hooks, uppercuts, and finally the advanced
  // layer (overhands and slips/blocks/ducks/footwork). See comboComplexity.
  //  - Interval formats repeat one fixed set every round; that set ramps
  //    internally from its easiest combo to its hardest.
  //  - Other formats spread one continuous ramp across every round, so each
  //    round picks up where the previous left off and ends harder than it began.
  let roundSets: BoxingCombo[][];
  if (format.repeat) {
    const base = rampedSelection(comboPool, perRound);
    roundSets = Array.from({ length: rounds }, () => base);
  } else {
    const all = rampedSelection(comboPool, rounds * perRound);
    roundSets = Array.from({ length: rounds }, (_, r) =>
      all.slice(r * perRound, (r + 1) * perRound),
    );
  }
  const picks: Exercise[] = roundSets.flat().map(comboToExercise);

  // Active-recovery moves for the inter-combo gaps ((perRound - 1) per round).
  // For interval formats the recovery sequence repeats each round, just like
  // the combos. With "rest" style there are no recovery moves at all.
  const active = settings.recoveryStyle === "active";
  const gaps = Math.max(0, perRound - 1);
  let recoveryByRound: Exercise[][] = [];
  if (active && gaps > 0) {
    if (format.repeat) {
      const baseRec = pickSequence(RECOVERY_MOVES, gaps);
      recoveryByRound = Array.from({ length: rounds }, () => baseRec);
    } else {
      const flat = pickSequence(RECOVERY_MOVES, rounds * gaps);
      recoveryByRound = Array.from({ length: rounds }, (_, r) =>
        flat.slice(r * gaps, (r + 1) * gaps),
      );
    }
  }
  const warmupPicks = pickSequence(
    stretchPool(WARMUP_MOVES, "cardio"),
    warmupCount,
  );
  const cooldownPicks = pickSequence(
    stretchPool(COOLDOWN_MOVES, "cardio"),
    cooldownCount,
  );

  const steps: IntervalStep[] = [
    { kind: "prep", seconds: PREP_SECONDS, round: 0, label: "Get Ready" },
  ];

  for (const stretch of warmupPicks) {
    steps.push({ kind: "warmup", seconds: WARMUP_HOLD, exercise: stretch, round: 0, label: "Warm-Up" });
  }

  // Rest between the warm-up and the first round (announces round 1's opener).
  if (warmupRest > 0) {
    steps.push({ kind: "roundRest", seconds: warmupRest, round: 1, label: "Rest" });
  }

  let pickIdx = 0;
  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < perRound; i++) {
      const combo = picks[pickIdx++];
      steps.push({ kind: "work", seconds: work, exercise: combo, round: r });

      const isFinalStep = r === rounds && i === perRound - 1;
      if (isFinalStep) break;

      const isRoundEnd = i === perRound - 1;
      if (isRoundEnd && roundRest > 0) {
        // Passive rest between rounds — breathe and grab water.
        steps.push({ kind: "roundRest", seconds: roundRest, round: r, label: "Round Rest" });
      } else if (rest > 0) {
        // A gap between combos. Zero-length recovery (custom slider at 0) is
        // skipped entirely, so combos run back-to-back like a real round.
        if (active) {
          const move = recoveryByRound[r - 1][i];
          steps.push({ kind: "recovery", seconds: rest, exercise: move, round: r, label: "Active Recovery" });
        } else {
          steps.push({ kind: "rest", seconds: rest, round: r, label: "Rest" });
        }
      }
    }
  }

  // Rest between the last round and the cool-down.
  if (cooldownRest > 0) {
    steps.push({ kind: "roundRest", seconds: cooldownRest, round: rounds, label: "Rest" });
  }

  for (const stretch of cooldownPicks) {
    steps.push({ kind: "cooldown", seconds: COOLDOWN_HOLD, exercise: stretch, round: 0, label: "Cool-Down" });
  }

  const totalSeconds = steps.reduce((sum, s) => sum + s.seconds, 0);

  const seen = new Set<string>();
  const exercises: Exercise[] = [];
  for (const s of steps) {
    if (s.exercise && !seen.has(s.exercise.id)) {
      seen.add(s.exercise.id);
      exercises.push(s.exercise);
    }
  }

  return { settings, format, steps, rounds, totalSeconds, exercises };
}
