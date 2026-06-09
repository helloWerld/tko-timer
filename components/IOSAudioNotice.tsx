"use client";

import { useEffect, useState } from "react";
import { TriangleAlert, X } from "lucide-react";

const DISMISS_KEY = "tko.iosAudioNotice.dismissed.v1";

/**
 * iOS (iPhone/iPod, and iPadOS which reports as Mac with touch). On iOS the
 * hardware ring/silent switch mutes Web Audio, so cues can be silent even when
 * everything works — worth a heads-up.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Dismissible heads-up shown only on iOS, where the silent switch mutes cues. */
export default function IOSAudioNotice() {
  // Stays false during SSR + first client render (navigator is client-only),
  // so it can't cause a hydration mismatch; the effect flips it on after mount.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-[12px] leading-snug text-ink/80">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <p className="flex-1">
        <span className="font-semibold">No sound on iPhone?</span> The ring/silent
        switch on the side of your phone mutes audio cues. Flip it off (and turn
        the volume up) to hear them.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-ink/40 transition hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
