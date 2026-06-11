import type { Difficulty, Exercise } from "./types";

/**
 * Boxing mode data: punch combos ("workout sets") and active-recovery moves.
 *
 * Combos are stored as raw "Name (notation)" lines and parsed once at module
 * load. A combo's level is derived purely from its punch count (Beginner ≤3,
 * Intermediate =4, Advanced ≥5); slips/blocks, ducks and footwork are tracked
 * separately so the builder can toggle them in or out independently of level.
 */

export interface BoxingCombo {
  id: string;
  /** Spelled-out name, e.g. "Jab, Cross, Lead Hook". */
  name: string;
  /** Shorthand notation, e.g. "1 - 2 - 3". */
  notation: string;
  /** Number of strikes (numeric tokens, incl. body variants like 1B). */
  punches: number;
  /** Total moves: every token, i.e. punches + slips/blocks/ducks/footwork. */
  moves: number;
  hasSlipBlock: boolean;
  hasDuck: boolean;
  hasFootwork: boolean;
  /** Contains an overhand (7 or 8). */
  hasOverhand: boolean;
  /**
   * Level ceiling, derived from total move count: Beginner ≤3 moves,
   * Intermediate ≤4 moves (incl. slips/footwork), Advanced = anything.
   */
  difficulty: Difficulty;
}

const difficultyRank: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const SLIP_BLOCK = new Set(["SL", "SR", "BL", "BR"]);
const DUCK = new Set(["DL", "DR"]);
const FOOTWORK = new Set(["PL", "PR", "STL", "STR"]);
const OVERHAND = new Set(["7", "8"]);
const PUNCH = /^[1-8]B?$/;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function difficultyFor(moves: number): Difficulty {
  if (moves <= 3) return "beginner";
  if (moves === 4) return "intermediate";
  return "advanced";
}

function parseCombo(name: string, notation: string): BoxingCombo {
  const tokens = notation.split("-").map((t) => t.trim());
  const punches = tokens.filter((t) => PUNCH.test(t)).length;
  const moves = tokens.length;
  return {
    id: `box-${slug(name)}`,
    name,
    notation,
    punches,
    moves,
    hasSlipBlock: tokens.some((t) => SLIP_BLOCK.has(t)),
    hasDuck: tokens.some((t) => DUCK.has(t)),
    hasFootwork: tokens.some((t) => FOOTWORK.has(t)),
    hasOverhand: tokens.some((t) => OVERHAND.has(t)),
    difficulty: difficultyFor(moves),
  };
}

/**
 * A "basic" combo for opening a workout: straight punches only (no slips,
 * blocks, ducks, footwork), no overhands (7/8), and short (≤3 moves). E.g.
 * Jab (1), Jab-Cross (1-2), Cross-Lead Hook (2-3).
 */
export function isBasicCombo(c: BoxingCombo): boolean {
  return c.punches === c.moves && !c.hasOverhand && c.moves <= 3;
}

