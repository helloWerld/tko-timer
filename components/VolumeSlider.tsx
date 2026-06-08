"use client";

import { TriangleAlert, Volume2 } from "lucide-react";
import { MAX_VOLUME } from "@/lib/audio";

const MAX_PCT = Math.round(MAX_VOLUME * 100); // 200
const SNAP_PCTS = [100, 125, 150, 175]; // detents the handle sticks to
const SNAP_ZONE = 3; // ± window that sticks to a detent

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
    // Magnetic detents: snap to the nearest stopper within the snap zone.
    const snap = SNAP_PCTS.find((p) => Math.abs(rawPct - p) <= SNAP_ZONE);
    onChange((snap ?? rawPct) / 100);
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

      <div className="relative isolate">
        {/* Detent lines the handle sticks to (100 / 125 / 150 / 175%).
            `isolate` on this wrapper keeps the z-10 ticks in a local stacking
            context so they don't bleed over the sticky Build Workout button. */}
        {SNAP_PCTS.map((p) => (
          <div
            key={p}
            className="pointer-events-none absolute z-10 h-3 w-0.5 rounded bg-ink/60"
            style={{
              top: "50%",
              left: `calc(8px + (100% - 16px) * ${p / MAX_PCT})`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
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
