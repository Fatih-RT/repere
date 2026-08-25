import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

const TZ = "UTC";
const CUTOFF = 0;
const NOW = new Date("2026-08-25T12:00:00.000Z"); // a Tuesday

function daysAgoIso(n: number): string {
  return new Date(NOW.getTime() - n * 86400000).toISOString();
}

describe("computeStreak", () => {
  it("returns zero for no history", () => {
    expect(computeStreak([], NOW, TZ, CUTOFF)).toEqual({ current: 0, activeDaysLast30: 0 });
  });

  it("counts a single review today as a 1-day streak, not more", () => {
    const result = computeStreak([daysAgoIso(0)], NOW, TZ, CUTOFF);
    expect(result.current).toBe(1);
  });

  it("counts consecutive days including today", () => {
    const logs = [0, 1, 2, 3, 4].map(daysAgoIso);
    expect(computeStreak(logs, NOW, TZ, CUTOFF).current).toBe(5);
  });

  it("does not break the streak when today hasn't happened yet but yesterday was active", () => {
    const logs = [1, 2, 3].map(daysAgoIso); // yesterday, day-2, day-3 active; today not yet
    expect(computeStreak(logs, NOW, TZ, CUTOFF).current).toBe(3);
  });

  it("bridges exactly one missed day per rolling 7-day block", () => {
    // active today, missing yesterday, active days 2-4
    const logs = [0, 2, 3, 4].map(daysAgoIso);
    expect(computeStreak(logs, NOW, TZ, CUTOFF).current).toBe(5);
  });

  it("breaks the streak on two consecutive missed days", () => {
    // active today, missing yesterday AND day-2, active day-3
    const logs = [0, 3].map(daysAgoIso);
    expect(computeStreak(logs, NOW, TZ, CUTOFF).current).toBe(1);
  });

  it("never uses a grace day to pad a streak with nothing behind it", () => {
    // active today only, everything before is empty — a grace day must
    // not manufacture a fake day-2 out of thin air.
    const logs = [0].map(daysAgoIso);
    expect(computeStreak(logs, NOW, TZ, CUTOFF).current).toBe(1);
  });

  it("computes activeDaysLast30 independently of streak breaks", () => {
    const logs = [0, 5, 10, 29].map(daysAgoIso);
    expect(computeStreak(logs, NOW, TZ, CUTOFF).activeDaysLast30).toBe(4);
  });
});