/** Raw combo list — one "Name (notation)" per line. Group headers are ignored. */
const COMBO_TEXT = `
Jab (1)
Double Jab (1 - 1)
Triple Jab (1 - 1 - 1)
Jab, Slip Left (1 - SL)
Jab, Slip Right (1 - SR)
Jab, Block Left (1 - BL)
Jab, Block Right (1 - BR)
Jab, Cross (1 - 2)
Jab, Cross, Jab (1 - 2 - 1)
Jab, Cross, Lead Hook (1 - 2 - 3)
Jab, Cross, Rear Hook (1 - 2 - 4)
Jab, Cross, Lead Uppercut (1 - 2 - 5)
Jab, Cross, Rear Uppercut (1 - 2 - 6)
Jab, Cross, Slip Left (1 - 2 - SL)
Jab, Cross, Slip Right (1 - 2 - SR)
Jab, Cross, Duck Left (1 - 2 - DL)
Jab, Cross, Duck Right (1 - 2 - DR)
Jab, Cross, Pivot Left (1 - 2 - PL)
Jab, Cross, Pivot Right (1 - 2 - PR)
Jab, Slip Left, Cross (1 - SL - 2)
Jab, Slip Right, Cross (1 - SR - 2)
Jab, Slip Left, Lead Hook (1 - SL - 3)
Jab, Slip Right, Rear Hook (1 - SR - 4)
Jab, Slip Right, Cross, Lead Hook (1 - SR - 2 - 3)
Jab, Slip Left, Cross, Rear Hook (1 - SL - 2 - 4)
Jab, Duck Left, Cross (1 - DL - 2)
Jab, Duck Right, Lead Hook (1 - DR - 3)
Jab, Duck Left, Cross, Lead Hook (1 - DL - 2 - 3)
Jab, Duck Right, Lead Hook, Cross (1 - DR - 3 - 2)
Jab, Cross, Slip Left, Rear Hook (1 - 2 - SL - 4)
Jab, Cross, Slip Right, Lead Hook (1 - 2 - SR - 3)
Jab, Cross, Duck Left, Rear Hook (1 - 2 - DL - 4)
Jab, Cross, Duck Right, Lead Hook (1 - 2 - DR - 3)
Jab, Cross, Lead Hook, Slip Left (1 - 2 - 3 - SL)
Jab, Cross, Lead Hook, Slip Right (1 - 2 - 3 - SR)
Jab, Cross, Lead Hook, Pivot Left (1 - 2 - 3 - PL)
Jab, Cross, Lead Hook, Step Left (1 - 2 - 3 - STL)
Jab, Cross, Lead Hook, Cross (1 - 2 - 3 - 2)
Jab, Cross, Lead Hook, Rear Hook (1 - 2 - 3 - 4)
Jab, Cross, Rear Uppercut, Lead Hook (1 - 2 - 6 - 3)
Jab, Cross, Lead Uppercut, Rear Uppercut (1 - 2 - 5 - 6)
Jab, Cross, Lead Hook, Cross, Slip Left (1 - 2 - 3 - 2 - SL)
Jab, Cross, Lead Hook, Cross, Pivot Left (1 - 2 - 3 - 2 - PL)
Jab, Cross, Lead Hook, Cross, Step Right (1 - 2 - 3 - 2 - STR)
Jab, Cross, Lead Hook, Rear Hook, Pivot Right (1 - 2 - 3 - 4 - PR)
Jab, Lead Hook (1 - 3)
Jab, Lead Hook, Cross (1 - 3 - 2)
Jab, Lead Hook Head, Lead Hook Body (1 - 3 - 3B)
Jab, Lead Hook, Cross, Slip Right (1 - 3 - 2 - SR)
Jab, Lead Hook, Cross, Lead Hook (1 - 3 - 2 - 3)
Jab, Lead Hook, Rear Hook (1 - 3 - 4)
Jab, Lead Hook, Rear Hook, Slip Left (1 - 3 - 4 - SL)
Jab, Lead Hook, Rear Hook, Step Left (1 - 3 - 4 - STL)
Jab, Rear Hook (1 - 4)
Jab, Rear Hook Body (1 - 4B)
Jab, Rear Hook Body, Jab (1 - 4B - 1)
Jab, Rear Hook Body, Jab, Cross (1 - 4B - 1 - 2)
Jab, Lead Uppercut (1 - 5)
Jab, Lead Uppercut, Cross (1 - 5 - 2)
Jab, Lead Uppercut, Cross, Lead Hook (1 - 5 - 2 - 3)
Jab, Lead Uppercut, Lead Hook (1 - 5 - 3)
Jab, Rear Uppercut (1 - 6)
Jab, Rear Uppercut, Cross (1 - 6 - 2)
Jab, Rear Uppercut, Lead Hook (1 - 6 - 3)
Jab, Rear Uppercut, Lead Hook, Cross (1 - 6 - 3 - 2)
Jab, Lead Overhand (1 - 7)
Jab, Lead Overhand, Rear Hook (1 - 7 - 4)
Jab, Lead Overhand, Rear Hook, Step Left (1 - 7 - 4 - STL)
Jab, Lead Overhand, Rear Hook, Pivot Left (1 - 7 - 4 - PL)
Jab, Rear Overhand (1 - 8)
Jab, Rear Overhand, Lead Hook (1 - 8 - 3)
Jab, Rear Overhand, Lead Hook, Cross (1 - 8 - 3 - 2)
Jab, Cross Body (1 - 2B)
Jab, Cross Body, Lead Hook (1 - 2B - 3)
Jab, Cross Body, Lead Hook, Cross (1 - 2B - 3 - 2)
Jab Body, Cross (1B - 2)
Jab Body, Cross, Lead Hook (1B - 2 - 3)
Jab Body, Cross, Lead Hook, Cross (1B - 2 - 3 - 2)
Jab Body, Cross, Lead Hook, Rear Hook (1B - 2 - 3 - 4)
Jab Body, Slip Left, Cross (1B - SL - 2)
Jab Body, Slip Right, Lead Hook (1B - SR - 3)
Cross (2)
Cross, Jab (2 - 1)
Cross, Lead Hook (2 - 3)
Cross, Rear Hook (2 - 4)
Cross, Lead Uppercut (2 - 5)
Cross, Rear Uppercut (2 - 6)
Cross, Lead Overhand (2 - 7)
Cross Head, Cross Body (2 - 2B)
Cross, Slip Left (2 - SL)
Cross, Slip Right (2 - SR)
Cross, Duck Left (2 - DL)
Cross, Duck Right (2 - DR)
Cross, Pivot Left (2 - PL)
Cross, Pivot Right (2 - PR)
Cross, Slip Left, Lead Hook (2 - SL - 3)
Cross, Slip Right, Rear Hook (2 - SR - 4)
Cross, Duck Left, Rear Hook (2 - DL - 4)
Cross, Duck Right, Lead Hook (2 - DR - 3)
Cross, Lead Hook, Cross (2 - 3 - 2)
Cross, Lead Hook, Rear Hook (2 - 3 - 4)
Cross, Lead Hook, Slip Left (2 - 3 - SL)
Cross, Lead Hook, Slip Right (2 - 3 - SR)
Cross, Lead Hook, Pivot Left (2 - 3 - PL)
Cross, Lead Hook, Step Left (2 - 3 - STL)
Cross, Rear Hook, Lead Hook (2 - 4 - 3)
Cross, Rear Hook, Slip Left (2 - 4 - SL)
Cross, Rear Hook, Step Right (2 - 4 - STR)
Cross, Lead Uppercut, Cross (2 - 5 - 2)
Cross, Lead Uppercut, Lead Hook (2 - 5 - 3)
Cross, Rear Uppercut, Lead Hook (2 - 6 - 3)
Cross, Lead Hook Body (2 - 3B)
Cross, Lead Hook Body, Rear Hook (2 - 3B - 4)
Cross, Lead Hook, Cross, Slip Left (2 - 3 - 2 - SL)
Cross, Lead Hook, Cross, Pivot Left (2 - 3 - 2 - PL)
Cross, Lead Hook, Cross, Step Right (2 - 3 - 2 - STR)
Cross, Lead Hook, Rear Hook, Cross (2 - 3 - 4 - 2)
Cross, Rear Hook, Lead Hook, Cross (2 - 4 - 3 - 2)
Cross, Lead Uppercut, Rear Uppercut, Lead Hook (2 - 5 - 6 - 3)
Cross, Lead Hook Body, Rear Hook, Cross (2 - 3B - 4 - 2)
Cross, Duck Left, Rear Hook, Lead Hook (2 - DL - 4 - 3)
Cross, Duck Right, Lead Hook, Cross (2 - DR - 3 - 2)
Cross, Slip Left, Lead Hook, Cross, Slip Right (2 - SL - 3 - 2 - SR)
Cross, Lead Hook, Cross, Lead Hook, Cross (2 - 3 - 2 - 3 - 2)
Lead Hook (3)
Lead Hook, Cross (3 - 2)
Lead Hook, Rear Hook (3 - 4)
Lead Hook, Rear Uppercut (3 - 6)
Lead Hook Head, Lead Hook Body (3 - 3B)
Lead Hook, Slip Left (3 - SL)
Lead Hook, Slip Right (3 - SR)
Lead Hook, Pivot Left (3 - PL)
Lead Hook, Pivot Right (3 - PR)
Lead Hook, Step Left (3 - STL)
Lead Hook Body, Cross (3B - 2)
Lead Hook Body, Rear Hook Body (3B - 4B)
Lead Hook, Cross, Slip Left (3 - 2 - SL)
Lead Hook, Cross, Slip Right (3 - 2 - SR)
Lead Hook, Cross, Pivot Left (3 - 2 - PL)
Lead Hook, Cross, Step Right (3 - 2 - STR)
Lead Hook, Cross, Lead Hook (3 - 2 - 3)
Lead Hook, Cross, Rear Hook (3 - 2 - 4)
Lead Hook, Rear Hook, Cross (3 - 4 - 2)
Lead Hook, Rear Hook, Lead Hook (3 - 4 - 3)
Lead Hook, Rear Hook, Slip Left (3 - 4 - SL)
Lead Hook, Rear Hook, Step Left (3 - 4 - STL)
Lead Hook, Rear Uppercut, Cross (3 - 6 - 2)
Lead Hook, Rear Uppercut, Lead Hook (3 - 6 - 3)
Lead Hook Body, Cross, Lead Hook (3B - 2 - 3)
Lead Hook Body, Rear Hook Body, Cross (3B - 4B - 2)
Lead Hook, Cross, Lead Hook, Cross (3 - 2 - 3 - 2)
Lead Hook, Cross, Rear Hook, Lead Hook (3 - 2 - 4 - 3)
Lead Hook, Rear Hook, Lead Hook, Cross (3 - 4 - 3 - 2)
Lead Hook, Cross, Slip Left, Rear Hook (3 - 2 - SL - 4)
Lead Hook, Cross, Duck Left, Rear Hook (3 - 2 - DL - 4)
Lead Hook Body, Cross, Lead Hook, Slip Right (3B - 2 - 3 - SR)
Lead Hook, Cross, Lead Hook, Cross, Pivot Left (3 - 2 - 3 - 2 - PL)
Lead Hook, Cross, Rear Hook, Lead Hook, Cross (3 - 2 - 4 - 3 - 2)
Lead Hook, Rear Hook, Lead Hook, Cross, Slip Right (3 - 4 - 3 - 2 - SR)
Rear Hook (4)
Rear Hook, Jab (4 - 1)
Rear Hook, Lead Hook (4 - 3)
Rear Hook, Lead Uppercut (4 - 5)
Rear Hook, Slip Left (4 - SL)
Rear Hook, Slip Right (4 - SR)
Rear Hook, Pivot Right (4 - PR)
Rear Hook, Step Right (4 - STR)
Rear Hook Body, Rear Hook Head (4B - 4)
Rear Hook Body, Jab (4B - 1)
Rear Hook, Jab, Cross (4 - 1 - 2)
Rear Hook, Lead Hook, Cross (4 - 3 - 2)
Rear Hook, Lead Hook, Rear Hook (4 - 3 - 4)
Rear Hook, Lead Uppercut, Cross (4 - 5 - 2)
Rear Hook, Slip Left, Lead Hook (4 - SL - 3)
Rear Hook, Duck Right, Lead Hook (4 - DR - 3)
Rear Hook Body, Lead Hook, Cross (4B - 3 - 2)
Rear Hook, Jab, Cross, Lead Hook (4 - 1 - 2 - 3)
Rear Hook, Lead Hook, Cross, Lead Hook (4 - 3 - 2 - 3)
Rear Hook, Lead Hook, Rear Hook, Lead Hook (4 - 3 - 4 - 3)
Rear Hook, Lead Hook, Cross, Slip Right (4 - 3 - 2 - SR)
Rear Hook, Lead Hook, Cross, Pivot Left (4 - 3 - 2 - PL)
Rear Hook Body, Lead Hook, Cross, Lead Hook (4B - 3 - 2 - 3)
Rear Hook, Jab, Cross, Lead Hook, Cross (4 - 1 - 2 - 3 - 2)
Rear Hook, Lead Hook, Cross, Lead Hook, Cross (4 - 3 - 2 - 3 - 2)
Rear Hook, Slip Left, Lead Hook, Cross, Lead Hook (4 - SL - 3 - 2 - 3)
Lead Uppercut (5)
Lead Uppercut, Cross (5 - 2)
Lead Uppercut, Rear Uppercut (5 - 6)
Lead Uppercut, Lead Hook (5 - 3)
Lead Uppercut, Slip Left (5 - SL)
Lead Uppercut, Slip Right (5 - SR)
Lead Uppercut Body, Rear Uppercut (5B - 6)
Lead Uppercut, Rear Uppercut, Lead Hook (5 - 6 - 3)
Lead Uppercut, Rear Uppercut, Cross (5 - 6 - 2)
Lead Uppercut, Cross, Lead Hook (5 - 2 - 3)
Lead Uppercut, Lead Hook, Cross (5 - 3 - 2)
Lead Uppercut, Cross, Slip Left (5 - 2 - SL)
Lead Uppercut, Cross, Slip Right (5 - 2 - SR)
Lead Uppercut Body, Rear Uppercut, Lead Hook (5B - 6 - 3)
Lead Uppercut, Rear Uppercut, Lead Hook, Cross (5 - 6 - 3 - 2)
Lead Uppercut, Rear Uppercut, Lead Hook, Rear Hook (5 - 6 - 3 - 4)
Lead Uppercut, Cross, Lead Hook, Cross (5 - 2 - 3 - 2)
Lead Uppercut, Lead Hook, Rear Hook, Cross (5 - 3 - 4 - 2)
Lead Uppercut, Cross, Lead Hook, Slip Left (5 - 2 - 3 - SL)
Lead Uppercut, Cross, Lead Hook, Pivot Left (5 - 2 - 3 - PL)
Lead Uppercut, Rear Uppercut, Lead Hook, Cross, Slip Right (5 - 6 - 3 - 2 - SR)
Lead Uppercut, Rear Uppercut, Lead Hook, Rear Hook, Cross (5 - 6 - 3 - 4 - 2)
Lead Uppercut, Cross, Lead Hook, Cross, Lead Hook (5 - 2 - 3 - 2 - 3)
Lead Uppercut, Cross, Lead Hook, Cross, Pivot Left (5 - 2 - 3 - 2 - PL)
Rear Uppercut (6)
Rear Uppercut, Lead Hook (6 - 3)
Rear Uppercut, Lead Uppercut (6 - 5)
Rear Uppercut, Jab (6 - 1)
Rear Uppercut, Slip Right (6 - SR)
Rear Uppercut, Pivot Right (6 - PR)
Rear Uppercut Body, Lead Hook (6B - 3)
Rear Uppercut, Lead Hook, Cross (6 - 3 - 2)
Rear Uppercut, Lead Hook, Rear Hook (6 - 3 - 4)
Rear Uppercut, Lead Uppercut, Lead Hook (6 - 5 - 3)
Rear Uppercut, Lead Hook, Slip Left (6 - 3 - SL)
Rear Uppercut, Lead Hook, Pivot Left (6 - 3 - PL)
Rear Uppercut Body, Lead Hook, Cross (6B - 3 - 2)
Rear Uppercut, Lead Hook, Cross, Lead Hook (6 - 3 - 2 - 3)
Rear Uppercut, Lead Hook, Rear Hook, Cross (6 - 3 - 4 - 2)
Rear Uppercut, Lead Hook, Cross, Slip Right (6 - 3 - 2 - SR)
Rear Uppercut, Lead Hook, Cross, Pivot Left (6 - 3 - 2 - PL)
Rear Uppercut, Lead Uppercut, Rear Uppercut, Lead Hook (6 - 5 - 6 - 3)
Rear Uppercut, Lead Hook, Cross, Lead Hook, Cross (6 - 3 - 2 - 3 - 2)
Rear Uppercut, Lead Hook, Rear Hook, Lead Hook, Cross (6 - 3 - 4 - 3 - 2)
Rear Uppercut Body, Lead Hook, Cross, Lead Hook, Slip Right (6B - 3 - 2 - 3 - SR)
Lead Overhand (7)
Lead Overhand, Rear Hook (7 - 4)
Lead Overhand, Cross (7 - 2)
Lead Overhand, Rear Uppercut (7 - 6)
Lead Overhand, Slip Right (7 - SR)
Lead Overhand, Pivot Left (7 - PL)
Lead Overhand, Step Left (7 - STL)
Lead Overhand, Rear Hook, Jab (7 - 4 - 1)
Lead Overhand, Rear Hook, Lead Hook (7 - 4 - 3)
Lead Overhand, Cross, Lead Hook (7 - 2 - 3)
Lead Overhand, Rear Uppercut, Lead Hook (7 - 6 - 3)
Lead Overhand, Rear Hook, Slip Left (7 - 4 - SL)
Lead Overhand, Rear Hook, Pivot Left (7 - 4 - PL)
Lead Overhand, Rear Hook, Step Left (7 - 4 - STL)
Lead Overhand, Rear Hook, Jab, Cross (7 - 4 - 1 - 2)
Lead Overhand, Rear Hook, Lead Hook, Cross (7 - 4 - 3 - 2)
Lead Overhand, Cross, Lead Hook, Rear Hook (7 - 2 - 3 - 4)
Lead Overhand, Rear Hook, Slip Left, Cross (7 - 4 - SL - 2)
Lead Overhand, Rear Hook, Jab, Cross, Lead Hook (7 - 4 - 1 - 2 - 3)
Lead Overhand, Cross, Lead Hook, Cross, Lead Hook (7 - 2 - 3 - 2 - 3)
Lead Overhand, Rear Hook, Lead Hook, Cross, Slip Right (7 - 4 - 3 - 2 - SR)
Lead Overhand, Rear Hook, Lead Hook, Cross, Pivot Left (7 - 4 - 3 - 2 - PL)
Rear Overhand (8)
Rear Overhand, Lead Hook (8 - 3)
Rear Overhand, Jab (8 - 1)
Rear Overhand, Lead Uppercut (8 - 5)
Rear Overhand, Slip Left (8 - SL)
Rear Overhand, Pivot Right (8 - PR)
Rear Overhand, Step Right (8 - STR)
Rear Overhand, Lead Hook, Cross (8 - 3 - 2)
Rear Overhand, Lead Hook, Rear Hook (8 - 3 - 4)
Rear Overhand, Jab, Cross (8 - 1 - 2)
Rear Overhand, Lead Uppercut, Cross (8 - 5 - 2)
Rear Overhand, Lead Hook, Slip Left (8 - 3 - SL)
Rear Overhand, Lead Hook, Pivot Left (8 - 3 - PL)
Rear Overhand, Lead Hook, Step Left (8 - 3 - STL)
Rear Overhand, Lead Hook, Cross, Lead Hook (8 - 3 - 2 - 3)
Rear Overhand, Lead Hook, Rear Hook, Cross (8 - 3 - 4 - 2)
Rear Overhand, Jab, Cross, Lead Hook (8 - 1 - 2 - 3)
Rear Overhand, Lead Hook, Cross, Slip Right (8 - 3 - 2 - SR)
Rear Overhand, Lead Hook, Cross, Pivot Left (8 - 3 - 2 - PL)
Rear Overhand, Lead Hook, Cross, Lead Hook, Cross (8 - 3 - 2 - 3 - 2)
Rear Overhand, Lead Hook, Rear Hook, Lead Hook, Cross (8 - 3 - 4 - 3 - 2)
Rear Overhand, Jab, Cross, Lead Hook, Rear Hook (8 - 1 - 2 - 3 - 4)
Rear Overhand, Lead Hook, Cross, Lead Hook, Slip Right (8 - 3 - 2 - 3 - SR)
Rear Overhand, Lead Hook, Cross, Lead Hook, Pivot Left (8 - 3 - 2 - 3 - PL)
Slip Left, Cross (SL - 2)
Slip Left, Lead Hook (SL - 3)
Slip Left, Rear Hook (SL - 4)
Slip Left, Lead Uppercut (SL - 5)
Slip Left, Rear Uppercut (SL - 6)
Slip Left, Cross, Lead Hook (SL - 2 - 3)
Slip Left, Lead Hook, Cross (SL - 3 - 2)
Slip Left, Rear Hook, Lead Hook (SL - 4 - 3)
Slip Left, Lead Uppercut, Cross (SL - 5 - 2)
Slip Left, Cross, Lead Hook, Cross (SL - 2 - 3 - 2)
Slip Left, Lead Hook, Cross, Lead Hook (SL - 3 - 2 - 3)
Slip Left, Rear Hook, Lead Hook, Cross (SL - 4 - 3 - 2)
Slip Left, Lead Uppercut, Cross, Lead Hook (SL - 5 - 2 - 3)
Slip Left, Cross, Lead Hook, Cross, Slip Right (SL - 2 - 3 - 2 - SR)
Slip Left, Lead Hook, Cross, Lead Hook, Cross (SL - 3 - 2 - 3 - 2)
Slip Right, Jab (SR - 1)
Slip Right, Lead Hook (SR - 3)
Slip Right, Lead Uppercut (SR - 5)
Slip Right, Rear Uppercut (SR - 6)
Slip Right, Jab, Cross (SR - 1 - 2)
Slip Right, Lead Hook, Cross (SR - 3 - 2)
Slip Right, Lead Uppercut, Cross (SR - 5 - 2)
Slip Right, Rear Uppercut, Lead Hook (SR - 6 - 3)
Slip Right, Jab, Cross, Lead Hook (SR - 1 - 2 - 3)
Slip Right, Lead Hook, Cross, Lead Hook (SR - 3 - 2 - 3)
Slip Right, Lead Uppercut, Cross, Lead Hook (SR - 5 - 2 - 3)
Slip Right, Rear Uppercut, Lead Hook, Cross (SR - 6 - 3 - 2)
Slip Right, Jab, Cross, Lead Hook, Cross (SR - 1 - 2 - 3 - 2)
Slip Right, Lead Hook, Cross, Lead Hook, Cross (SR - 3 - 2 - 3 - 2)
Block Left, Cross (BL - 2)
Block Left, Lead Hook (BL - 3)
Block Left, Rear Uppercut (BL - 6)
Block Left, Cross, Lead Hook (BL - 2 - 3)
Block Left, Lead Hook, Cross (BL - 3 - 2)
Block Left, Rear Uppercut, Lead Hook (BL - 6 - 3)
Block Left, Cross, Lead Hook, Cross (BL - 2 - 3 - 2)
Block Left, Lead Hook, Cross, Lead Hook (BL - 3 - 2 - 3)
Block Left, Cross, Lead Hook, Cross, Lead Hook (BL - 2 - 3 - 2 - 3)
Block Right, Jab (BR - 1)
Block Right, Lead Hook (BR - 3)
Block Right, Lead Uppercut (BR - 5)
Block Right, Jab, Cross (BR - 1 - 2)
Block Right, Lead Hook, Cross (BR - 3 - 2)
Block Right, Lead Uppercut, Cross (BR - 5 - 2)
Block Right, Jab, Cross, Lead Hook (BR - 1 - 2 - 3)
Block Right, Lead Hook, Cross, Lead Hook (BR - 3 - 2 - 3)
Block Right, Jab, Cross, Lead Hook, Cross (BR - 1 - 2 - 3 - 2)
Block Right, Lead Hook, Cross, Lead Hook, Cross (BR - 3 - 2 - 3 - 2)
Duck Left, Cross (DL - 2)
Duck Left, Rear Hook (DL - 4)
Duck Left, Rear Uppercut (DL - 6)
Duck Left, Cross, Lead Hook (DL - 2 - 3)
Duck Left, Rear Hook, Lead Hook (DL - 4 - 3)
Duck Left, Rear Uppercut, Lead Hook (DL - 6 - 3)
Duck Left, Cross, Lead Hook, Cross (DL - 2 - 3 - 2)
Duck Left, Rear Hook, Lead Hook, Cross (DL - 4 - 3 - 2)
Duck Left, Cross, Lead Hook, Cross, Lead Hook (DL - 2 - 3 - 2 - 3)
Duck Right, Jab (DR - 1)
Duck Right, Lead Hook (DR - 3)
Duck Right, Lead Uppercut (DR - 5)
Duck Right, Jab, Cross (DR - 1 - 2)
Duck Right, Lead Hook, Cross (DR - 3 - 2)
Duck Right, Lead Uppercut, Cross (DR - 5 - 2)
Duck Right, Jab, Cross, Lead Hook (DR - 1 - 2 - 3)
Duck Right, Lead Hook, Cross, Lead Hook (DR - 3 - 2 - 3)
Duck Right, Jab, Cross, Lead Hook, Cross (DR - 1 - 2 - 3 - 2)
Duck Right, Lead Hook, Cross, Lead Hook, Cross (DR - 3 - 2 - 3 - 2)
Pivot Left, Jab (PL - 1)
Pivot Left, Cross (PL - 2)
Pivot Left, Lead Hook (PL - 3)
Pivot Left, Jab, Cross (PL - 1 - 2)
Pivot Left, Lead Hook, Cross (PL - 3 - 2)
Pivot Left, Cross, Lead Hook (PL - 2 - 3)
Pivot Left, Jab, Cross, Lead Hook (PL - 1 - 2 - 3)
Pivot Left, Lead Hook, Cross, Lead Hook (PL - 3 - 2 - 3)
Pivot Left, Cross, Lead Hook, Cross (PL - 2 - 3 - 2)
Pivot Left, Jab, Cross, Lead Hook, Cross (PL - 1 - 2 - 3 - 2)
Pivot Left, Lead Hook, Cross, Lead Hook, Cross (PL - 3 - 2 - 3 - 2)
Pivot Right, Jab (PR - 1)
Pivot Right, Rear Hook (PR - 4)
Pivot Right, Rear Uppercut (PR - 6)
Pivot Right, Jab, Cross (PR - 1 - 2)
Pivot Right, Rear Hook, Lead Hook (PR - 4 - 3)
Pivot Right, Rear Uppercut, Lead Hook (PR - 6 - 3)
Pivot Right, Jab, Cross, Lead Hook (PR - 1 - 2 - 3)
Pivot Right, Rear Hook, Lead Hook, Cross (PR - 4 - 3 - 2)
Pivot Right, Jab, Cross, Lead Hook, Cross (PR - 1 - 2 - 3 - 2)
Pivot Right, Rear Hook, Lead Hook, Cross, Lead Hook (PR - 4 - 3 - 2 - 3)
Step Left, Jab (STL - 1)
Step Left, Lead Hook (STL - 3)
Step Left, Jab, Cross (STL - 1 - 2)
Step Left, Lead Hook, Cross (STL - 3 - 2)
Step Left, Jab, Cross, Lead Hook (STL - 1 - 2 - 3)
Step Left, Lead Hook, Cross, Lead Hook (STL - 3 - 2 - 3)
Step Left, Jab, Cross, Lead Hook, Cross (STL - 1 - 2 - 3 - 2)
Step Left, Lead Hook, Cross, Lead Hook, Cross (STL - 3 - 2 - 3 - 2)
Step Right, Jab (STR - 1)
Step Right, Cross (STR - 2)
Step Right, Rear Hook (STR - 4)
Step Right, Jab, Cross (STR - 1 - 2)
Step Right, Cross, Lead Hook (STR - 2 - 3)
Step Right, Rear Hook, Lead Hook (STR - 4 - 3)
Step Right, Jab, Cross, Lead Hook (STR - 1 - 2 - 3)
Step Right, Cross, Lead Hook, Cross (STR - 2 - 3 - 2)
Step Right, Jab, Cross, Lead Hook, Cross (STR - 1 - 2 - 3 - 2)
Step Right, Cross, Lead Hook, Cross, Lead Hook (STR - 2 - 3 - 2 - 3)
`;

