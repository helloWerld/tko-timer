"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronLeft, Play, RefreshCw, Shuffle } from "lucide-react";
import { GOALS } from "@/lib/formats";
import { formatClock } from "@/lib/time";
import { unlockAudio, unlockVoice } from "@/lib/audio";
import type { GeneratedWorkout, IntervalStep } from "@/lib/types";

export default function PreviewScreen({
  workout,
  onBack,
  onRegenerate,
  onSwapStep,
  onStart,
}: {
  workout: GeneratedWorkout;
  onBack: () => void;
  onRegenerate: () => void;
  /** Swap the single step at this global index for another random one. */
  onSwapStep: (stepIndex: number) => void;
  onStart: () => void;
}) {
  const { settings, format, steps, rounds, totalSeconds } = workout;
  const boxing = settings.mode === "boxing";
  const goal = GOALS.find((g) => g.id === settings.goal);

  // Group the main work steps by round for display. In boxing mode the active
  // recovery steps are shown too, so the interleave is visible.
  const byRound = new Map<number, IntervalStep[]>();
  for (const s of steps) {
    if (s.kind !== "work" && s.kind !== "recovery") continue;
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
          {boxing ? (
            "Boxing"
          ) : (
            <>
              {goal?.icon && <goal.icon className="h-7 w-7 text-accent" />}
              {goal?.name}
            </>
          )}
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
            items={warmupSteps}
            allSteps={steps}
            onSwapStep={onSwapStep}
          />
        )}

        {[...byRound.entries()].map(([round, list]) => (
          <div key={round}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">
              Round {round}
            </h3>
            <ol className="space-y-1.5">
              {list.map((s) => (
                <ExerciseItem
                  key={steps.indexOf(s)}
                  step={s}
                  accent={
                    s.kind === "recovery"
                      ? "text-[color:var(--warm-fg)]"
                      : "text-accent"
                  }
                  onSwap={() => onSwapStep(steps.indexOf(s))}
                />
              ))}
            </ol>
          </div>
        ))}

        {cooldownSteps.length > 0 && (
          <StretchSection
            title="Cool-Down"
            accent="text-[color:var(--cool-fg)]"
            items={cooldownSteps}
            allSteps={steps}
            onSwapStep={onSwapStep}
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
  items,
  allSteps,
  onSwapStep,
}: {
  title: string;
  accent: string;
  items: IntervalStep[];
  /** Full step list, so each card knows its global index for swapping. */
  allSteps: IntervalStep[];
  onSwapStep: (stepIndex: number) => void;
}) {
  return (
    <div>
      <h3
        className={`mb-2 text-xs font-bold uppercase tracking-wider ${accent}`}
      >
        {title}
      </h3>
      <ol className="space-y-1.5">
        {items.map((s) => (
          <ExerciseItem
            key={allSteps.indexOf(s)}
            step={s}
            accent={accent}
            onSwap={() => onSwapStep(allSteps.indexOf(s))}
          />
        ))}
      </ol>
    </div>
  );
}

/** Distance (px) a card must be dragged right before releasing swaps it. */
const SWAP_THRESHOLD = 80;

/**
 * A tappable exercise row that expands to show the how-to description. When
 * `onSwap` is provided the card can be dragged to the right and released to
 * swap it for another random pick (work / active-recovery cards only).
 */
function ExerciseItem({
  step,
  accent,
  onSwap,
}: {
  step: IntervalStep;
  accent: string;
  onSwap?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const moved = useRef(false);
  const ex = step.exercise;
  if (!ex) return null;

  const swipeable = Boolean(onSwap);
  const armed = dragX >= SWAP_THRESHOLD;
  const progress = Math.min(dragX / SWAP_THRESHOLD, 1);

  const setDrag = (px: number) => {
    dragXRef.current = px;
    setDragX(px);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipeable) return;
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    // Rightward only; a little resistance past the threshold.
    setDrag(dx <= 0 ? 0 : dx > SWAP_THRESHOLD ? SWAP_THRESHOLD + (dx - SWAP_THRESHOLD) * 0.35 : dx);
  };
  const endDrag = () => {
    if (startX.current == null) return;
    startX.current = null;
    setDragging(false);
    if (dragXRef.current >= SWAP_THRESHOLD) onSwap?.();
    setDrag(0);
  };

  return (
    <li className="relative overflow-hidden rounded-xl border border-ink/10 bg-ink/[0.03]">
      {/* Revealed behind the card as it slides right. */}
      {swipeable && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 pl-4 text-xs font-bold uppercase tracking-wider transition-colors ${
            armed ? "text-accent" : "text-ink/40"
          }`}
          style={{ opacity: progress }}
        >
          <RefreshCw className="h-4 w-4" />
          {armed ? "Release to swap" : "Swap"}
        </span>
      )}

      <div
        className={`relative rounded-xl bg-[color:var(--surface)] ${dragging ? "select-none" : ""}`}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
          // Let vertical scrolling through on touch; we own horizontal drags.
          touchAction: swipeable ? "pan-y" : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          onClick={() => {
            // A drag ended in a click event — don't also toggle the description.
            if (moved.current) {
              moved.current = false;
              return;
            }
            setOpen((v) => !v);
          }}
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
      </div>
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
