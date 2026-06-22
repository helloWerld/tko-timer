import {
  RECOVERY_MOVES,
  boxingComboPool,
  comboToExercise,
} from "./boxing";
import {
  COOLDOWN_MOVES,
  EXERCISES,
  WARMUP_MOVES,
  poolFor,
  stretchPool,
} from "./exercises";
import { shuffle } from "./generateWorkout";
import type { Exercise, GeneratedWorkout } from "./types";

/**
 * Candidate exercises that could replace the step at `stepIndex`, matched to its
 * kind and the workout's mode/settings. Work, active-recovery, warm-up and
 * cool-down steps are swappable; everything else returns an empty pool.
 */
function poolForStep(
  workout: GeneratedWorkout,
  stepIndex: number,
  library: Exercise[],
): Exercise[] {
  const step = workout.steps[stepIndex];
  const { settings } = workout;
  if (step?.kind === "recovery") return RECOVERY_MOVES;
  if (step?.kind === "warmup" || step?.kind === "cooldown") {
    // Warm-up / cool-down stretches are drawn the same way the generators do:
    // boxing always uses the "cardio" set, strength uses the chosen goal.
    const list = step.kind === "warmup" ? WARMUP_MOVES : COOLDOWN_MOVES;
    const goal = settings.mode === "boxing" ? "cardio" : settings.goal;
    return stretchPool(list, goal);
  }
  if (step?.kind === "work") {
    if (settings.mode === "boxing") {
      return boxingComboPool(settings.difficulty, {
        includeSlips: settings.includeSlips,
        includeDucks: settings.includeDucks,
        includeFootwork: settings.includeFootwork,
      }).map(comboToExercise);
    }
    let pool = poolFor(settings.goal, settings.difficulty, library);
    if (pool.length === 0) pool = poolFor(settings.goal, settings.difficulty);
    return pool;
  }
  return [];
}

/**
 * Replace a single work / active-recovery step with a fresh random pick from the
 * matching pool, leaving every other step (and all timing) untouched. Prefers an
 * exercise not already used elsewhere in the workout; if the pool is exhausted it
 * settles for anything other than the current card. No-ops if no alternative
 * exists. Returns a new workout (or the same one when nothing changes).
 */
export function swapStep(
  workout: GeneratedWorkout,
  stepIndex: number,
  library: Exercise[] = EXERCISES,
): GeneratedWorkout {
  const step = workout.steps[stepIndex];
  if (!step?.exercise) return workout;

  const pool = poolForStep(workout, stepIndex, library);
  if (pool.length === 0) return workout;

  const currentId = step.exercise.id;
  const used = new Set(
    workout.steps
      .filter((s, i) => i !== stepIndex && s.exercise)
      .map((s) => s.exercise!.id),
  );

  const shuffled = shuffle(pool);
  const replacement =
    shuffled.find((e) => e.id !== currentId && !used.has(e.id)) ??
    shuffled.find((e) => e.id !== currentId);
  if (!replacement) return workout;

  const steps = workout.steps.map((s, i) =>
    i === stepIndex ? { ...s, exercise: replacement } : s,
  );

  // Rebuild the distinct-exercise summary (order of first appearance); rounds,
  // totals and timing are unchanged because only the exercise was swapped.
  const seen = new Set<string>();
  const exercises: Exercise[] = [];
  for (const s of steps) {
    if (s.exercise && !seen.has(s.exercise.id)) {
      seen.add(s.exercise.id);
      exercises.push(s.exercise);
    }
  }

  return { ...workout, steps, exercises };
}
