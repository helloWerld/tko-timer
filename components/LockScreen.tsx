"use client";

import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      if (res.ok) {
        onUnlock();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Incorrect password.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <ThemeToggle className="absolute right-0 top-0" />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink/[0.06]">
        <Lock className="h-7 w-7 text-ink/70" />
      </div>

      <div>
        <h1 className="text-2xl font-black">Enter password</h1>
        <p className="mt-1 text-sm text-ink/45">
          This workout timer is locked.
        </p>
      </div>

      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Password"
          className={`w-full rounded-2xl border bg-ink/[0.03] px-4 py-3.5 text-center text-lg outline-none transition placeholder:text-ink/30 ${
            error
              ? "border-danger/60 focus:border-danger"
              : "border-ink/10 focus:border-accent/60"
          }`}
        />

        {error && (
          <p className="text-sm font-semibold text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-2xl brand-bg py-4 text-lg font-black shadow-lg shadow-accent/20 transition active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? "Unlocking…" : "Unlock"}
          {!submitting && <ArrowRight className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
