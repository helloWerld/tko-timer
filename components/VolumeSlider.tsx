"use client";

import { TriangleAlert, Volume2 } from "lucide-react";
import { MAX_VOLUME } from "@/lib/audio";

const MAX_PCT = Math.round(MAX_VOLUME * 100); // 125
const SNAP_PCT = 100; // detent at 100%
const SNAP_ZONE = 3; // ± window that sticks to the detent
const MARKER_FRACTION = SNAP_PCT / MAX_PCT; // 0.8

export default function VolumeSlider({
  label,
  value,
  onChange,
  onTest,
}: {
  /** Section title (also the test trigger). */
  label: string;
  /** Volume as a 0..MAX_VOLUME fraction. */
  value: number;
  onChange: (v: number) => void;
  onTest: () => void;
}) {
  const pct = Math.round(value * 100);
  const clipping = value > 1.0001;

  const handleChange = (rawPct: number) => {
    // Magnetic detent: snap to exactly 100% within the snap zone.
    const snapped =
      Math.abs(rawPct - SNAP_PCT) <= SNAP_ZONE ? SNAP_PCT : rawPct;
    onChange(snapped / 100);
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={onTest}
          aria-label={`Test ${label}`}
          className="flex items-center gap-2 text-sm font-semibold text-ink/70 transition hover:text-ink"
        >
          <Volume2 className="h-4 w-4" />
          {label}
        </button>
        <span
          className={`font-mono text-xs ${clipping ? "text-gold" : "text-ink/40"}`}
        >
          {pct}%
        </span>
      </div>

      <div className="relative">
        {/* 100% detent line the handle sticks to */}
        <div
          className="pointer-events-none absolute z-10 h-3 w-0.5 rounded bg-ink/60"
          style={{
            top: "50%",
            left: `calc(8px + (100% - 16px) * ${MARKER_FRACTION})`,
            transform: "translate(-50%, -50%)",
          }}
        />
        <input
          type="range"
          min={0}
          max={MAX_PCT}
          step={1}
          value={pct}
          onChange={(e) => handleChange(Number(e.target.value))}
          onPointerUp={onTest}
          onTouchEnd={onTest}
          className={`relative w-full ${clipping ? "accent-[rgb(var(--gold-rgb))]" : "accent-[rgb(var(--accent-rgb))]"}`}
        />
      </div>

      {clipping && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-gold">
          <TriangleAlert className="h-3.5 w-3.5" />
          Above 100% — may distort or clip
        </p>
      )}
    </div>
  );
}
