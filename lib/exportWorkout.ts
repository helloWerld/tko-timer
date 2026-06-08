import { GOALS } from "./formats";
import { formatClock } from "./time";
import type { GeneratedWorkout, IntervalStep } from "./types";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pad(s: string, width: number) {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

/** The "section" column for a step. */
function sectionFor(step: IntervalStep): string {
  switch (step.kind) {
    case "prep":
      return "Prep";
    case "warmup":
      return "Warm-Up";
    case "cooldown":
      return "Cool-Down";
    default:
      return `Round ${step.round}`;
  }
}

/** The "exercise" column for a step. */
function nameFor(step: IntervalStep): string {
  if (step.exercise) return step.exercise.name;
  if (step.kind === "rest") return "Rest";
  if (step.kind === "roundRest") return "Round Rest";
  return step.label ?? "";
}

/**
 * Build a plain-text export of the whole workout: all settings plus a timeline
 * of every segment (prep, warm-up, work, rest, round rest, cool-down) with start
 * times and durations. Designed to be human- and machine-readable.
 */
export function buildWorkoutExport(workout: GeneratedWorkout): string {
  const { settings, format } = workout;
  const goal = GOALS.find((g) => g.id === settings.goal)?.name ?? settings.goal;

  const L: string[] = [];
  L.push("TKO Timer Workout");
  L.push("=================");
  L.push("");
  L.push(`Goal:        ${goal}`);
  L.push(`Format:      ${format.name}`);
  L.push(`Level:       ${cap(settings.difficulty)}`);
  L.push(`Intensity:   ${cap(settings.intensity)}`);
  L.push(`Target:      ${settings.targetMinutes} min`);
  L.push(`Warm-up:     ${settings.includeWarmup ? "Yes" : "No"}`);
  L.push(`Cool-down:   ${settings.includeCooldown ? "Yes" : "No"}`);
  L.push(`Sound cues:  ${settings.soundMode === "voice" ? "Voice" : "Beeps"}`);
  L.push(`Rounds:      ${workout.rounds}`);
  L.push(`Total time:  ${formatClock(workout.totalSeconds)}`);
  L.push(`Exported:    ${new Date().toISOString().slice(0, 10)}`);
  L.push("");
  L.push("Timeline");
  L.push("--------");
  L.push(`${pad("START", 7)} ${pad("DUR", 5)} ${pad("SECTION", 11)} EXERCISE`);

  let t = 0;
  for (const step of workout.steps) {
    L.push(
      `${pad(formatClock(t), 7)} ${pad(`${step.seconds}s`, 5)} ${pad(
        sectionFor(step),
        11,
      )} ${nameFor(step)}`,
    );
    t += step.seconds;
  }

  L.push("");
  L.push(`End:         ${formatClock(t)}`);
  L.push("");
  return L.join("\n");
}

/** A safe-ish filename for the export, e.g. tko-timer-full-body-2026-06-08.txt */
export function exportFileName(workout: GeneratedWorkout): string {
  const goalSlug = workout.settings.goal;
  const date = new Date().toISOString().slice(0, 10);
  return `tko-timer-${goalSlug}-${date}.txt`;
}