const COMBO_RE = /^(.+?)\s*\(([^)]+)\)\s*$/;

export const BOXING_COMBOS: BoxingCombo[] = COMBO_TEXT.split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const m = COMBO_RE.exec(line);
    if (!m) throw new Error(`Unparseable combo line: "${line}"`);
    return parseCombo(m[1].trim(), m[2].trim());
  });

/**
 * Active-recovery moves used to fill the short rests between combos. Grouped by
 * body area in the source for readability; the generator draws from all of them.
 */
const RECOVERY_TEXT = `
# Lower Body
Squats
Sumo Squats
Pulse Squats
Wall Sit
Forward Lunges
Reverse Lunges
Side Lunges
Curtsy Lunges
Walking Lunges
Lateral Walks
Glute Bridges
Single-Leg Glute Bridge
Donkey Kicks
Fire Hydrants
Calf Raises
Single-Leg Calf Raises
Leg Swings (Forward/Back)
Leg Swings (Side to Side)
Knee Raises (Standing)
Ankle Circles
Toe Walks
Heel Walks
# Upper Body
Arm Circles (Forward)
Arm Circles (Backward)
Shoulder Rolls
Cross-Body Arm Swings
Chest Openers
Neck Rolls
Shoulder Shrugs
Overhead Reach and Side Bend
Lateral Arm Raises (Slow)
Front Arm Raises (Slow)
# Core
High Plank Hold
Low Plank Hold
Plank Hip Dips
Bird Dog
Standing Side Crunches
Slow Bicycle Crunches
Cat-Cow
Seated Torso Twists
Standing Oblique Reaches
Hollow Body Hold
Superman Hold
Slow Flutter Kicks
# Full Body / Cardio
Shadowboxing
Jumping Jacks
Slow Jumping Jacks
Star Jumps
March in Place
High Knees (Slow)
Butt Kicks (Slow)
Step Touches
Low-Impact Skaters
Inchworms
Bear Crawl
Crab Walk
Slow Burpees (No Jump)
Mountain Climbers (Slow)
Lateral Shuffles
Box Step-Ups
Stair Stepping
Slow Skip in Place
Twist Jumps
`;

