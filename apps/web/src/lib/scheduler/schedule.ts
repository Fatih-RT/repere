// Pure spaced-repetition scheduler — no React, no PocketBase SDK, no
// network. Takes a card's current scheduling state plus a rating, returns
// the next state. The caller (currently: the review session page, see PB
// step 5) is responsible for persisting the result: one `questions` update
// plus one `review_logs` create. That write happens client-side today,
// which is fine for a personal, two-user app — this module's pure
// signature means it could move into a `pb_hooks` server-side hook later
// without changing its interface, only who calls it.
//
// This is a corrected transposition of the old Express app's
// src/lib/srs.ts, fixing three bugs identified in review:
//   - ease factor had no upper bound (now capped at MAX_EASE)
//   - the first successful review jumped straight to 6 days, skipping the
//     1-day step (now: 1st success = 1 day, 2nd success = 6 days)
//   - no randomization, so a batch of cards created the same day would all
//     come due the same day forever (now: ±5% fuzz above 7 days)
// Also adds: a 365-day interval ceiling, and an explicit new/learning/review
// state machine (previously implicit in repetitions count alone).

export type SrsState = "new" | "learning" | "review";
export type Rating = "again" | "hard" | "good";

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const DEFAULT_EASE = 2.5;
export const MAX_INTERVAL_DAYS = 365;
export const FUZZ_THRESHOLD_DAYS = 7;
export const FUZZ_RATIO = 0.05;
export const AGAIN_INTERVAL_DAYS = 10 / 1440; // 10 minutes
export const FIRST_SUCCESS_INTERVAL_DAYS = 1;
export const SECOND_SUCCESS_INTERVAL_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CardState {
  state: SrsState;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

export interface ScheduleResult extends CardState {
  dueAt: Date;
}

export function newCardState(): CardState {
  return { state: "new", intervalDays: 0, easeFactor: DEFAULT_EASE, repetitions: 0, lapses: 0 };
}

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, Math.min(MAX_EASE, ease));
}

function applyFuzz(intervalDays: number, rand: () => number): number {
  if (intervalDays <= FUZZ_THRESHOLD_DAYS) return intervalDays;
  const factor = 1 + (rand() * 2 - 1) * FUZZ_RATIO; // uniform in [1-ratio, 1+ratio]
  return intervalDays * factor;
}

/**
 * @param rand injectable RNG for deterministic tests — defaults to Math.random.
 */
export function schedule(card: CardState, rating: Rating, now: Date = new Date(), rand: () => number = Math.random): ScheduleResult {
  let { repetitions, easeFactor, intervalDays, lapses } = card;
  let state: SrsState;

  if (rating === "again") {
    lapses += 1;
    repetitions = 0;
    easeFactor = clampEase(easeFactor - 0.2);
    intervalDays = AGAIN_INTERVAL_DAYS;
    state = "learning";
  } else if (rating === "hard") {
    repetitions += 1;
    easeFactor = clampEase(easeFactor - 0.15);
    intervalDays = 1;
    state = repetitions >= 2 ? "review" : "learning";
  } else {
    repetitions += 1;
    easeFactor = clampEase(easeFactor + 0.1);
    if (repetitions === 1) intervalDays = FIRST_SUCCESS_INTERVAL_DAYS;
    else if (repetitions === 2) intervalDays = SECOND_SUCCESS_INTERVAL_DAYS;
    else intervalDays = intervalDays * easeFactor;
    state = repetitions >= 2 ? "review" : "learning";
  }

  intervalDays = applyFuzz(intervalDays, rand);
  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  return { state, intervalDays, easeFactor, repetitions, lapses, dueAt };
}

// Display-only: the card's *current* difficulty, read off its ease factor.
// Replaces the old manually-entered `difficulty` field — the scheduler
// already knows how hard a card has been in practice, so asking the user
// to also guess a label was pure friction for a value with no effect.
export function easeToDifficulty(easeFactor: number): "Facile" | "Moyen" | "Difficile" {
  if (easeFactor >= 2.3) return "Facile";
  if (easeFactor >= 1.7) return "Moyen";
  return "Difficile";
}

// Separate from difficulty: how "mastered" a card looks in progress bars,
// derived from how far out it's scheduled. Capped well below
// MAX_INTERVAL_DAYS on purpose — a bar that only fills up after a full
// year would never look full in practice.
export const MASTERY_CAP_DAYS = 60;

export function masteryPct(intervalDays: number, capDays: number = MASTERY_CAP_DAYS): number {
  return Math.max(0, Math.min(100, Math.round((intervalDays / capDays) * 100)));
}

export function avgMastery(intervalDaysList: number[]): number {
  if (intervalDaysList.length === 0) return 0;
  const total = intervalDaysList.reduce((sum, d) => sum + masteryPct(d), 0);
  return Math.round(total / intervalDaysList.length);
}
