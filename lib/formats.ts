import {
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Goal, Intensity, WorkoutFormat } from "./types";

export const FORMATS: WorkoutFormat[] = [
  {
    id: "tabata",
    name: "Tabata",
    blurb: "20s on / 10s off — max effort bursts.",
    baseWork: 20,
    baseRest: 10,
    exercisesPerRound: 4,
    baseRoundRest: 30,
  },
  {
    id: "hiit",
    name: "Classic HIIT",
    blurb: "40s work / 20s recovery intervals.",
    baseWork: 40,
    baseRest: 20,
    exercisesPerRound: 5,
    baseRoundRest: 40,
  },
  {
    id: "emom",
    name: "EMOM",
    blurb: "Every minute: ~50s work, short reset.",
    baseWork: 50,
    baseRest: 10,
    exercisesPerRound: 6,
    baseRoundRest: 0,
  },
  {
    id: "circuit",
    name: "Circuit",
    blurb: "45s stations with steady rest.",
    baseWork: 45,
    baseRest: 15,
    exercisesPerRound: 6,
    baseRoundRest: 60,
  },
  {
    id: "pyramid",
    name: "Sprint Pyramid",
    blurb: "Short, punchy 30s/15s cardio pushes.",
    baseWork: 30,
    baseRest: 15,
    exercisesPerRound: 5,
    baseRoundRest: 30,
  },
];

/**
 * Boxing formats. Same shape as strength formats, but the fields read as:
 * baseWork = seconds per combo, exercisesPerRound = combos per round,
 * baseRest = active-recovery length between combos, baseRoundRest = passive
 * rest between rounds (breathe / water).
 *
 * The two formats differ only in `repeat`: "Mixed bag" draws fresh combos every
 * round, "Intervals" repeats one fixed set. Their work/rest timing is identical
 * — the user shapes that through Intensity (low/medium/high or custom sliders).
 */
const BOXING_BASE = {
  baseWork: 40,
  baseRest: 20,
  exercisesPerRound: 5,
  baseRoundRest: 30,
} as const;

export const BOXING_FORMATS: WorkoutFormat[] = [
  {
    id: "box-mixed",
    name: "Mixed bag",
    blurb: "Fresh combinations every round.",
    ...BOXING_BASE,
  },
  {
    id: "box-intervals",
    name: "Intervals",
    blurb: "The same combo set repeats every round.",
    ...BOXING_BASE,
    repeat: true,
  },
];

export function getFormat(id: string): WorkoutFormat {
  return (
    FORMATS.find((f) => f.id === id) ??
    BOXING_FORMATS.find((f) => f.id === id) ??
    FORMATS[0]
  );
}

/**
 * Resolve the work/rest/round-rest seconds for a format. low/medium/high scale
 * the format's base timing (higher intensity = longer work, shorter rest, so
 * each second is harder). "custom" ignores the scaling and uses the caller's
 * `custom` work/rest values verbatim (round rest stays the format default).
 */
export function scaledIntervals(
  format: WorkoutFormat,
  intensity: Intensity,
  custom?: { work: number; rest: number },
): { work: number; rest: number; roundRest: number } {
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
  if (intensity === "custom" && custom) {
    return {
      work: round5(custom.work),
      rest: custom.rest > 0 ? round5(custom.rest) : 0,
      roundRest: format.baseRoundRest > 0 ? round5(format.baseRoundRest) : 0,
    };
  }
  const factor: Record<Intensity, { work: number; rest: number }> = {
    low: { work: 0.85, rest: 1.3 },
    medium: { work: 1.0, rest: 1.0 },
    high: { work: 1.2, rest: 0.7 },
    custom: { work: 1.0, rest: 1.0 },
  };
  const f = factor[intensity];
  return {
    work: round5(format.baseWork * f.work),
    rest: round5(format.baseRest * f.rest),
    roundRest:
      format.baseRoundRest > 0 ? round5(format.baseRoundRest * f.rest) : 0,
  };
}

export const GOALS: { id: Goal; name: string; icon: LucideIcon; desc: string }[] = [
  { id: "full", name: "Full Body", icon: Flame, desc: "Everything, head to toe" },
  { id: "upper", name: "Upper Body", icon: Dumbbell, desc: "Chest, back, arms, shoulders" },
  { id: "lower", name: "Lower Body", icon: Footprints, desc: "Quads, glutes, hamstrings" },
  { id: "core", name: "Core", icon: Target, desc: "Abs and midline" },
  { id: "cardio", name: "Cardio", icon: HeartPulse, desc: "Heart-pumping conditioning" },
];
