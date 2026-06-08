"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { GOALS } from "@/lib/formats";
import {
  type ExerciseStore,
  allExercises,
  isEnabled,
  makeExerciseId,
} from "@/lib/exerciseStore";
import type { Difficulty, Exercise, Goal } from "@/lib/types";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

export default function SettingsScreen({
  store,
  onToggle,
  onAdd,
  onRemove,
  onBack,
}: {
  store: ExerciseStore;
  onToggle: (id: string) => void;
  onAdd: (ex: Exercise) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<Goal | "all">("all");
  const [showAdd, setShowAdd] = useState(false);

  const all = useMemo(() => allExercises(store), [store]);
  const list = useMemo(
    () => (filter === "all" ? all : all.filter((e) => e.goals.includes(filter))),
    [all, filter],
  );

  const enabledCount = all.filter((e) => isEnabled(store, e.id)).length;

  // Goals that currently have zero enabled exercises — warn so generation isn't
  // starved (it falls back to built-ins, but the user should know).
  const emptyGoals = GOALS.filter(
    (g) => !all.some((e) => e.goals.includes(g.id) && isEnabled(store, e.id)),
  );

  return (
    <div className="flex min-h-dvh flex-col gap-5 pb-4 animate-slide-up">
      <header className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-ink/60 transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Done
        </button>
        <span className="text-xs font-semibold text-ink/40">
          {enabledCount} / {all.length} active
        </span>
      </header>

      <div>
        <h1 className="text-3xl font-black">Exercise Library</h1>
        <p className="mt-1 text-sm text-ink/50">
          Toggle exercises on or off, or add your own. Saved on this device.
        </p>
      </div>

      {emptyGoals.length > 0 && (
        <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
          No active exercises for: {emptyGoals.map((g) => g.name).join(", ")}.
          Those workouts will fall back to the built-in moves.
        </p>
      )}

      <button
        onClick={() => setShowAdd((v) => !v)}
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-accent/50 bg-accent/10 py-3 text-sm font-bold text-accent transition hover:bg-accent/20"
      >
        {showAdd ? (
          <>
            <X className="h-4 w-4" /> Cancel
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Add custom exercise
          </>
        )}
      </button>

      {showAdd && (
        <AddForm
          onAdd={(ex) => {
            onAdd(ex);
            setShowAdd(false);
          }}
        />
      )}

      {/* Goal filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {GOALS.map((g) => (
          <FilterChip
            key={g.id}
            active={filter === g.id}
            onClick={() => setFilter(g.id)}
          >
            {g.name}
          </FilterChip>
        ))}
      </div>

      <ol className="flex-1 space-y-1.5 overflow-y-auto">
        {list.map((e) => (
          <LibraryRow
            key={e.id}
            exercise={e}
            enabled={isEnabled(store, e.id)}
            onToggle={() => onToggle(e.id)}
            onRemove={() => onRemove(e.id)}
          />
        ))}
        {list.length === 0 && (
          <li className="py-8 text-center text-sm text-ink/40">
            No exercises for this filter.
          </li>
        )}
      </ol>
    </div>
  );
}

function LibraryRow({
  exercise: e,
  enabled: on,
  onToggle,
  onRemove,
}: {
  exercise: Exercise;
  enabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-xl border border-ink/10 bg-ink/[0.03]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={on}
          aria-label={`Toggle ${e.name}`}
          className={`relative h-6 w-10 shrink-0 rounded-full transition ${
            on ? "bg-accent" : "bg-ink/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
              on ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex flex-1 items-center gap-2 text-left ${on ? "" : "opacity-40"}`}
        >
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="font-bold">{e.name}</span>
              {e.custom && (
                <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold">
                  Custom
                </span>
              )}
            </span>
            <span className="block text-xs text-ink/40">
              {e.goals.map((g) => goalName(g)).join(" · ")} · {cap(e.difficulty)}
            </span>
          </span>
          {e.description && (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-ink/30 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          )}
        </button>

        {e.custom && (
          <button
            onClick={onRemove}
            aria-label={`Delete ${e.name}`}
            className="shrink-0 rounded-lg p-1.5 text-ink/40 transition hover:bg-danger/15 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && e.description && (
        <p className="border-t border-ink/5 px-4 py-2.5 text-sm leading-relaxed text-ink/60">
          {e.description}
        </p>
      )}
    </li>
  );
}

function AddForm({ onAdd }: { onAdd: (ex: Exercise) => void }) {
  const [name, setName] = useState("");
  const [cue, setCue] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [error, setError] = useState("");

  const toggleGoal = (g: Goal) =>
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );

  const submit = () => {
    if (!name.trim()) return setError("Give it a name.");
    if (goals.length === 0) return setError("Pick at least one goal.");
    onAdd({
      id: makeExerciseId(name),
      name: name.trim(),
      cue: cue.trim() || "Keep good form",
      description: description.trim() || undefined,
      goals,
      difficulty,
      custom: true,
    });
  };

  const inputCls =
    "w-full rounded-xl border border-ink/10 bg-ink/[0.04] px-3 py-2.5 text-sm outline-none transition focus:border-accent";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-ink/[0.02] p-4">
      <input
        className={inputCls}
        placeholder="Exercise name (e.g. Plank Jacks)"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
      />
      <input
        className={inputCls}
        placeholder="Coaching cue (optional)"
        value={cue}
        onChange={(e) => setCue(e.target.value)}
      />
      <textarea
        className={`${inputCls} min-h-[72px] resize-y`}
        placeholder="How-to description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink/50">Goals</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <FilterChip
              key={g.id}
              active={goals.includes(g.id)}
              onClick={() => {
                toggleGoal(g.id);
                setError("");
              }}
            >
              <span className="flex items-center gap-1.5">
                <g.icon className="h-3.5 w-3.5" />
                {g.name}
              </span>
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink/50">Difficulty</p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border px-2 py-2 text-sm font-semibold capitalize transition ${
                difficulty === d
                  ? "border-accent bg-accent/10"
                  : "border-ink/10 bg-ink/[0.03]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <button
        onClick={submit}
        className="rounded-xl brand-bg py-2.5 text-sm font-black transition active:scale-[0.99]"
      >
        Add exercise
      </button>
    </div>
  );
}

function FilterChip({
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
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-accent bg-accent/10 text-ink"
          : "border-ink/10 bg-ink/[0.03] text-ink/60 hover:border-ink/25"
      }`}
    >
      {children}
    </button>
  );
}

function goalName(g: Goal) {
  return GOALS.find((x) => x.id === g)?.name ?? g;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
