"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import {
  countdownCue,
  countdownToRestVoice,
  countdownToWorkVoice,
  finishCue,
  getReadyVoice,
  getVolumes,
  goCue,
  halfwayCue,
  halfwayVoice,
  longGoBeep,
  pauseVoice,
  prepGoVoice,
  restCue,
  restEndVoice,
  resumeVoice,
  setBeepVolume,
  setVoiceVolume,
  stretchCue,
  testBeep,
  testVoice,
  unlockAudio,
} from "@/lib/audio";
import { formatClock } from "@/lib/time";
import type { GeneratedWorkout, IntervalStep } from "@/lib/types";
import VolumeSlider from "./VolumeSlider";

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
  const [showVolume, setShowVolume] = useState(false);
  const [beepVol, setBeepVol] = useState(1);
  const [voiceVol, setVoiceVol] = useState(1);

  // Sync the volume sliders with the persisted values on mount.
  useEffect(() => {
    const v = getVolumes();
    setBeepVol(v.beep);
    setVoiceVol(v.voice);
  }, []);

  const step = steps[stepIndex];

  // Timing refs (avoid stale closures inside the interval).
  const stepStartRef = useRef<number>(0);
  const prevCeilRef = useRef<number>(Math.ceil(steps[0]?.seconds ?? 0));
  const runningRef = useRef(true);
  const advancingRef = useRef(false);
  const wakeLockRef = useRef<any>(null);
  // One-shot voice cues that already fired this step (robust to skipped ticks).
  const firedRef = useRef<Set<string>>(new Set());

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
    firedRef.current.clear();
    if (s.kind === "work") {
      // Voice mode marks the set start with a long "go" beep; beep mode uses
      // the rising two-tone cue.
      if (voice) longGoBeep();
      else goCue();
    } else if (s.kind === "rest" || s.kind === "roundRest") restCue();
    else if (s.kind === "warmup" || s.kind === "cooldown") stretchCue();
    else if (s.kind === "prep" && voice) getReadyVoice();
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

        const nextKind = steps[stepIndex + 1]?.kind;

        if (voice) {
          // Voice one-shots fire once when the countdown CROSSES the threshold
          // (robust if a tick skips the exact second), plus the per-second
          // countdown beeps (5s on work / warm-up / cool-down, 3s on rest / prep).
          const fired = firedRef.current;
          const fireOnce = (k: string, fn: () => void) => {
            if (!fired.has(k)) {
              fired.add(k);
              fn();
            }
          };
          if (s.kind === "work") {
            if (half > 5 && ceil <= half) fireOnce("half", halfwayVoice);
            if (s.seconds >= 6 && ceil <= 5) {
              fireOnce("count", nextKind === "work" ? countdownToWorkVoice : countdownToRestVoice);
            }
            if (ceil <= 5 && ceil >= 1) countdownCue();
          } else if (s.kind === "warmup" || s.kind === "cooldown") {
            // Same as work: "halfway there" + the 5s countdown clip.
            if (half > 5 && ceil <= half) fireOnce("half", halfwayVoice);
            if (s.seconds >= 6 && ceil <= 5) fireOnce("count", countdownToWorkVoice);
            if (ceil <= 5 && ceil >= 1) countdownCue();
          } else if (s.kind === "rest" || s.kind === "roundRest") {
            if (s.seconds >= 4 && ceil <= 3) fireOnce("count", restEndVoice);
            if (ceil <= 3 && ceil >= 1) countdownCue();
          } else if (s.kind === "prep") {
            if (s.seconds >= 4 && ceil <= 3) fireOnce("count", prepGoVoice);
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
    const next = !runningRef.current;
    if (next) {
      // Resuming: rebase the start time so `remaining` is preserved, then replay
      // whatever voice cue the pause cut off.
      const s = steps[stepIndex];
      if (s) stepStartRef.current = performance.now() - (s.seconds - remaining) * 1000;
      resumeVoice();
    } else {
      // Pausing: stop the clock and cut off any in-progress voice cue.
      pauseVoice();
    }
    setRunning(next);
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
  const upNext = nextStepLabel(steps, stepIndex);

  return (
    <div
      className={`flex min-h-dvh flex-col bg-gradient-to-b ${theme.bg} transition-colors duration-500 -mx-5 -my-6 px-5 py-6`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm font-semibold text-ink/60 transition hover:text-ink"
        >
          <X className="h-4 w-4" />
          Quit
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink/60">
            {step.kind === "warmup"
              ? "Warm-Up"
              : step.kind === "cooldown"
                ? "Cool-Down"
                : step.kind === "prep"
                  ? "Get Ready"
                  : `Round ${step.round} / ${workout.rounds}`}
          </span>
          <button
            onClick={() => setShowVolume(true)}
            aria-label="Volume"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink/70 transition hover:border-ink/40 hover:text-ink"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-ink/80 transition-[width] duration-200 ease-linear"
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
              stroke="rgb(var(--ink-rgb) / 0.12)"
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
              <p className="mt-1 text-sm text-ink/60">{step.exercise.cue}</p>
              {step.exercise.description && (
                <button
                  onClick={() => setShowHelp(true)}
                  aria-label="How to do this exercise"
                  className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-ink/70 transition hover:border-ink/50 hover:text-ink"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            <h2 className="text-2xl font-bold text-ink/80">
              {step.kind === "prep" ? "First up…" : "Breathe"}
            </h2>
          )}
        </div>
      </div>

      {/* Up next — directly above the controls */}
      <p className="mb-3 text-center text-sm text-ink/45">
        Up next: <span className="font-bold text-ink/75">{upNext}</span>
      </p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pb-2">
        <CircleButton onClick={back} label="Previous">
          <SkipBack className="h-5 w-5 fill-current" />
        </CircleButton>
        <button
          onClick={togglePause}
          aria-label={running ? "Pause" : "Resume"}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-ink text-[color:var(--bg)] shadow-lg transition active:scale-95"
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

      <p className="pb-1 text-center text-xs text-ink/40">
        {formatClock(elapsedTotal)} / {formatClock(totalSeconds)}
      </p>

      {showHelp && step.exercise && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-ink/15 bg-[color:var(--surface)] p-5 shadow-2xl"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition hover:border-ink/40 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-base leading-relaxed text-ink/75">
              {step.exercise.description ?? step.exercise.cue}
            </p>
          </div>
        </div>
      )}

      {showVolume && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShowVolume(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-ink/15 bg-[color:var(--surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-black">Volume</h3>
              <button
                onClick={() => setShowVolume(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition hover:border-ink/40 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <VolumeSlider
                label="Beep volume"
                value={beepVol}
                onChange={(v) => {
                  setBeepVol(v);
                  setBeepVolume(v);
                }}
                onTest={() => testBeep()}
              />
              {voice && (
                <VolumeSlider
                  label="Voice volume"
                  value={voiceVol}
                  onChange={(v) => {
                    setVoiceVol(v);
                    setVoiceVolume(v);
                  }}
                  onTest={() => testVoice()}
                />
              )}
            </div>
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
      className="flex h-14 w-14 items-center justify-center rounded-full border border-ink/20 bg-ink/10 text-xl transition hover:bg-ink/20 active:scale-95"
    >
      {children}
    </button>
  );
}

// Per-step tint + foreground. Colors come from CSS variables (--<kind>-bg/-fg)
// so each theme supplies its own readable palette; the gradient fades into the
// page background (--bg) in both themes. NOTE: these must be complete literal
// class strings — Tailwind's JIT can't see classes built from template parts.
function stepTheme(step: IntervalStep) {
  if (step.kind === "work") {
    return {
      bg: "from-[var(--work-bg)] via-[color:var(--bg)] to-[color:var(--bg)]",
      label: "text-[color:var(--work-fg)]",
      stroke: "text-[color:var(--work-fg)]",
    };
  }
  if (step.kind === "warmup") {
    return {
      bg: "from-[var(--warm-bg)] via-[color:var(--bg)] to-[color:var(--bg)]",
      label: "text-[color:var(--warm-fg)]",
      stroke: "text-[color:var(--warm-fg)]",
    };
  }
  if (step.kind === "cooldown") {
    return {
      bg: "from-[var(--cool-bg)] via-[color:var(--bg)] to-[color:var(--bg)]",
      label: "text-[color:var(--cool-fg)]",
      stroke: "text-[color:var(--cool-fg)]",
    };
  }
  if (step.kind === "prep") {
    return {
      bg: "from-[var(--prep-bg)] via-[color:var(--bg)] to-[color:var(--bg)]",
      label: "text-[color:var(--prep-fg)]",
      stroke: "text-[color:var(--prep-fg)]",
    };
  }
  return {
    bg: "from-[var(--rest-bg)] via-[color:var(--bg)] to-[color:var(--bg)]",
    label: "text-[color:var(--rest-fg)]",
    stroke: "text-[color:var(--rest-fg)]",
  };
}

/** Human-readable label for the step immediately after `from`. */
function nextStepLabel(steps: IntervalStep[], from: number): string {
  const next = steps[from + 1];
  if (!next) return "Finish";
  if (next.exercise) return next.exercise.name;
  if (next.kind === "rest") return "Rest";
  if (next.kind === "roundRest") return "Round Rest";
  if (next.kind === "prep") return "Get Ready";
  return "Finish";
}
