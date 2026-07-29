"use client";

/**
 * Jabster Combo Trainer — a standalone section, fully separate from the timer.
 *
 * 309 "reels": each is a progressive ladder of combos (1 → 1-2 → 1-2-3 …).
 * Home screen filters by starting punch + style; the trainer shows the whole
 * reel as a stacked ladder with the current combo blown up big, speaks each
 * combo with the Russell voice clips, and can auto-advance on a settable gap.
 *
 * Styling follows the Jabster style guide: cream #F2ECD8, navy #1E3A4C,
 * glove red #C13127, Anton for big numbers, Barlow SemiCondensed for subtext.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

const DEFENSE_LABELS: Record<string, string> = {
  slipL: "SLIP LEFT",
  slipR: "SLIP RIGHT",
  blockL: "BLOCK LEFT",
  blockR: "BLOCK RIGHT",
  duckL: "DUCK LEFT",
  duckR: "DUCK RIGHT",
};
const DEFENSE = new Set(Object.keys(DEFENSE_LABELS));
const GAP_MIN = 2;
const GAP_MAX = 15;
const GAP_DEFAULT = 6;
const GAP_KEY = "combo-trainer-gap";

const anton = { fontFamily: "var(--font-anton)" } as const;
const barlow = { fontFamily: "var(--font-barlow)" } as const;

function reelTokens(reel: ComboReel): string[] {
  return [...new Set(reel.combos.flatMap((c) => c.split("-")))];
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
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoOn, setAutoOn] = useState(false);
  const [gap, setGap] = useState(GAP_DEFAULT);

  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem(GAP_KEY));
    if (saved >= GAP_MIN && saved <= GAP_MAX) setGap(saved);
  }, []);

  const changeGap = (delta: number) => {
    setGap((g) => {
      const next = Math.min(GAP_MAX, Math.max(GAP_MIN, g + delta));
      localStorage.setItem(GAP_KEY, String(next));
      return next;
    });
  };

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

  // ---------- trainer flow ----------
  const startReel = (r: ComboReel) => {
    unlockComboAudio();
    preloadComboClips(reelTokens(r));
    setReel(r);
    setIdx(0);
    setDone(false);
    void requestWake();
  };

  const exitReel = () => {
    stopComboSpeech();
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setAutoOn(false);
    setReel(null);
    setDone(false);
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  };

  // Speak the current combo and (re)arm the auto-advance timer whenever the
  // shown combo changes — a manual tap therefore resets the gap, like the
  // original trainer.
  useEffect(() => {
    if (!reel || done) return;
    if (voiceOn) speakCombo(reel.combos[idx]);
    if (autoOn) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        setIdx((i) => {
          if (!reel) return i;
          if (i < reel.combos.length - 1) return i + 1;
          setDone(true);
          setAutoOn(false);
          return i;
        });
      }, gap * 1000);
    }
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel, idx, autoOn, gap, done]);

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
    else setDone(true);
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const onStackTap = (e: React.MouseEvent) => {
    unlockComboAudio();
    if (e.clientX < window.innerWidth * 0.22) prev();
    else next();
  };

  // ---------- stacked ladder centering ----------
  const stackWrap = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stackY, setStackY] = useState(0);

  useLayoutEffect(() => {
    const wrap = stackWrap.current;
    const line = lineRefs.current[idx];
    if (!wrap || !line) return;
    setStackY(wrap.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2));
  }, [idx, reel]);

  // Current-combo font size: scale to the rendered text length so short
  // combos go huge and directional-defense combos still fit on one line.
  const currentSize = (combo: string) => {
    const chars = combo
      .split("-")
      .map((t) => DEFENSE_LABELS[t] ?? t)
      .join(" · ").length;
    const vw = Math.min(185 / chars, 24);
    return `min(${vw.toFixed(1)}vw, 130px)`;
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
              if (matches.length)
                startReel(matches[Math.floor(Math.random() * matches.length)]);
            }}
            className="mt-6 w-full rounded-2xl py-5 text-2xl uppercase tracking-wide"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            🎲 Random reel
          </button>

          <div className="mt-4 text-sm font-semibold opacity-60">
            {matches.length} reels match
          </div>
          <div className="mt-2 space-y-2.5">
            {matches.map((r) => (
              <button
                key={r.id}
                onClick={() => startReel(r)}
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
          {reel.id} · {reel.style}
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

      {/* stacked combo ladder — tap right to advance, left edge to go back */}
      <div
        ref={stackWrap}
        onClick={onStackTap}
        className="relative flex-1 cursor-pointer overflow-hidden"
      >
        <div
          ref={stack}
          className="absolute left-0 right-0 transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${stackY}px)` }}
        >
          {reel.combos.map((c, i) => {
            const current = i === idx;
            return (
              <div
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                className="px-3 text-center leading-tight transition-all duration-300"
                style={{
                  ...anton,
                  fontSize: current
                    ? currentSize(c)
                    : c.split("-").some((t) => t.length > 4)
                      ? "min(4.4vw, 21px)"
                      : "min(5.5vw, 26px)",
                  opacity: current ? 1 : 0.28,
                  paddingTop: current ? 10 : 4,
                  paddingBottom: current ? 10 : 4,
                }}
              >
                <ComboLine combo={c} dim={!current} />
              </div>
            );
          })}
        </div>
        {/* soft fade so the stack melts into the page edges */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{
            background: `linear-gradient(${CREAM}, rgba(242, 236, 216, 0))`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background: `linear-gradient(rgba(242, 236, 216, 0), ${CREAM})`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-sm font-semibold"
          style={{ color: "rgba(30, 58, 76, 0.4)" }}
        >
          Combo {idx + 1} of {reel.combos.length} · tap to advance · left edge
          goes back
        </div>
      </div>

      {/* auto-gap stepper */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2">
        <span
          className="text-xs uppercase tracking-widest opacity-60"
          style={anton}
        >
          Gap between combos
        </span>
        <button
          onClick={() => changeGap(-1)}
          className="h-9 w-9 rounded-full border-2 text-xl leading-none"
          style={{ ...anton, borderColor: NAVY, color: NAVY }}
          aria-label="Shorter gap"
        >
          −
        </button>
        <span className="w-9 text-center text-xl" style={anton}>
          {gap}s
        </span>
        <button
          onClick={() => changeGap(1)}
          className="h-9 w-9 rounded-full border-2 text-xl leading-none"
          style={{ ...anton, borderColor: NAVY, color: NAVY }}
          aria-label="Longer gap"
        >
          +
        </button>
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
            else speakCombo(reel.combos[idx]);
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

      {/* done banner */}
      {done && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8"
          style={{ background: "rgba(242, 236, 216, 0.96)" }}
        >
          <div
            className="text-5xl uppercase"
            style={{ ...anton, color: RED }}
          >
            Reel done 🥊
          </div>
          <button
            onClick={() => {
              setDone(false);
              setIdx(0);
            }}
            className="w-full max-w-xs rounded-2xl py-5 text-xl uppercase"
            style={{ ...anton, background: RED, color: CREAM, boxShadow: SHADOW }}
          >
            Run it again
          </button>
          <button
            onClick={() => {
              if (matches.length)
                startReel(matches[Math.floor(Math.random() * matches.length)]);
            }}
            className="w-full max-w-xs rounded-2xl py-5 text-xl uppercase"
            style={{ ...anton, background: NAVY, color: CREAM, boxShadow: SHADOW }}
          >
            Next random reel
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
