"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, Play, Shuffle } from "lucide-react";
import { GOALS } from "@/lib/formats";
import { formatClock } from "@/lib/time";
import { unlockAudio, unlockVoice } from "@/lib/audio";
import type { GeneratedWorkout, IntervalStep } from "@/lib/types";

export default function PreviewScreen({
  workout,
  onBack,
  onRegenerate,
  onStart,
}: {
  workout: GeneratedWorkout;
  onBack: () => void;
  onRegenerate: () => void;
  onStart: () => void;
}) {
  const { settings, format, steps, rounds, totalSeconds } = workout;
  const goal = GOALS.find((g) => g.id === settings.goal);

  // Group the main work steps by round for display.
  const byRound = new Map<number, IntervalStep[]>();
  for (const s of steps) {
    if (s.kind !== "work") continue;
    const list = byRound.get(s.round) ?? [];
    list.push(s);
    byRound.set(s.round, list);
  }

  const warmupSteps = steps.filter((s) => s.kind === "warmup");
  const cooldownSteps = steps.filter((s) => s.kind === "cooldown");

  return (
    <div className="flex min-h-dvh flex-col gap-5 pb-4 animate-slide-up">
      <header className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-ink/50 transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-ink/40"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Shuffle
        </button>
      </header>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          {format.name}
        </p>
        <h1 className="flex items-center gap-2 text-3xl font-black">
          {goal?.icon && <goal.icon className="h-7 w-7 text-accent" />}
          {goal?.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label="Time" value={formatClock(totalSeconds)} />
          <Stat label="Rounds" value={String(rounds)} />
          <Stat label="Level" value={cap(settings.difficulty)} />
          <Stat label="Intensity" value={cap(settings.intensity)} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {warmupSteps.length > 0 && (
          <StretchSection
            title="Warm-Up"
            accent="text-gold"
            steps={warmupSteps}
          />
        )}

        {[...byRound.entries()].map(([round, list]) => (
          <div key={round}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">
              Round {round}
            </h3>
            <ol className="space-y-1.5">
              {list
                .filter((s) => s.kind === "work")
                .map((s, i) => (
                  <ExerciseItem
                    key={i}
                    step={s}
                    accent="text-accent"
                  />
                ))}
            </ol>
          </div>
        ))}

        {cooldownSteps.length > 0 && (
          <StretchSection
            title="Cool-Down"
            accent="text-[color:var(--cool-fg)]"
            steps={cooldownSteps}
          />
        )}
      </div>

      <button
        onClick={() => {
          // Unlock audio inside the user gesture so beeps + voice clips play.
          void unlockAudio();
          unlockVoice();
          onStart();
        }}
        className="sticky bottom-4 flex items-center justify-center gap-2 rounded-2xl brand-bg py-4 text-lg font-black shadow-lg shadow-accent/20 transition active:scale-[0.99]"
      >
        Start Workout
        <Play className="h-5 w-5 fill-current" />
      </button>
    </div>
  );
}

function StretchSection({
  title,
  accent,
  steps,
}: {
  title: string;
  accent: string;
  steps: IntervalStep[];
}) {
  return (
    <div>
      <h3
        className={`mb-2 text-xs font-bold uppercase tracking-wider ${accent}`}
      >
        {title}
      </h3>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <ExerciseItem key={i} step={s} accent={accent} />
        ))}
      </ol>
    </div>
  );
}

/** A tappable exercise row that expands to show the how-to description. */
function ExerciseItem({
  step,
  accent,
}: {
  step: IntervalStep;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const ex = step.exercise;
  if (!ex) return null;

  return (
    <li className="rounded-xl border border-ink/10 bg-ink/[0.03]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block font-bold">{ex.name}</span>
          <span className="block text-xs text-ink/40">{ex.cue}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {ex.description && (
            <ChevronDown
              className={`h-4 w-4 text-ink/30 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          )}
          <span className={`font-mono text-sm font-bold ${accent}`}>
            {step.seconds}s
          </span>
        </span>
      </button>
      {open && ex.description && (
        <p className="border-t border-ink/5 px-4 py-2.5 text-sm leading-relaxed text-ink/60">
          {ex.description}
        </p>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2">
      <span className="block text-[10px] uppercase tracking-wider text-ink/40">
        {label}
      </span>
      <span className="block font-bold">{value}</span>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
