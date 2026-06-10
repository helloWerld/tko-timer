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
 */
export const BOXING_FORMATS: WorkoutFormat[] = [
  {
    id: "box-rounds",
    name: "Boxing Rounds",
    blurb: "30s combos with active recovery, rest between rounds.",
    baseWork: 30,
    baseRest: 15,
    exercisesPerRound: 5,
    baseRoundRest: 60,
  },
  {
    id: "box-speed",
    name: "Speed Bursts",
    blurb: "Sharp 20s combos, quick 10s recoveries.",
    baseWork: 20,
    baseRest: 10,
    exercisesPerRound: 6,
    baseRoundRest: 45,
  },
  {
    id: "box-technical",
    name: "Technical",
    blurb: "Longer 45s combos to drill clean technique.",
    baseWork: 45,
    baseRest: 20,
    exercisesPerRound: 4,
    baseRoundRest: 60,
  },
  {
    id: "box-conditioning",
    name: "Conditioning",
    blurb: "Continuous 40s work, short active recovery.",
    baseWork: 40,
    baseRest: 15,
    exercisesPerRound: 6,
    baseRoundRest: 50,
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
 * Intensity scales interval length: higher intensity = longer work, shorter
 * rest (so each second is harder). Returns rounded work/rest in seconds.
 */
export function scaledIntervals(
  format: WorkoutFormat,
  intensity: Intensity,
): { work: number; rest: number; roundRest: number } {
  const factor: Record<Intensity, { work: number; rest: number }> = {
    low: { work: 0.85, rest: 1.3 },
    medium: { work: 1.0, rest: 1.0 },
    high: { work: 1.2, rest: 0.7 },
  };
  const f = factor[intensity];
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
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
