// Timezone- and cutoff-hour-aware "app day" boundaries. A student reviewing
// at 1am should still have that count toward yesterday until
// user_settings.day_cutoff_hour — used by the review queue's daily limits
// (PB step 5) and the dashboard streak (PB step 6).

function offsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - utcMs;
}

// Local wall-clock (Y/M/D h:m:s) in `timeZone` -> the UTC instant it refers to.
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  return guess - offsetMs(guess, timeZone);
}

function prevCalendarDay(y: number, mo: number, d: number): { y: number; mo: number; d: number } {
  const t = new Date(Date.UTC(y, mo - 1, d - 1));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// Start (as a UTC instant) of the "app day" containing `now`, where a day
// runs from `cutoffHour` to `cutoffHour` the next calendar day.
export function appDayStart(now: Date, timeZone: string, cutoffHour: number): Date {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let y = get("year"), mo = get("month"), d = get("day");
  const h = get("hour") % 24;
  if (h < cutoffHour) ({ y, mo, d } = prevCalendarDay(y, mo, d));
  return new Date(zonedToUtc(y, mo, d, cutoffHour, 0, 0, timeZone));
}

// A stable per-app-day key (e.g. "2026-08-25"), for grouping/streak calc.
export function appDayKey(now: Date, timeZone: string, cutoffHour: number): string {
  const start = appDayStart(now, timeZone, cutoffHour);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(start);
}
