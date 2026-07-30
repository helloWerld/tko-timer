"use client";

/**
 * Jabster Combo Trainer — a standalone section, fully separate from the timer.
 *
 * 309 "reels": each is a progressive ladder of combos (1 move → 5 moves).
 * Home screen filters by starting punch + style. Every reel opens on a START
 * overlay with an adjustable get-ready countdown (time to glove up and set
 * your stance) before the first combo shows/speaks.
 *
 * Two modes:
 *  - manual (tap a reel card): tap/auto through the ladder, finish banner.
 *  - cycle  (RANDOM REEL): auto-play is on and finishing a reel rolls
 *    straight into a new random reel after a short adjustable countdown —
 *    no finish screen — until STOP is pressed. Built for recording several
 *    reels back to back.
 *
 * Styling follows the Jabster style guide: cream #F2ECD8, navy #1E3A4C,
 * glove red #C13127, Anton for big numbers, Barlow SemiCondensed for subtext.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { COMBO_REELS, COMBO_STYLES, type ComboReel } from "@/lib/comboReels";
import {
  preloadComboClips,
  speakCombo,
  speakReelComplete,
  stopComboSpeech,
  unlockComboAudio,
} from "@/lib/comboAudio";

const CREAM = "#F2ECD8";
const NAVY = "#1E3A4C";
const RED = "#C13127";
const CARD = "#FAF6E7";
const SHADOW = "0 4px 14px rgba(15, 25, 35, 0.27)";

// Slips and ducks show as compact notation (SL/SR/DL/DR); the voice still
// says the full "Slip left" etc. Blocks stay spelled out.
const DEFENSE_LABELS: Record<string, string> = {
  slipL: "SL",
  slipR: "SR",
  blockL: "BLOCK LEFT",
  blockR: "BLOCK RIGHT",
  duckL: "DL",
  duckR: "DR",
};
const DEFENSE = new Set(Object.keys(DEFENSE_LABELS));

// Adjustable timings (seconds), persisted per device.
const START = { key: "combo-trainer-start", def: 15, min: 5, max: 60, step: 5 };
const BETWEEN = { key: "combo-trainer-between", def: 8, min: 3, max: 20, step: 1 };

type Mode = "manual" | "cycle";
/** ready = START overlay · countdown = get-ready timer · between = short
 * timer before the next random reel · run = drilling combos. */
type Phase = "ready" | "countdown" | "between" | "run";

const anton = { fontFamily: "var(--font-anton)" } as const;
const barlow = { fontFamily: "var(--font-barlow)" } as const;

function reelTokens(reel: ComboReel): string[] {
  return [...new Set(reel.combos.flatMap((c) => c.split("-")))];
}

