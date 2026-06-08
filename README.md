# PulseFit — Workout Builder & Timer

A private, no-auth Next.js app that builds custom interval workouts and runs them
with a beep-driven timer.

## Flow

1. **Build** — pick a goal (full / upper / lower / core / cardio), a format
   (Tabata, HIIT, EMOM, Circuit, Sprint Pyramid), a **level** (caps exercise
   difficulty), an **intensity** (tunes work vs. rest length), and a target
   duration.
2. **Preview** — see the whole generated workout: an optional **Warm-Up** of
   dynamic stretches, the main rounds, and an optional **Cool-Down** of static
   stretches (each toggled on/off in the builder). **Shuffle** to regenerate, or
   **Edit** to change settings.
3. **Run** — full-screen timer with a countdown ring, the current exercise as
   text, and audio cues. Pause / skip / previous controls. Tap the **?** next to
   an exercise name to see its full how-to description.
4. **Complete** — summary, **export** the workout (Download .txt / Email /
   Copy — a plain-text file with all settings and the full timeline incl. rests
   and stretches), and options to repeat or build a new one.

## Audio cues

Pick **Voice** or **Beeps** in the builder (Sound section). Audio is unlocked on
the "Start Workout" tap so it works on mobile.

### Voice mode (default)

Spoken clips from `public/` plus a couple of beeps for transitions:

- **Long "go" beep** marks the start of each work set (rest → work).
- **"Halfway there"** (`halfwaythere.mp3`) at the midpoint of each work set.
- **"5, 4, 3, 2, 1"** (`54321.mp3`) timed to finish at the end of each work set.
- **3-2-1 countdown beeps** during rest / warm-up / cool-down, leading into the
  next set.
- Voice clips play on **work sets only**.

> The `30/20/15secondsleft.mp3` files are included but currently unused — the
> single mid-set reminder is always "halfway there". To swap in a length-based
> reminder instead, see `countdownVoice`/`halfwayVoice` in `lib/audio.ts` and the
> tick loop in `components/WorkoutScreen.tsx`.

### Beep mode

Fully synthesized with the Web Audio API — no files:

- Go tone at work start, lower tone at rest start.
- Halfway beep at the midpoint of each work interval.
- Countdown ticks for the final 5 seconds of every interval.

Both modes end with a **finish fanfare**.

Use the **🔊 Tap to test voice** button in the builder's Sound section to confirm
the spoken cues are audible on your device before starting a workout.

### Playing alongside background music — on hold

An earlier attempt set `navigator.audioSession.type = "ambient"` so cues would
mix with music from another app instead of pausing it. On browsers that support
that API it silenced the spoken cues (while beeps kept playing), so it's been
removed in favor of cues that reliably play. Revisiting this safely would need
testing on a browser that actually supports `navigator.audioSession` (the beeps
are Web Audio and already mix; the spoken clips are HTML `<audio>`).

## Exercise library (no database)

Tap the ⚙️ on the builder to open the **Exercise Library** screen, where you can:

- Toggle any exercise on/off (disabled ones won't appear in generated workouts).
- Tap any exercise (here or on the preview screen) to read a full how-to description.
- Add your own custom exercises (name, cue, optional how-to description, goals, difficulty).
- Delete custom exercises.

Everything persists in **`localStorage`** — no backend or database. Only the
*diff* from the built-in library is stored: disabled ids + your custom
exercises (`lib/exerciseStore.ts`, `lib/useExerciseStore.ts`). If you disable
every exercise for a goal, generation safely falls back to the built-in moves
(and the settings screen warns you).

## Customizing

- **Exercises:** `lib/exercises.ts` — each has `goals`, `difficulty`, and a
  coaching `cue`. Add or edit freely.
- **Formats:** `lib/formats.ts` — base work/rest/rounds and how intensity scales
  them (`scaledIntervals`).
- **Warmup / cooldown:** `lib/exercises.ts` (`WARMUP_MOVES`, `COOLDOWN_MOVES`).
  Their length scales with the session duration — see the `warmupCount` /
  `cooldownCount` math in `lib/generateWorkout.ts`.
- **Generation logic:** `lib/generateWorkout.ts` — how rounds and exercise
  selection are assembled from settings.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build / typecheck
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Web Audio API.
Entirely client-side — no backend, no auth, no data stored.
