import {
  COOLDOWN_MOVES,
  WARMUP_MOVES,
  stretchPool,
} from "./exercises";
import {
  RECOVERY_MOVES,
  boxingComboPool,
  comboToExercise,
} from "./boxing";
import { getFormat, scaledIntervals } from "./formats";
import { clamp, pickSequence } from "./generateWorkout";
import type {
  Exercise,
  GeneratedWorkout,
  IntervalStep,
  WorkoutSettings,
} from "./types";

const PREP_SECONDS = 10;
const WARMUP_HOLD = 30;
const COOLDOWN_HOLD = 30;

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

  // Combo pool for the chosen level + enabled elements; convert to the Exercise
  // shape the timeline renders. Recovery moves are drawn from their own pool.
  const comboPool = boxingComboPool(settings.difficulty, {
    includeSlips: settings.includeSlips,
    includeDucks: settings.includeDucks,
    includeFootwork: settings.includeFootwork,
  }).map(comboToExercise);
  const picks = pickSequence(comboPool, rounds * perRound);
  // One recovery move per inter-combo gap: (perRound - 1) per round.
  const recoveryPicks = pickSequence(
    RECOVERY_MOVES,
    Math.max(0, rounds * (perRound - 1)),
  );
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
  let recoveryIdx = 0;
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
      } else {
        // Active recovery between combos.
        const move = recoveryPicks[recoveryIdx++];
        steps.push({ kind: "recovery", seconds: rest, exercise: move, round: r, label: "Active Recovery" });
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
