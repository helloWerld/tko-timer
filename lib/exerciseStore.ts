import { EXERCISES } from "./exercises";
import type { Exercise } from "./types";

/**
 * Persists the user's exercise-library customizations in localStorage — no
 * backend required. We store only the *diff* from the built-in library:
 * which exercises are turned off, and any custom ones the user added.
 */
export const STORAGE_KEY = "pulsefit.exercises.v1";

export interface ExerciseStore {
  /** Ids (built-in or custom) the user has disabled. */
  disabledIds: string[];
  /** User-added exercises. */
  custom: Exercise[];
}

export const emptyStore: ExerciseStore = { disabledIds: [], custom: [] };

export function loadStore(): ExerciseStore {
  if (typeof window === "undefined") return emptyStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore;
    const parsed = JSON.parse(raw) as Partial<ExerciseStore>;
    return {
      disabledIds: Array.isArray(parsed.disabledIds) ? parsed.disabledIds : [],
      custom: Array.isArray(parsed.custom)
        ? parsed.custom.map((e) => ({ ...e, custom: true }))
        : [],
    };
  } catch {
    return emptyStore;
  }
}

export function saveStore(store: ExerciseStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

/** Built-ins + custom, in that order. */
export function allExercises(store: ExerciseStore): Exercise[] {
  return [...EXERCISES, ...store.custom];
}

export function isEnabled(store: ExerciseStore, id: string): boolean {
  return !store.disabledIds.includes(id);
}

/** Enabled exercises only — what the generator draws from. */
export function activeExercises(store: ExerciseStore): Exercise[] {
  const disabled = new Set(store.disabledIds);
  return allExercises(store).filter((e) => !disabled.has(e.id));
}

/** Stable-ish id for a new custom exercise. */
export function makeExerciseId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `custom-${slug || "exercise"}-${Date.now().toString(36)}`;
}
