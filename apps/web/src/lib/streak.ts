import { appDayKey } from "./day";

export interface StreakResult {
  current: number;
  activeDaysLast30: number;
}

const MAX_WALK_DAYS = 3650; // safety cap, not a real limit

// Streak with one forgiven ("grace") missed day per rolling 7-day block —
// but a grace day only ever bridges back to another real active day, it
// never pads a streak that has nothing further behind it (so a single
// review today doesn't manufacture a fake "2-day streak" out of nothing).
// Paired with `activeDaysLast30`, a non-punitive companion metric that
// doesn't reset on a missed day at all — see the dashboard's streak card.
export function computeStreak(reviewedAtList: string[], now: Date, timezone: string, cutoffHour: number): StreakResult {
  const activeDays = new Set(reviewedAtList.map((d) => appDayKey(new Date(d), timezone, cutoffHour)));
  const dayKeyAt = (offset: number) => appDayKey(new Date(now.getTime() - offset * 86400000), timezone, cutoffHour);

  let activeDaysLast30 = 0;
  for (let i = 0; i < 30; i++) if (activeDays.has(dayKeyAt(i))) activeDaysLast30 += 1;

  if (activeDays.size === 0) return { current: 0, activeDaysLast30 };

  // A streak isn't broken just because today isn't over yet — start
  // counting from the most recent day that's either active or already past.
  const startOffset = activeDays.has(dayKeyAt(0)) ? 0 : 1;

  let current = 0;
  let graceUsedInBlock = -1;
  for (let i = startOffset; i - startOffset < MAX_WALK_DAYS; i++) {
    if (activeDays.has(dayKeyAt(i))) {
      current += 1;
      continue;
    }
    const blockIndex = Math.floor((i - startOffset) / 7);
    if (graceUsedInBlock !== blockIndex && activeDays.has(dayKeyAt(i + 1))) {
      graceUsedInBlock = blockIndex;
      current += 1;
      continue;
    }
    break;
  }
  return { current, activeDaysLast30 };
}
