"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Settings } from "lucide-react";
import { FORMATS, GOALS, getFormat, scaledIntervals } from "@/lib/formats";
import {
  getVolumes,
  preloadVoice,
  setBeepVolume,
  setVoiceVolume,
  testBeep,
  testVoice,
} from "@/lib/audio";
import VolumeSlider from "./VolumeSlider";
import ThemeToggle from "./ThemeToggle";
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
  const [beepVol, setBeepVol] = useState(1);
  const [voiceVol, setVoiceVol] = useState(1);

  // Sync sliders with persisted volumes and start decoding the voice clips so
  // they're ready (and the test buttons use the real playback path).
  useEffect(() => {
    const v = getVolumes();
    setBeepVol(v.beep);
    setVoiceVol(v.voice);
    preloadVoice();
  }, []);

  const preview = useMemo(() => {
    const fmt = getFormat(formatId);
    return scaledIntervals(fmt, intensity);
  }, [formatId, intensity]);

  return (
    <div className="flex flex-col gap-8 pb-4 animate-slide-up">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="brand-text">
              TKO Timer
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            Build it. Preview it. Knock it out.
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onOpenSettings}
            aria-label="Exercise library settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition hover:border-ink/40 hover:text-ink"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Section label="Goal" step={1}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {GOALS.map((g) => (
            <OptionCard
              key={g.id}
              active={goal === g.id}
              onClick={() => setGoal(g.id)}
            >
              <g.icon className="h-6 w-6 text-accent" />
              <span className="font-bold leading-tight">{g.name}</span>
              <span className="text-[11px] font-normal text-ink/40">
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
                  ? "border-accent bg-accent/10"
                  : "border-ink/10 bg-ink/[0.03] hover:border-ink/25"
              }`}
            >
              <span>
                <span className="block font-bold">{f.name}</span>
                <span className="block text-xs text-ink/45">{f.blurb}</span>
              </span>
              <span className="text-xs font-semibold text-ink/40">
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
        <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink/50">Target length</span>
            <span className="text-2xl font-black">
              {targetMinutes}
              <span className="ml-1 text-sm font-semibold text-ink/40">
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
            className="mt-3 w-full accent-[rgb(var(--accent-rgb))]"
          />
          <p className="mt-3 text-xs text-ink/40">
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
        <div className="mt-2.5 flex flex-col gap-2.5">
          <VolumeSlider
            label="Beep volume"
            value={beepVol}
            onChange={(v) => {
              setBeepVol(v);
              setBeepVolume(v);
            }}
            onTest={() => testBeep()}
          />
          {soundMode === "voice" && (
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
        <p className="mt-2 text-[11px] text-ink/35">
          Tap the speaker to hear a sample. Releasing a slider plays one too.
        </p>
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
        className="sticky bottom-4 mt-2 flex items-center justify-center gap-2 rounded-2xl brand-bg py-4 text-lg font-black shadow-lg shadow-accent/20 transition active:scale-[0.99]"
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
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink/60">
          {step}
        </span>
        <h2 className="text-lg font-bold">{label}</h2>
        {hint && <span className="text-xs text-ink/35">— {hint}</span>}
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
          ? "border-accent bg-accent/10"
          : "border-ink/10 bg-ink/[0.03] hover:border-ink/25"
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
        on ? "border-accent bg-accent/10" : "border-ink/10 bg-ink/[0.03]"
      }`}
    >
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-ink/45">{desc}</span>
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${
          on ? "bg-accent" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
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
              ? "border-accent bg-accent/10"
              : "border-ink/10 bg-ink/[0.03] hover:border-ink/25"
          }`}
        >
          <span className="block text-sm font-bold">{o.label}</span>
          {o.sub && (
            <span className="block text-[11px] text-ink/40">{o.sub}</span>
          )}
        </button>
      ))}
    </div>
  );
}
