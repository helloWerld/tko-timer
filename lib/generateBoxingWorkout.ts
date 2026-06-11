import {
  COOLDOWN_MOVES,
  WARMUP_MOVES,
  stretchPool,
} from "./exercises";
import {
  RECOVERY_MOVES,
  boxingComboPool,
  comboToExercise,
  isBasicCombo,
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

/** Sample `count` combos from the pool, cycling a reshuffled bag (allows
 * repeats only when the pool is smaller than count). */
function sampleCombos(pool: BoxingCombo[], count: number): BoxingCombo[] {
  const out: BoxingCombo[] = [];
  if (pool.length === 0) return out;
  let bag: BoxingCombo[] = [];
  while (out.length < count) {
    if (bag.length === 0) bag = shuffle(pool);
    out.push(bag.shift()!);
  }
  return out;
}

/** Easiest-first: fewer punches, then fewer total moves. Drives the round
 * progression so early rounds are simpler than later ones. */
function byProgression(a: BoxingCombo, b: BoxingCombo): number {
  return a.punches - b.punches || a.moves - b.moves;
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
  const { work, rest, roundRest } = scaledIntervals(format, settings.intensity);
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

  const roundCost = perRound * work + (perRound - 1) * rest + roundRest;
  const mainTarget =
    totalTarget - PREP_SECONDS - warmupSeconds - cooldownSeconds;
  const rounds = Math.max(1, Math.round(mainTarget / roundCost));

  // Combo pool for the chosen level + enabled elements.
  const comboPool = boxingComboPool(settings.difficulty, {
    includeSlips: settings.includeSlips,
    includeDucks: settings.includeDucks,
    includeFootwork: settings.includeFootwork,
  });

  // Basics (jab, jab-cross, …) open the workout — no overhands or complex
  // combos. Fall back to the full pool only if somehow none qualify.
  const basics = comboPool.filter(isBasicCombo);
  const basicsPool = basics.length > 0 ? basics : comboPool;

  // Build the per-round combo sets, then flatten in round order.
  //  - Interval formats repeat one fixed set every round; it opens with the
  //    easiest basic and then progresses easy→hard.
  //  - Other formats make round 1 all basics, then later rounds progress
  //    through the full pool from simplest to longest combos.
  let roundSets: BoxingCombo[][];
  if (format.repeat) {
    const opener = [...basicsPool].sort(byProgression)[0];
    const rest = sampleCombos(
      comboPool.filter((c) => c.id !== opener.id),
      perRound - 1,
    ).sort(byProgression);
    const base = [opener, ...rest];
    roundSets = Array.from({ length: rounds }, () => base);
  } else {
    const round1 = sampleCombos(basicsPool, perRound).sort(byProgression);
    if (rounds === 1) {
      roundSets = [round1];
    } else {
      const sample = sampleCombos(comboPool, (rounds - 1) * perRound).sort(
        byProgression,
      );
      roundSets = [
        round1,
        ...Array.from({ length: rounds - 1 }, (_, r) =>
          sample.slice(r * perRound, (r + 1) * perRound),
        ),
      ];
    }
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
      } else if (active) {
        // Active recovery between combos.
        const move = recoveryByRound[r - 1][i];
        steps.push({ kind: "recovery", seconds: rest, exercise: move, round: r, label: "Active Recovery" });
      } else {
        // Plain rest between combos.
        steps.push({ kind: "rest", seconds: rest, round: r, label: "Rest" });
      }
    }
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