export const RECOVERY_MOVES: Exercise[] = RECOVERY_TEXT.split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((name) => ({
    id: `rec-${slug(name)}`,
    name,
    goals: [],
    difficulty: "beginner" as Difficulty,
    cue: "Active recovery — keep moving, stay loose",
  }));

export interface ComboFilter {
  includeSlips: boolean;
  includeDucks: boolean;
  includeFootwork: boolean;
}

/**
 * Combos at or below the chosen punch-count level, dropping any whose elements
 * the user has switched off. Pure-punch combos are always eligible (subject to
 * the level ceiling). Falls back to pure-punch combos if the filters empty the
 * pool, so generation never fails.
 */
export function boxingComboPool(
  maxDifficulty: Difficulty,
  filter: ComboFilter,
): BoxingCombo[] {
  const cap = difficultyRank[maxDifficulty];
  const allowed = (c: BoxingCombo) =>
    (!c.hasSlipBlock || filter.includeSlips) &&
    (!c.hasDuck || filter.includeDucks) &&
    (!c.hasFootwork || filter.includeFootwork);

  const pool = BOXING_COMBOS.filter(
    (c) => difficultyRank[c.difficulty] <= cap && allowed(c),
  );
  if (pool.length > 0) return pool;
  return BOXING_COMBOS.filter(
    (c) =>
      difficultyRank[c.difficulty] <= cap &&
      !c.hasSlipBlock &&
      !c.hasDuck &&
      !c.hasFootwork,
  );
}

/** Adapt a combo to the Exercise shape the timeline/screens already render. */
export function comboToExercise(combo: BoxingCombo): Exercise {
  return {
    id: combo.id,
    name: combo.name,
    goals: [],
    difficulty: combo.difficulty,
    cue: combo.notation,
  };
}
