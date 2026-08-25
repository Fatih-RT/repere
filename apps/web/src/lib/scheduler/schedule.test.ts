import { describe, expect, it } from "vitest";
import {
  AGAIN_INTERVAL_DAYS,
  DEFAULT_EASE,
  FIRST_SUCCESS_INTERVAL_DAYS,
  MAX_EASE,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  SECOND_SUCCESS_INTERVAL_DAYS,
  easeToDifficulty,
  masteryPct,
  newCardState,
  schedule,
} from "./schedule";

const noFuzz = () => 0.5; // applyFuzz maps 0.5 -> factor 1 (no change), for deterministic assertions

describe("newCardState", () => {
  it("starts fresh: new, no interval, default ease, zero reps/lapses", () => {
    const card = newCardState();
    expect(card).toEqual({ state: "new", intervalDays: 0, easeFactor: DEFAULT_EASE, repetitions: 0, lapses: 0 });
  });
});

describe("schedule — success path", () => {
  it("first success sets a 1-day interval and moves to learning", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = schedule(newCardState(), "good", now, noFuzz);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(FIRST_SUCCESS_INTERVAL_DAYS);
    expect(result.state).toBe("learning");
    expect(result.dueAt.getTime()).toBe(now.getTime() + FIRST_SUCCESS_INTERVAL_DAYS * 86400000);
  });

  it("second consecutive success sets a 6-day interval and graduates to review", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const afterFirst = schedule(newCardState(), "good", now, noFuzz);
    const afterSecond = schedule(afterFirst, "good", now, noFuzz);
    expect(afterSecond.repetitions).toBe(2);
    expect(afterSecond.intervalDays).toBe(SECOND_SUCCESS_INTERVAL_DAYS);
    expect(afterSecond.state).toBe("review");
  });

  it("third+ success grows the interval by the (newly updated) ease factor, not a fixed step", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    let card = schedule(newCardState(), "good", now, noFuzz);
    card = schedule(card, "good", now, noFuzz); // interval = 6, ease = 2.7
    const third = schedule(card, "good", now, noFuzz);
    // Ease is bumped by +0.1 *before* being applied to this same call's interval.
    expect(third.intervalDays).toBeCloseTo(card.intervalDays * third.easeFactor, 5);
    expect(third.intervalDays).toBeGreaterThan(SECOND_SUCCESS_INTERVAL_DAYS);
  });

  it("ease factor increases by 0.1 per success", () => {
    const result = schedule(newCardState(), "good", new Date(), noFuzz);
    expect(result.easeFactor).toBeCloseTo(DEFAULT_EASE + 0.1, 5);
  });
});

describe("schedule — failure (again)", () => {
  it("resets repetitions to 0, drops to a short 10-minute box, and counts a lapse", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    let card = schedule(newCardState(), "good", now, noFuzz);
    card = schedule(card, "good", now, noFuzz); // graduated to review, repetitions=2
    const failed = schedule(card, "again", now, noFuzz);
    expect(failed.repetitions).toBe(0);
    expect(failed.lapses).toBe(1);
    expect(failed.intervalDays).toBeCloseTo(AGAIN_INTERVAL_DAYS, 8);
    expect(failed.state).toBe("learning");
  });

  it("ease factor decreases by 0.2 on failure", () => {
    const result = schedule(newCardState(), "again", new Date(), noFuzz);
    expect(result.easeFactor).toBeCloseTo(DEFAULT_EASE - 0.2, 5);
  });
});

describe("schedule — relapse after long-term review", () => {
  it("a mastered card (long interval, high ease) that fails goes right back to a 10-minute box", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    let card = { state: "review" as const, intervalDays: 120, easeFactor: 2.6, repetitions: 8, lapses: 1 };
    const relapsed = schedule(card, "again", now, noFuzz);
    expect(relapsed.intervalDays).toBeCloseTo(AGAIN_INTERVAL_DAYS, 8);
    expect(relapsed.repetitions).toBe(0);
    expect(relapsed.lapses).toBe(2);
    expect(relapsed.state).toBe("learning");
  });
});

describe("schedule — hard", () => {
  it("always sets a 1-day interval regardless of prior interval", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const card = { state: "review" as const, intervalDays: 40, easeFactor: 2.5, repetitions: 5, lapses: 0 };
    const result = schedule(card, "hard", now, noFuzz);
    expect(result.intervalDays).toBe(1);
  });

  it("ease factor decreases by 0.15", () => {
    const result = schedule(newCardState(), "hard", new Date(), noFuzz);
    expect(result.easeFactor).toBeCloseTo(DEFAULT_EASE - 0.15, 5);
  });
});

describe("ease factor bounds", () => {
  it("never drops below MIN_EASE even after many failures", () => {
    let card = newCardState();
    for (let i = 0; i < 20; i++) card = schedule(card, "again", new Date(), noFuzz);
    expect(card.easeFactor).toBeGreaterThanOrEqual(MIN_EASE);
    expect(card.easeFactor).toBe(MIN_EASE);
  });

  it("never exceeds MAX_EASE even after many successes", () => {
    let card = newCardState();
    for (let i = 0; i < 20; i++) card = schedule(card, "good", new Date(), noFuzz);
    expect(card.easeFactor).toBeLessThanOrEqual(MAX_EASE);
    expect(card.easeFactor).toBe(MAX_EASE);
  });
});

describe("interval ceiling", () => {
  it("never exceeds MAX_INTERVAL_DAYS even from a very long starting interval", () => {
    const now = new Date();
    const card = { state: "review" as const, intervalDays: 350, easeFactor: MAX_EASE, repetitions: 10, lapses: 0 };
    const result = schedule(card, "good", now, noFuzz);
    expect(result.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    expect(result.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("fuzz", () => {
  it("never fuzzes intervals at or below the 7-day threshold", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const alwaysMax = () => 1; // would push furthest from center if applied
    const result = schedule(newCardState(), "good", now, alwaysMax); // interval = 1 day, below threshold
    expect(result.intervalDays).toBe(FIRST_SUCCESS_INTERVAL_DAYS);
  });

  it("stays within ±5% for intervals above the threshold", () => {
    const now = new Date();
    const card = { state: "review" as const, intervalDays: 20, easeFactor: 2.5, repetitions: 3, lapses: 0 };
    const base = 20 * 2.6; // repetitions becomes 4, ease becomes 2.6, no fuzz
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const result = schedule(card, "good", now, () => r);
      expect(result.intervalDays).toBeGreaterThanOrEqual(base * 0.95 - 1e-6);
      expect(result.intervalDays).toBeLessThanOrEqual(base * 1.05 + 1e-6);
    }
  });
});

describe("easeToDifficulty", () => {
  it("buckets ease factor into three display labels", () => {
    expect(easeToDifficulty(2.8)).toBe("Facile");
    expect(easeToDifficulty(2.3)).toBe("Facile");
    expect(easeToDifficulty(2.0)).toBe("Moyen");
    expect(easeToDifficulty(1.7)).toBe("Moyen");
    expect(easeToDifficulty(1.5)).toBe("Difficile");
    expect(easeToDifficulty(1.3)).toBe("Difficile");
  });
});

describe("masteryPct", () => {
  it("scales 0..capDays to 0..100 and clamps", () => {
    expect(masteryPct(0)).toBe(0);
    expect(masteryPct(30)).toBe(50);
    expect(masteryPct(60)).toBe(100);
    expect(masteryPct(365)).toBe(100); // clamped, not 608%
  });
});
