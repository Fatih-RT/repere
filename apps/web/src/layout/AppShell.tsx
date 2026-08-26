import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { useDashboard } from "@/lib/dashboard";
import { useSettings } from "@/lib/queries";
import { appDayKey } from "@/lib/day";
import { maybeNotifyDueCards } from "@/lib/notifications";
import type { AppUser } from "@/lib/types";

export function AppShell({ user }: { user: AppUser }) {
  const { data } = useDashboard();
  const { data: settings } = useSettings();
  const dueCount = data?.dueCount ?? 0;
  const streak = data?.streak.current ?? 0;

  // Fires a real browser notification while the app is open — see
  // lib/notifications.ts for why this is the achievable slice of
  // "Notifications" and not a true background reminder.
  useEffect(() => {
    if (!settings?.notif || dueCount <= 0) return;
    const dayKey = appDayKey(new Date(), settings.timezone, settings.day_cutoff_hour);
    maybeNotifyDueCards(dueCount, dayKey);
  }, [settings?.notif, settings?.timezone, settings?.day_cutoff_hour, dueCount]);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col bg-bg text-text"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <MobileHeader user={user} streak={streak} />
      <div className="flex-1 flex min-h-0">
        <Sidebar user={user} dueCount={dueCount} />
        <main className="flex-1 min-w-0 px-4 py-[18px] pb-[26px] md:px-[30px] md:pt-[26px] md:pb-10 overflow-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
