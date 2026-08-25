import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { useDashboard } from "@/lib/dashboard";
import type { AppUser } from "@/lib/types";

export function AppShell({ user }: { user: AppUser }) {
  const { data } = useDashboard();
  const dueCount = data?.dueCount ?? 0;
  const streak = data?.streak.current ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
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
