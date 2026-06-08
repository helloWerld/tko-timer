"use client";

import { useCallback, useState } from "react";
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
  const { store, toggle, addExercise, removeCustom } = useExerciseStore();

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
      {phase === "build" && (
        <BuilderScreen
          onBuild={handleBuild}
          onOpenSettings={() => setPhase("settings")}
          initial={workout?.settings}
        />
      )}

      {phase === "settings" && (
        <SettingsScreen
          store={store}
          onToggle={toggle}
          onAdd={addExercise}
          onRemove={removeCustom}
          onBack={() => setPhase("build")}
        />
      )}

      {phase === "preview" && workout && (
        <PreviewScreen
          workout={workout}
          onBack={() => setPhase("build")}
          onRegenerate={handleRegenerate}
          onStart={() => setPhase("run")}
        />
      )}

      {phase === "run" && workout && (
        <WorkoutScreen
          workout={workout}
          onExit={() => setPhase("preview")}
          onComplete={() => setPhase("done")}
        />
      )}

      {phase === "done" && workout && (
        <CompleteScreen
          workout={workout}
          onRestart={() => setPhase("run")}
          onNew={() => setPhase("build")}
        />
      )}
    </main>
  );
}
