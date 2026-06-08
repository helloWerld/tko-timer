"use client";

import { useCallback, useEffect, useState } from "react";
import LockScreen from "@/components/LockScreen";
import BuilderScreen from "@/components/BuilderScreen";
import PreviewScreen from "@/components/PreviewScreen";
import WorkoutScreen from "@/components/WorkoutScreen";
import CompleteScreen from "@/components/CompleteScreen";
import SettingsScreen from "@/components/SettingsScreen";
import { generateWorkout } from "@/lib/generateWorkout";
import { activeExercises } from "@/lib/exerciseStore";
import { useExerciseStore } from "@/lib/useExerciseStore";
import type { GeneratedWorkout, WorkoutSettings } from "@/lib/types";

type Phase = "build" | "preview" | "run" | "done" | "settings";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("build");
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const { store, toggle, addExercise, removeCustom } = useExerciseStore();

  // Ask the server whether this browser already holds a valid unlock cookie, so
  // we don't re-prompt on every reload. The cookie is httpOnly, so the check
  // has to round-trip to the server.
  useEffect(() => {
    let active = true;
    fetch("/api/unlock")
      .then((r) => r.json())
      .then((d) => {
        if (active) setUnlocked(Boolean(d?.unlocked));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUnlock = useCallback(() => setUnlocked(true), []);

  const handleBuild = useCallback(
    (settings: WorkoutSettings) => {
      setWorkout(generateWorkout(settings, activeExercises(store)));
      setPhase("preview");
    },
    [store],
  );

  const handleRegenerate = useCallback(() => {
    setWorkout((w) =>
      w ? generateWorkout(w.settings, activeExercises(store)) : w,
    );
  }, [store]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6">
      {!checking && !unlocked && <LockScreen onUnlock={handleUnlock} />}

      {unlocked && phase === "build" && (
        <BuilderScreen
          onBuild={handleBuild}
          onOpenSettings={() => setPhase("settings")}
          initial={workout?.settings}
        />
      )}

      {unlocked && phase === "settings" && (
        <SettingsScreen
          store={store}
          onToggle={toggle}
          onAdd={addExercise}
          onRemove={removeCustom}
          onBack={() => setPhase("build")}
        />
      )}

      {unlocked && phase === "preview" && workout && (
        <PreviewScreen
          workout={workout}
          onBack={() => setPhase("build")}
          onRegenerate={handleRegenerate}
          onStart={() => setPhase("run")}
        />
      )}

      {unlocked && phase === "run" && workout && (
        <WorkoutScreen
          workout={workout}
          onExit={() => setPhase("preview")}
          onComplete={() => setPhase("done")}
        />
      )}

      {unlocked && phase === "done" && workout && (
        <CompleteScreen
          workout={workout}
          onRestart={() => setPhase("run")}
          onNew={() => setPhase("build")}
        />
      )}
    </main>
  );
}
