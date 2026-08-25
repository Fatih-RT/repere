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
