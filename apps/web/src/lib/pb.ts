import PocketBase from "pocketbase";

// Same-origin in production (this build is served by PocketBase itself from
// pb_public/); relative "/" also works in dev thanks to the Vite proxy in
// vite.config.ts. No base URL to configure per environment.
export const pb = new PocketBase("/");

// React Query already owns caching/dedup/cancellation for us — PocketBase's
// own auto-cancellation (which aborts an in-flight request when an
// identical one fires from another component) fights that and causes
// spurious "autocancelled" errors.
pb.autoCancellation(false);

// PocketBase stores date/autodate fields as "YYYY-MM-DD HH:MM:SS.sssZ" (space
// separator) and its filter engine compares them as plain strings, not
// parsed dates. Date.toISOString() uses a "T" separator instead — for a
// same-day comparison that mismatch makes the filter compare on the
// separator character rather than the time of day, so it silently returns
// the wrong rows. Always run a Date through this before putting it in a
// pb.filter() date comparison.
export function pbDate(d: Date): string {
  return d.toISOString().replace("T", " ");
}
