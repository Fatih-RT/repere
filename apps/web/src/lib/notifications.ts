// The achievable slice of "notifications" without a Web Push backend
// (VAPID keys, a service worker push handler, a server-side cron): a
// due-cards reminder fired via the standard Notification API while the
// app is actually open in a tab (or running as an installed PWA) — never
// while the device is asleep or the app fully closed. Explained to the
// user rather than silently shipped as if it were the real thing.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return Promise.resolve("denied");
  return Notification.requestPermission();
}

const LAST_NOTIFIED_KEY = "repere_due_notif_day";

// Fires at most once per app-day (see lib/day.ts) so opening the app
// repeatedly in the same day doesn't re-notify every time.
export function maybeNotifyDueCards(dueCount: number, dayKey: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (dueCount <= 0) return;
  try {
    if (window.localStorage.getItem(LAST_NOTIFIED_KEY) === dayKey) return;
    window.localStorage.setItem(LAST_NOTIFIED_KEY, dayKey);
  } catch {
    return; // localStorage unavailable (private mode, etc.) — skip rather than risk spamming
  }
  new Notification("Repère", {
    body: `${dueCount} question${dueCount > 1 ? "s" : ""} à réviser aujourd'hui.`,
    icon: "/icon-192.png",
  });
}