function usePersistedSeconds(cfg: {
  key: string;
  def: number;
  min: number;
  max: number;
  step: number;
}) {
  const [value, setValue] = useState(cfg.def);
  useEffect(() => {
    const saved = Number(localStorage.getItem(cfg.key));
    if (saved >= cfg.min && saved <= cfg.max) setValue(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const change = (dir: number) =>
    setValue((v) => {
      const next = Math.min(cfg.max, Math.max(cfg.min, v + dir * cfg.step));
      localStorage.setItem(cfg.key, String(next));
      return next;
    });
  return [value, change] as const;
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (dir: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className="text-xs uppercase tracking-widest opacity-60"
        style={anton}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(-1)}
        className="h-9 w-9 rounded-full border-2 text-xl leading-none"
        style={{ ...anton, borderColor: NAVY, color: NAVY }}
        aria-label={`Shorter ${label.toLowerCase()}`}
      >
        −
      </button>
      <span className="w-10 text-center text-xl" style={anton}>
        {value}s
      </span>
      <button
        onClick={() => onChange(1)}
        className="h-9 w-9 rounded-full border-2 text-xl leading-none"
        style={{ ...anton, borderColor: NAVY, color: NAVY }}
        aria-label={`Longer ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}

/** One combo as inline tokens: numbers navy, body + defense pop red. */
function ComboLine({ combo, dim }: { combo: string; dim?: boolean }) {
  const tokens = combo.split("-");
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i}>
          {i > 0 && (
            <span style={{ color: NAVY, opacity: 0.35 }}>{" · "}</span>
          )}
          {DEFENSE.has(tok) ? (
            <span style={{ color: dim ? NAVY : RED, whiteSpace: "nowrap" }}>
              {DEFENSE_LABELS[tok]}
            </span>
          ) : tok.endsWith("b") ? (
            <span style={{ color: dim ? NAVY : RED }}>
              {tok.slice(0, -1)}B
            </span>
          ) : (
            <span style={{ color: NAVY }}>{tok}</span>
          )}
        </span>
      ))}
    </>
  );
}

export default function ComboTrainer() {
  const [starterFilter, setStarterFilter] = useState(0); // 0 = all
  const [styleFilter, setStyleFilter] = useState("All");
  const [reel, setReel] = useState<ComboReel | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoOn, setAutoOn] = useState(false);

  const [startGap, changeStartGap] = usePersistedSeconds(START);
  const [betweenGap, changeBetweenGap] = usePersistedSeconds(BETWEEN);

  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const matches = COMBO_REELS.filter(
    (r) =>
      (starterFilter === 0 || r.starter === starterFilter) &&
      (styleFilter === "All" || r.style === styleFilter),
  );

  // ---------- wake lock ----------
  const requestWake = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && reel) void requestWake();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reel, requestWake]);

  // ---------- flow ----------
  const startReel = (r: ComboReel, m: Mode) => {
    unlockComboAudio();
    preloadComboClips(reelTokens(r));
    setMode(m);
    setReel(r);
    setIdx(0);
    setDone(false);
    setPhase("ready");
    setAutoOn(m === "cycle"); // random cycling auto-plays by default
    void requestWake();
  };

  const pressStart = () => {
    unlockComboAudio();
    setCount(startGap);
    setPhase("countdown");
    void requestWake();
  };

  const randomFrom = (pool: ComboReel[]) =>
    pool[Math.floor(Math.random() * pool.length)];

  // The auto-advance timer can fire twice for the same combo (dev double
  // effects, stray double taps), so the end-of-reel transition must only run
  // once per reel. Reset whenever a reel is actually running again.
  const endGuard = useRef(false);
  useEffect(() => {
    if (phase === "run") endGuard.current = false;
  }, [phase]);

  /** End of reel: cycle mode rolls into another random reel after a short
   * countdown; manual mode shows the finish banner. */
  const finishReel = useCallback(() => {
    if (endGuard.current) return;
    endGuard.current = true;
    if (mode === "cycle") {
      const pool = matches.filter((r) => r.id !== reel?.id);
      const next = randomFrom(pool.length ? pool : matches);
      if (!next) return;
      preloadComboClips(reelTokens(next));
      setReel(next);
      setIdx(0);
      setDone(false);
      setCount(betweenGap);
      setPhase("between");
    } else {
      setDone(true);
      setAutoOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, matches, reel, betweenGap]);

  const stopCycling = () => {
    setMode("manual");
    setAutoOn(false);
    if (phase === "between") setPhase("run"); // show the queued reel, paused
  };

  const exitReel = () => {
    stopComboSpeech();
    setAutoOn(false);
    setReel(null);
    setDone(false);
    setPhase("ready");
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  };

  // Countdown tick (both the get-ready timer and the between-reels timer).
  useEffect(() => {
    if (phase !== "countdown" && phase !== "between") return;
    if (count <= 0) {
      setPhase("run");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Speak the current combo, then auto-advance. The wait starts only after
  // the voice cue has fully finished (cues must never get cut off) and lasts
  // 1 second per move in the combo — a 1-punch combo gets cue + 1s, a 5-move
  // combo gets cue + 5s of drill time.
  useEffect(() => {
    if (!reel || done || phase !== "run") return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    const moves = reel.combos[idx].split("-").length;
    const arm = (cueSeconds: number) => {
      if (cancelled || !autoOn) return;
      t = setTimeout(
        () => {
          if (idx < reel.combos.length - 1) setIdx(idx + 1);
          else finishReel();
        },
        (cueSeconds + moves) * 1000,
      );
    };
    if (voiceOn) void speakCombo(reel.combos[idx]).then(arm);
    else arm(0);
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel, idx, autoOn, done, phase]);

  useEffect(() => {
    if (done) {
      stopComboSpeech();
      if (voiceOn) speakReelComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const next = () => {
    if (!reel) return;
    if (idx < reel.combos.length - 1) setIdx(idx + 1);
    else finishReel();
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const onStackTap = (e: React.MouseEvent) => {
    unlockComboAudio();
    if (e.clientX < window.innerWidth * 0.22) prev();
    else next();
  };

  // Current-combo font size: scale to the rendered text length so short
  // combos go huge and directional-defense combos still fit on one line.
  const currentSize = (combo: string) => {
    const chars = combo
      .split("-")
      .map((t) => DEFENSE_LABELS[t] ?? t)
      .join(" · ").length;
    const vw = Math.min(200 / chars, 26);
    return `min(${vw.toFixed(1)}vw, 150px)`;
  };

  // ================= HOME =================
  if (!reel) {
    return (
      <div
        className="min-h-dvh overflow-y-auto px-4 pb-12 pt-6"
        style={{ background: CREAM, color: NAVY, ...barlow }}
      >
        <div className="mx-auto max-w-md">
          <div
            className="inline-block rounded-full px-3 py-1 text-sm uppercase tracking-widest"
            style={{ background: RED, color: CREAM, ...anton }}
          >
            Jabster
          </div>
          <h1
            className="mt-2 text-4xl uppercase leading-none"
            style={{ color: NAVY, ...anton }}
          >
            Combo <span style={{ color: RED }}>Trainer</span>
          </h1>
          <p className="mt-1 text-base font-semibold opacity-70">
            {COMBO_REELS.length} reels · tap a reel or hit random
          </p>

          <div
            className="mt-5 text-xs uppercase tracking-widest opacity-60"
            style={anton}
          >
            Starting punch
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["All", 1, 2, 3, 4, 5, 6].map((v) => {
              const val = v === "All" ? 0 : (v as number);
              const on = starterFilter === val;
              return (
                <button
                  key={v}
                  onClick={() => setStarterFilter(val)}
                  className="min-w-12 rounded-full border-2 px-4 py-2 text-lg"
                  style={{
                    ...anton,
                    background: on ? RED : CARD,
                    borderColor: on ? RED : NAVY,
                    color: on ? CREAM : NAVY,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 text-xs uppercase tracking-widest opacity-60"
            style={anton}
          >
            Style
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["All", ...COMBO_STYLES].map((v) => {
              const on = styleFilter === v;
              return (
                <button
                  key={v}
                  onClick={() => setStyleFilter(v)}
                  className="rounded-full border-2 px-4 py-2 text-lg"
                  style={{
                    ...anton,
                    background: on ? RED : CARD,
                    borderColor: on ? RED : NAVY,
                    color: on ? CREAM : NAVY,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (matches.length) startReel(randomFrom(matches), "cycle");
            }}
            className="mt-6 w-full rounded-2xl py-5 text-2xl uppercase tracking-wide"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            🎲 Random reels
          </button>
          <p className="mt-2 text-center text-sm font-semibold opacity-55">
            Auto-plays and keeps rolling new reels until you stop it
          </p>

          <div className="mt-4 text-sm font-semibold opacity-60">
            {matches.length} reels match
          </div>
          <div className="mt-2 space-y-2.5">
            {matches.map((r) => (
              <button
                key={r.id}
                onClick={() => startReel(r, "manual")}
                className="block w-full rounded-2xl border p-4 text-left"
                style={{
                  background: CARD,
                  borderColor: "rgba(30, 58, 76, 0.25)",
                  boxShadow: SHADOW,
                }}
              >
                <span className="text-xl" style={{ ...anton, color: RED }}>
                  {r.id}
                </span>
                <span className="ml-2 text-sm font-semibold opacity-60">
                  starts with {r.starter} · {r.style} · {r.combos.length} combos
                </span>
                <div className="mt-1.5 text-[15px] font-semibold leading-relaxed opacity-90">
                  {r.combos.join("   |   ")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= TRAINER =================
  const reelTag = `${reel.id} · ${reel.style}`;
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ background: CREAM, color: NAVY, ...barlow }}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={exitReel}
          className="px-1 py-2 text-lg"
          style={{ ...anton, color: RED }}
        >
          ❮ Reels
        </button>
        <div className="text-lg uppercase" style={anton}>
          {reelTag}
        </div>
        <div className="w-16" />
      </div>

      {/* progress dots */}
      <div className="flex justify-center gap-1.5 pb-1 pt-2">
        {reel.combos.map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full transition-transform"
            style={{
              background:
                i === idx ? RED : i < idx ? NAVY : "rgba(30, 58, 76, 0.22)",
              transform: i === idx ? "scale(1.35)" : undefined,
            }}
          />
        ))}
      </div>

      {/* stacked combo ladder — the whole reel stays centered on screen; only
          the current line grows. Tap right to advance, left edge to go back */}
      <div
        onClick={onStackTap}
        className="relative flex flex-1 cursor-pointer flex-col justify-center overflow-hidden pb-6"
      >
        {reel.combos.map((c, i) => {
          const current = i === idx;
          return (
            <div
              key={i}
              className="px-3 text-center leading-tight transition-all duration-300"
              style={{
                ...anton,
                fontSize: current
                  ? currentSize(c)
                  : c
                        .split("-")
                        .some((t) => (DEFENSE_LABELS[t] ?? t).length > 4)
                    ? "min(4.4vw, 21px)"
                    : "min(5.5vw, 26px)",
                opacity: current ? 1 : 0.28,
                paddingTop: current ? 8 : 3,
                paddingBottom: current ? 8 : 3,
              }}
            >
              <ComboLine combo={c} dim={!current} />
            </div>
          );
        })}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-sm font-semibold"
          style={{ color: "rgba(30, 58, 76, 0.4)" }}
        >
          Combo {idx + 1} of {reel.combos.length} · tap to advance · left edge
          goes back
        </div>
      </div>

      {/* controls */}
      <div
        className="flex gap-2.5 px-4 pt-2"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => {
            unlockComboAudio();
            const on = !voiceOn;
            setVoiceOn(on);
            if (!on) stopComboSpeech();
            else if (phase === "run") speakCombo(reel.combos[idx]);
          }}
          className="flex-1 rounded-2xl border-2 py-4 text-lg"
          style={{
            ...anton,
            background: voiceOn ? NAVY : CARD,
            borderColor: NAVY,
            color: voiceOn ? CREAM : NAVY,
          }}
        >
          {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
        </button>
        {mode === "cycle" ? (
          <button
            onClick={stopCycling}
            className="flex-1 rounded-2xl border-2 py-4 text-lg"
            style={{ ...anton, background: RED, borderColor: RED, color: CREAM }}
          >
            ■ Stop
          </button>
        ) : (
          <button
            onClick={() => {
              unlockComboAudio();
              setAutoOn(!autoOn);
            }}
            className="flex-1 rounded-2xl border-2 py-4 text-lg"
            style={{
              ...anton,
              background: autoOn ? RED : CARD,
              borderColor: autoOn ? RED : NAVY,
              color: autoOn ? CREAM : NAVY,
            }}
          >
            {autoOn ? "❚❚ Auto on" : "▶ Auto"}
          </button>
        )}
        <button
          onClick={() => {
            unlockComboAudio();
            speakCombo(reel.combos[idx]);
          }}
          className="flex-1 rounded-2xl border-2 py-4 text-lg"
          style={{ ...anton, background: CARD, borderColor: NAVY, color: NAVY }}
        >
          ↻ Say it
        </button>
      </div>

      {/* START overlay — glove-up time before anything plays */}
      {phase === "ready" && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-8"
          style={{ background: "rgba(242, 236, 216, 0.97)" }}
        >
          <div
            className="text-4xl uppercase"
            style={{ ...anton, color: NAVY }}
          >
            {reelTag}
          </div>
          <div className="text-base font-semibold opacity-60">
            {reel.combos.length} combos
            {mode === "cycle" ? " · rolls into new random reels" : ""}
          </div>
          <button
            onClick={pressStart}
            className="w-full max-w-xs rounded-2xl py-6 text-3xl uppercase tracking-wide"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            Start
          </button>
          <Stepper
            label="Countdown"
            value={startGap}
            onChange={changeStartGap}
          />
          {mode === "cycle" && (
            <Stepper
              label="Between reels"
              value={betweenGap}
              onChange={changeBetweenGap}
            />
          )}
          <button
            onClick={exitReel}
            className="mt-1 text-base uppercase"
            style={{ ...anton, color: "rgba(30, 58, 76, 0.55)" }}
          >
            ❮ Back to reels
          </button>
        </div>
      )}

      {/* get-ready countdown */}
      {phase === "countdown" && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-8"
          style={{ background: "rgba(242, 236, 216, 0.97)" }}
        >
          <div
            className="text-2xl uppercase tracking-widest"
            style={{ ...anton, color: RED }}
          >
            Get ready
          </div>
          <div
            className="leading-none"
            style={{ ...anton, color: NAVY, fontSize: "min(45vw, 260px)" }}
          >
            {count}
          </div>
          <div className="text-xl uppercase opacity-60" style={anton}>
            {reelTag}
          </div>
        </div>
      )}

      {/* short countdown between random reels */}
      {phase === "between" && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-8"
          style={{ background: "rgba(242, 236, 216, 0.97)" }}
        >
          <div
            className="text-2xl uppercase tracking-widest"
            style={{ ...anton, color: RED }}
          >
            Up next
          </div>
          <div className="text-3xl uppercase" style={{ ...anton, color: NAVY }}>
            {reelTag}
          </div>
          <div
            className="leading-none"
            style={{ ...anton, color: NAVY, fontSize: "min(38vw, 220px)" }}
          >
            {count}
          </div>
          <button
            onClick={stopCycling}
            className="mt-3 w-full max-w-xs rounded-2xl py-4 text-xl uppercase"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            ■ Stop cycling
          </button>
        </div>
      )}

      {/* done banner — manual mode only (cycle mode rolls on) */}
      {done && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8"
          style={{ background: "rgba(242, 236, 216, 0.96)" }}
        >
          <div className="text-5xl uppercase" style={{ ...anton, color: RED }}>
            Reel done 🥊
          </div>
          <button
            onClick={() => {
              setDone(false);
              setIdx(0);
              setPhase("ready");
            }}
            className="w-full max-w-xs rounded-2xl py-5 text-xl uppercase"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            Run it again
          </button>
          <button
            onClick={() => {
              if (matches.length) startReel(randomFrom(matches), "cycle");
            }}
            className="w-full max-w-xs rounded-2xl py-5 text-xl uppercase"
            style={{ ...anton, background: NAVY, color: CREAM, boxShadow: SHADOW }}
          >
            Random reels
          </button>
          <button
            onClick={exitReel}
            className="w-full max-w-xs rounded-2xl border-2 py-5 text-xl uppercase"
            style={{ ...anton, borderColor: NAVY, color: NAVY }}
          >
            Back to reels
          </button>
        </div>
      )}
    </div>
  );
}
