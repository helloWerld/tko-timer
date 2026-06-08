"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Mail,
  PartyPopper,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { GOALS } from "@/lib/formats";
import { formatClock } from "@/lib/time";
import { buildWorkoutExport, exportFileName } from "@/lib/exportWorkout";
import type { GeneratedWorkout } from "@/lib/types";

export default function CompleteScreen({
  workout,
  onRestart,
  onNew,
}: {
  workout: GeneratedWorkout;
  onRestart: () => void;
  onNew: () => void;
}) {
  const goal = GOALS.find((g) => g.id === workout.settings.goal);
  const workSteps = workout.steps.filter((s) => s.kind === "work").length;
  const [copied, setCopied] = useState(false);

  const download = () => {
    const text = buildWorkoutExport(workout);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName(workout);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const email = () => {
    const text = buildWorkoutExport(workout);
    const subject = encodeURIComponent(
      `TKO Timer Workout — ${goal?.name ?? ""} (${workout.format.name})`,
    );
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildWorkoutExport(workout));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the download/email options still work */
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 text-center animate-slide-up">
      <div>
        <PartyPopper className="mx-auto h-14 w-14 text-accent" />
        <h1 className="mt-3 text-4xl font-black">
          <span className="brand-text">
            Workout Complete
          </span>
        </h1>
        <p className="mt-2 text-ink/55">
          {goal?.name} · {workout.format.name}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat value={formatClock(workout.totalSeconds)} label="Total time" />
        <Stat value={String(workout.rounds)} label="Rounds" />
        <Stat value={String(workSteps)} label="Intervals" />
      </div>

      <div className="w-full">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">
          Export workout
        </p>
        <div className="flex flex-col gap-2">
          <ExportButton onClick={download} icon={Download} label="Download" />
          <ExportButton onClick={email} icon={Mail} label="Email" />
          <ExportButton
            onClick={copy}
            icon={copied ? Check : Copy}
            label={copied ? "Copied" : "Copy"}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink/35">
          Plain-text file with all settings and the full timeline (warm-up, work,
          rest, cool-down).
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 rounded-2xl brand-bg py-4 text-lg font-black shadow-lg shadow-accent/20 transition active:scale-[0.99]"
        >
          <RotateCcw className="h-5 w-5" />
          Do It Again
        </button>
        <button
          onClick={onNew}
          className="rounded-2xl border border-ink/15 py-4 text-lg font-bold text-ink/80 transition hover:border-ink/40"
        >
          New Workout
        </button>
      </div>
    </div>
  );
}

function ExportButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ink/15 py-3.5 text-base font-semibold text-ink/80 transition hover:border-ink/40 active:scale-[0.99]"
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] px-4 py-3">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-ink/40">
        {label}
      </div>
    </div>
  );
}
