"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import {
  countdownCue,
  countdownVoice,
  finishCue,
  goCue,
  halfwayCue,
  halfwayVoice,
  longGoBeep,
  restCue,
  stretchCue,
  unlockAudio,
} from "@/lib/audio";
import { formatClock } from "@/lib/time";
import type { GeneratedWorkout, IntervalStep } from "@/lib/types";

const TICK_MS = 100;

export default function WorkoutScreen({
  workout,
  onExit,
  onComplete,
}: {
  workout: GeneratedWorkout;
  onExit: () => void;
  onComplete: () => void;
}) {
  const { steps, totalSeconds } = workout;
  const voice = workout.settings.soundMode === "voice";

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);
  const [running, setRunning] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const step = steps[stepIndex];

  // Timing refs (avoid stale closures inside the interval).
  const stepStartRef = useRef<number>(0);
  const prevCeilRef = useRef<number>(Math.ceil(steps[0]?.seconds ?? 0));
  const runningRef = useRef(true);
  const advancingRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  runningRef.current = running;

  const advance = useCallback(() => {
    advancingRef.current = true;
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= steps.length) {
        finishCue();
        // Defer so we don't setState during another component's render.
        setTimeout(onComplete, 350);
        return i;
      }
      return next;
    });
  }, [steps.length, onComplete]);

  // When the step changes: reset timers and play the entry cue.
  useEffect(() => {
    const s = steps[stepIndex];
    if (!s) return;
    stepStartRef.current = performance.now();
    prevCeilRef.current = Math.ceil(s.seconds);
    setRemaining(s.seconds);
    setShowHelp(false);
    advancingRef.current = false;
    if (s.kind === "work") {
      // Voice mode marks the set start with a long "go" beep; beep mode uses
      // the rising two-tone cue.
      if (voice) longGoBeep();
      else goCue();
    } else if (s.kind === "rest" || s.kind === "roundRest") restCue();
    else if (s.kind === "warmup" || s.kind === "cooldown") stretchCue();
  }, [stepIndex, steps, voice]);

  // Main countdown loop.
  useEffect(() => {
    const id = setInterval(() => {
      if (!runningRef.current || advancingRef.current) return;
      const s = steps[stepIndex];
      if (!s) return;
      const elapsed = (performance.now() - stepStartRef.current) / 1000;
      const rem = s.seconds - elapsed;

      if (rem <= 0) {
        setRemaining(0);
        advance();
        return;
      }
      setRemaining(rem);

      const ceil = Math.ceil(rem);
      if (ceil < prevCeilRef.current) {
        prevCeilRef.current = ceil;
        const half = Math.round(s.seconds / 2);

        if (voice) {
          if (s.kind === "work") {
            // Voice on work sets: "halfway there" at the midpoint, then "5,4,3,
            // 2,1" starting with exactly 5 seconds left.
            if (ceil === 5 && s.seconds >= 6) countdownVoice();
            else if (ceil <= 5 && ceil >= 1 && s.seconds < 6) countdownCue();
            if (ceil === half && half > 5) halfwayVoice();
          } else {
            // Non-work intervals stay on beeps: a 3-2-1 countdown into the set.
            if (ceil <= 3 && ceil >= 1) countdownCue();
          }
        } else {
          // Beep mode (unchanged): 5s countdown ticks everywhere, halfway beep
          // on work sets.
          if (ceil <= 5 && ceil >= 1) countdownCue();
          if (s.kind === "work" && ceil === half) halfwayCue();
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [stepIndex, steps, advance, voice]);

  // Keep the screen awake during the workout (best effort).
  useEffect(() => {
    const nav = navigator as any;
    const request = async () => {
      try {
        if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
      } catch {
        /* ignore */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      try {
        wakeLockRef.current?.release?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const togglePause = useCallback(() => {
    void unlockAudio();
    setRunning((r) => {
      const next = !r;
      if (next) {
        // Resuming: rebase the start time so `remaining` is preserved.
        const s = steps[stepIndex];
        if (s) stepStartRef.current = performance.now() - (s.seconds - remaining) * 1000;
      }
      return next;
    });
  }, [remaining, stepIndex, steps]);

  const skip = useCallback(() => advance(), [advance]);
  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!step) return null;

  // Overall progress.
  const elapsedBefore = steps
    .slice(0, stepIndex)
    .reduce((sum, s) => sum + s.seconds, 0);
  const elapsedTotal = elapsedBefore + (step.seconds - remaining);
  const overallPct = Math.min(100, (elapsedTotal / totalSeconds) * 100);

  const stepPct = step.seconds > 0 ? (remaining / step.seconds) * 100 : 0;
  const displaySeconds = Math.ceil(remaining - 0.0001) || 0;

  const theme = stepTheme(step);
  const nextUp = nextExercise(steps, stepIndex);

  return (
    <div
      className={`flex min-h-dvh flex-col bg-gradient-to-b ${theme.bg} transition-colors duration-500 -mx-5 -my-6 px-5 py-6`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          <X className="h-4 w-4" />
          Quit
        </button>
        <span className="text-sm font-semibold text-white/60">
          {step.kind === "warmup"
            ? "Warm-Up"
            : step.kind === "cooldown"
              ? "Cool-Down"
              : step.kind === "prep"
                ? "Get Ready"
                : `Round ${step.round} / ${workout.rounds}`}
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/80 transition-[width] duration-200 ease-linear"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Center stage */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p
          className={`mb-2 text-sm font-black uppercase tracking-[0.2em] ${theme.label}`}
        >
          {step.kind === "work"
            ? "Work"
            : step.kind === "warmup"
              ? "Warm-Up"
              : step.kind === "cooldown"
                ? "Cool-Down"
                : step.kind === "prep"
                  ? "Get Ready"
                  : step.kind === "roundRest"
                    ? "Round Rest"
                    : "Rest"}
        </p>

        {/* Timer ring */}
        <div className="relative my-2 flex h-64 w-64 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              className={theme.stroke}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={(1 - stepPct / 100) * 2 * Math.PI * 46}
              style={{ transition: "stroke-dashoffset 0.2s linear" }}
            />
          </svg>
          <span className="font-mono text-7xl font-black tabular-nums">
            {displaySeconds}
          </span>
        </div>

        {/* What to do */}
        <div className="mt-3 min-h-[64px] px-2">
          {step.exercise ? (
            <>
              <h2 className="text-3xl font-black leading-tight">
                {step.exercise.name}
              </h2>
              <p className="mt-1 text-sm text-white/60">{step.exercise.cue}</p>
              {step.exercise.description && (
                <button
                  onClick={() => setShowHelp(true)}
                  aria-label="How to do this exercise"
                  className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/70 transition hover:border-white/50 hover:text-white"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white/80">
                {step.kind === "prep" ? "First up…" : "Breathe"}
              </h2>
              {nextUp && (
                <p className="mt-1 text-sm text-white/55">
                  Next: <span className="font-bold text-white/80">{nextUp.name}</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pb-2">
        <CircleButton onClick={back} label="Previous">
          <SkipBack className="h-5 w-5 fill-current" />
        </CircleButton>
        <button
          onClick={togglePause}
          aria-label={running ? "Pause" : "Resume"}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
        >
          {running ? (
            <Pause className="h-8 w-8 fill-current" />
          ) : (
            <Play className="h-8 w-8 fill-current" />
          )}
        </button>
        <CircleButton onClick={skip} label="Skip">
          <SkipForward className="h-5 w-5 fill-current" />
        </CircleButton>
      </div>

      <p className="pb-1 text-center text-xs text-white/40">
        {formatClock(elapsedTotal)} / {formatClock(totalSeconds)}
      </p>

      {showHelp && step.exercise && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#16161d] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${theme.label}`}>
                  How to
                </p>
                <h3 className="mt-0.5 text-2xl font-black leading-tight">
                  {step.exercise.name}
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              {step.exercise.description ?? step.exercise.cue}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CircleButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl transition hover:bg-white/20 active:scale-95"
    >
      {children}
    </button>
  );
}

function stepTheme(step: IntervalStep) {
  if (step.kind === "work") {
    return {
      bg: "from-pink-900/40 via-[#0a0a0f] to-[#0a0a0f]",
      label: "text-pink-400",
      stroke: "text-pink-500",
    };
  }
  if (step.kind === "warmup") {
    return {
      bg: "from-amber-900/40 via-[#0a0a0f] to-[#0a0a0f]",
      label: "text-amber-300",
      stroke: "text-amber-400",
    };
  }
  if (step.kind === "cooldown") {
    return {
      bg: "from-indigo-900/40 via-[#0a0a0f] to-[#0a0a0f]",
      label: "text-indigo-300",
      stroke: "text-indigo-400",
    };
  }
  if (step.kind === "prep") {
    return {
      bg: "from-violet-900/40 via-[#0a0a0f] to-[#0a0a0f]",
      label: "text-violet-300",
      stroke: "text-violet-400",
    };
  }
  return {
    bg: "from-teal-900/40 via-[#0a0a0f] to-[#0a0a0f]",
    label: "text-teal-300",
    stroke: "text-teal-400",
  };
}

function nextExercise(steps: IntervalStep[], from: number) {
  for (let i = from + 1; i < steps.length; i++) {
    if (steps[i].exercise) return steps[i].exercise!;
  }
  return null;
}
