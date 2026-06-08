"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Settings, Volume2 } from "lucide-react";
import { FORMATS, GOALS, getFormat, scaledIntervals } from "@/lib/formats";
import { testVoice } from "@/lib/audio";
import type {
  Difficulty,
  Goal,
  Intensity,
  SoundMode,
  WorkoutSettings,
} from "@/lib/types";

const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: "beginner", name: "Beginner" },
  { id: "intermediate", name: "Intermediate" },
  { id: "advanced", name: "Advanced" },
];

const INTENSITIES: { id: Intensity; name: string; hint: string }[] = [
  { id: "low", name: "Low", hint: "More rest" },
  { id: "medium", name: "Medium", hint: "Balanced" },
  { id: "high", name: "High", hint: "Less rest" },
];

export default function BuilderScreen({
  onBuild,
  onOpenSettings,
  initial,
}: {
  onBuild: (settings: WorkoutSettings) => void;
  onOpenSettings: () => void;
  initial?: WorkoutSettings;
}) {
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "full");
  const [formatId, setFormatId] = useState<string>(initial?.formatId ?? "hiit");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty ?? "intermediate",
  );
  const [intensity, setIntensity] = useState<Intensity>(
    initial?.intensity ?? "medium",
  );
  const [targetMinutes, setTargetMinutes] = useState<number>(
    initial?.targetMinutes ?? 20,
  );
  const [soundMode, setSoundMode] = useState<SoundMode>(
    initial?.soundMode ?? "voice",
  );
  const [includeWarmup, setIncludeWarmup] = useState<boolean>(
    initial?.includeWarmup ?? true,
  );
  const [includeCooldown, setIncludeCooldown] = useState<boolean>(
    initial?.includeCooldown ?? true,
  );

  const preview = useMemo(() => {
    const fmt = getFormat(formatId);
    return scaledIntervals(fmt, intensity);
  }, [formatId, intensity]);

  return (
    <div className="flex flex-col gap-8 pb-4 animate-slide-up">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
              PulseFit
            </span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Build it. Preview it. Crush it.
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Exercise library settings"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <Section label="Goal" step={1}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {GOALS.map((g) => (
            <OptionCard
              key={g.id}
              active={goal === g.id}
              onClick={() => setGoal(g.id)}
            >
              <g.icon className="h-6 w-6 text-pink-400" />
              <span className="font-bold leading-tight">{g.name}</span>
              <span className="text-[11px] font-normal text-white/40">
                {g.desc}
              </span>
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section label="Format" step={2}>
        <div className="flex flex-col gap-2.5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatId(f.id)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                formatId === f.id
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              <span>
                <span className="block font-bold">{f.name}</span>
                <span className="block text-xs text-white/45">{f.blurb}</span>
              </span>
              <span className="text-xs font-semibold text-white/40">
                {f.exercisesPerRound} moves
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section label="Level" step={3} hint="Hardest exercises that can appear">
        <Segmented
          options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.name }))}
          value={difficulty}
          onChange={(v) => setDifficulty(v as Difficulty)}
        />
      </Section>

      <Section label="Intensity" step={4} hint="Tunes work vs. rest length">
        <Segmented
          options={INTENSITIES.map((i) => ({
            id: i.id,
            label: i.name,
            sub: i.hint,
          }))}
          value={intensity}
          onChange={(v) => setIntensity(v as Intensity)}
        />
      </Section>

      <Section label="Duration" step={5}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-white/50">Target length</span>
            <span className="text-2xl font-black">
              {targetMinutes}
              <span className="ml-1 text-sm font-semibold text-white/40">
                min
              </span>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))}
            className="mt-3 w-full accent-pink-500"
          />
          <p className="mt-3 text-xs text-white/40">
            ≈ {preview.work}s work / {preview.rest}s rest per move
            {preview.roundRest > 0 ? ` · ${preview.roundRest}s round rest` : ""}
          </p>
        </div>
      </Section>

      <Section label="Warm-up & Cool-down" step={6} hint="Add stretch sections">
        <div className="flex flex-col gap-2.5">
          <ToggleRow
            label="Warm-up"
            desc="Dynamic stretches before the workout"
            on={includeWarmup}
            onToggle={() => setIncludeWarmup((v) => !v)}
          />
          <ToggleRow
            label="Cool-down"
            desc="Static stretches after the workout"
            on={includeCooldown}
            onToggle={() => setIncludeCooldown((v) => !v)}
          />
        </div>
      </Section>

      <Section label="Sound" step={7} hint="Spoken cues or simple beeps">
        <Segmented
          options={[
            { id: "voice", label: "Voice", sub: "Spoken cues" },
            { id: "beep", label: "Beeps", sub: "Tones only" },
          ]}
          value={soundMode}
          onChange={(v) => setSoundMode(v as SoundMode)}
        />
        {soundMode === "voice" && (
          <button
            onClick={() => testVoice()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/40"
          >
            <Volume2 className="h-4 w-4" />
            Tap to test voice (“halfway there”)
          </button>
        )}
      </Section>

      <button
        onClick={() =>
          onBuild({
            goal,
            formatId,
            difficulty,
            intensity,
            targetMinutes,
            soundMode,
            includeWarmup,
            includeCooldown,
          })
        }
        className="sticky bottom-4 mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 py-4 text-lg font-black shadow-lg shadow-pink-500/20 transition active:scale-[0.99]"
      >
        Build Workout
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function Section({
  label,
  step,
  hint,
  children,
}: {
  label: string;
  step: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
          {step}
        </span>
        <h2 className="text-lg font-bold">{label}</h2>
        {hint && <span className="text-xs text-white/35">— {hint}</span>}
      </div>
      {children}
    </section>
  );
}

function OptionCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition ${
        active
          ? "border-pink-500 bg-pink-500/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        on ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-white/45">{desc}</span>
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${
          on ? "bg-pink-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-2xl border px-2 py-3 text-center transition ${
            value === o.id
              ? "border-pink-500 bg-pink-500/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/25"
          }`}
        >
          <span className="block text-sm font-bold">{o.label}</span>
          {o.sub && (
            <span className="block text-[11px] text-white/40">{o.sub}</span>
          )}
        </button>
      ))}
    </div>
  );
}
