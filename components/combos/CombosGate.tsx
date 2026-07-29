"use client";

/**
 * Same password gate as the main app (shared httpOnly unlock cookie), so the
 * combo trainer isn't publicly reachable when deployed. Unlocking on either
 * page unlocks both.
 */

import { useEffect, useState } from "react";
import LockScreen from "@/components/LockScreen";
import ComboTrainer from "./ComboTrainer";

export default function CombosGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/unlock")
      .then((r) => r.json())
      .then((d) => {
        if (active) setUnlocked(Boolean(d?.unlocked));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (checking) return <div className="min-h-dvh" style={{ background: "#F2ECD8" }} />;
  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
        <LockScreen onUnlock={() => setUnlocked(true)} />
      </main>
    );
  }
  return <ComboTrainer />;
}
