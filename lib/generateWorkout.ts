import {
  COOLDOWN_MOVES,
  EXERCISES,
  WARMUP_MOVES,
  poolFor,
  stretchPool,
} from "./exercises";
import { getFormat, scaledIntervals } from "./formats";
import type {
  Exercise,
  GeneratedWorkout,
  IntervalStep,
  WorkoutSettings,
} from "./types";

const PREP_SECONDS = 10;
const WARMUP_HOLD = 30;
const COOLDOWN_HOLD = 30;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Produces `count` exercises from the pool, cycling through a shuffled order
 * and reshuffling each pass so consecutive picks don't repeat.
 */
function pickSequence(pool: Exercise[], count: number): Exercise[] {
  const result: Exercise[] = [];
  if (pool.length === 0) return result;
  let bag: Exercise[] = [];
  while (result.length < count) {
    if (bag.length === 0) {
      bag = shuffle(pool);
      // Avoid the same exercise straddling a reshuffle boundary.
      const prev = result[result.length - 1];
      if (prev && bag[0]?.id === prev.id && bag.length > 1) {
        [bag[0], bag[1]] = [bag[1], bag[0]];
      }
    }
    result.push(bag.shift()!);
  }
  return result;
}

export function generateWorkout(
  settings: WorkoutSettings,
  /** Active exercise library (built-ins + enabled custom). Defaults to all built-ins. */
  library: Exercise[] = EXERCISES,
): GeneratedWorkout {
  const format = getFormat(settings.formatId);
  const { work, rest, roundRest } = scaledIntervals(format, settings.intensity);
  const perRound = format.exercisesPerRound;

  // Warmup and cooldown scale with the chosen session length: longer workouts
  // get more stretch moves (each held a fixed duration), within sane bounds.
  // Each section can be turned off entirely (count 0).
  const totalTarget = settings.targetMinutes * 60;
  const warmupCount = settings.includeWarmup
    ? clamp(Math.round((totalTarget * 0.15) / WARMUP_HOLD), 2, 6)
    : 0;
  const cooldownCount = settings.includeCooldown
    ? clamp(Math.round((totalTarget * 0.12) / COOLDOWN_HOLD), 2, 5)
    : 0;
  const warmupSeconds = warmupCount * WARMUP_HOLD;
  const cooldownSeconds = cooldownCount * COOLDOWN_HOLD;

  // Time cost of one full round (work + inter-exercise rests + round rest).
  const roundCost = perRound * work + (perRound - 1) * rest + roundRest;
  // The main block fills whatever's left after prep + warmup + cooldown.
  const mainTarget =
    totalTarget - PREP_SECONDS - warmupSeconds - cooldownSeconds;
  const rounds = Math.max(1, Math.round(mainTarget / roundCost));

  // Draw work exercises from the active library; if the user has disabled every
  // exercise for this goal, fall back to the built-ins so generation never fails.
  let pool = poolFor(settings.goal, settings.difficulty, library);
  if (pool.length === 0) pool = poolFor(settings.goal, settings.difficulty);
  const picks = pickSequence(pool, rounds * perRound);
  const warmupPicks = pickSequence(
    stretchPool(WARMUP_MOVES, settings.goal),
    warmupCount,
  );
  const cooldownPicks = pickSequence(
    stretchPool(COOLDOWN_MOVES, settings.goal),
    cooldownCount,
  );

  const steps: IntervalStep[] = [
    { kind: "prep", seconds: PREP_SECONDS, round: 0, label: "Get Ready" },
  ];

  // Warmup section.
  for (const stretch of warmupPicks) {
    steps.push({ kind: "warmup", seconds: WARMUP_HOLD, exercise: stretch, round: 0, label: "Warm-Up" });
  }

  let pickIdx = 0;
  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < perRound; i++) {
      const exercise = picks[pickIdx++];
      steps.push({ kind: "work", seconds: work, exercise, round: r });

      const isFinalStep = r === rounds && i === perRound - 1;
      if (isFinalStep) break;

      const isRoundEnd = i === perRound - 1;
      if (isRoundEnd && roundRest > 0) {
        steps.push({ kind: "roundRest", seconds: roundRest, round: r, label: "Round Rest" });
      } else {
        steps.push({ kind: "rest", seconds: rest, round: r, label: "Rest" });
      }
    }
  }

  // Cooldown section.
  for (const stretch of cooldownPicks) {
    steps.push({ kind: "cooldown", seconds: COOLDOWN_HOLD, exercise: stretch, round: 0, label: "Cool-Down" });
  }

  const totalSeconds = steps.reduce((sum, s) => sum + s.seconds, 0);

  // Distinct exercises in order of first appearance.
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
