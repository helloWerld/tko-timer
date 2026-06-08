"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ExerciseStore,
  emptyStore,
  loadStore,
  saveStore,
} from "./exerciseStore";
import type { Exercise } from "./types";

export function useExerciseStore() {
  const [store, setStore] = useState<ExerciseStore>(emptyStore);
  const [loaded, setLoaded] = useState(false);

  // Load once on mount (client only) to avoid SSR hydration mismatch.
  useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  // Persist whenever the store changes (after the initial load).
  useEffect(() => {
    if (loaded) saveStore(store);
  }, [store, loaded]);

  const toggle = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      disabledIds: s.disabledIds.includes(id)
        ? s.disabledIds.filter((x) => x !== id)
        : [...s.disabledIds, id],
    }));
  }, []);

  const addExercise = useCallback((ex: Exercise) => {
    setStore((s) => ({ ...s, custom: [...s.custom, { ...ex, custom: true }] }));
  }, []);

  const removeCustom = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      custom: s.custom.filter((e) => e.id !== id),
      disabledIds: s.disabledIds.filter((x) => x !== id),
    }));
  }, []);

  return { store, loaded, toggle, addExercise, removeCustom };
}
