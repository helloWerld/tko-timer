export type Goal = "full" | "upper" | "lower" | "core" | "cardio";

export type WorkoutMode = "strength" | "boxing";

/** Boxing only — what fills the short gaps between combos. */
export type RecoveryStyle = "active" | "rest";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Intensity = "low" | "medium" | "high";

export type SoundMode = "voice" | "beep";

export type IntervalKind =
  | "prep"
  | "warmup"
  | "work"
  | "rest"
  | "recovery"
  | "roundRest"
  | "cooldown";

export interface Exercise {
  id: string;
  name: string;
  /** Goals this exercise contributes to. */
  goals: Goal[];
  difficulty: Difficulty;
  /** Short coaching cue shown under the exercise name. */
  cue: string;
  /** Longer how-to description, shown when you tap an exercise for details. */
  description?: string;
  /** True for user-added exercises stored in localStorage (vs. built-ins). */
  custom?: boolean;
}

export interface WorkoutFormat {
  id: string;
  name: string;
  blurb: string;
  /** Base work duration in seconds (before intensity scaling). */
  baseWork: number;
  /** Base rest duration in seconds (before intensity scaling). */
  baseRest: number;
  /** Exercises per round. */
  exercisesPerRound: number;
  /** Rest between rounds in seconds (0 = none). */
  baseRoundRest: number;
  /**
   * Boxing only — when true the same set of combos repeats every round
   * (interval-style) instead of drawing fresh combos each round.
   */
  repeat?: boolean;
}

/** A single timeline entry the timer counts through. */
export interface IntervalStep {
  kind: IntervalKind;
  /** Duration in seconds. */
  seconds: number;
  /** Exercise shown during this step (work steps only). */
  exercise?: Exercise;
  /** 1-based round number this step belongs to. */
  round: number;
  /** Label for non-work steps, e.g. "Get Ready", "Rest". */
  label?: string;
}

export interface WorkoutSettings {
  /** Strength/conditioning workout vs. boxing combos. */
  mode: WorkoutMode;
  goal: Goal;
  formatId: string;
  difficulty: Difficulty;
  intensity: Intensity;
  /** Target total duration in minutes. */
  targetMinutes: number;
  /** Spoken voice cues vs. synthesized beeps. */
  soundMode: SoundMode;
  /** Include a dynamic warm-up section before the main work. */
  includeWarmup: boolean;
  /** Include a static cool-down stretch section after the main work. */
  includeCooldown: boolean;
  /** Boxing only — allow combos with slips/blocks. */
  includeSlips: boolean;
  /** Boxing only — allow combos with ducks. */
  includeDucks: boolean;
  /** Boxing only — allow combos with footwork (pivots/steps). */
  includeFootwork: boolean;
  /** Boxing only — active recovery moves vs. plain rest between combos. */
  recoveryStyle: RecoveryStyle;
}

export interface GeneratedWorkout {
  settings: WorkoutSettings;
  format: WorkoutFormat;
  steps: IntervalStep[];
  rounds: number;
  /** Total duration in seconds (sum of all steps). */
  totalSeconds: number;
  /** Distinct exercises used, in order of first appearance. */
  exercises: Exercise[];
}
