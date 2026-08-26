import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { sidebarNav } from "@/lib/nav";
import { Avatar } from "@/components/ui/Avatar";
import type { AppUser } from "@/lib/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Sidebar({ user, dueCount }: { user: AppUser; dueCount: number }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const settingsActive = pathname === "/settings";

  return (
    <div className="hidden md:flex flex-col gap-[5px] w-[62px] lg:w-[234px] flex-none px-3 py-4 border-r border-border bg-surface2">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 px-2 pb-0.5 self-start"
      >
        <div className="w-2.5 h-2.5 rotate-45 rounded-[1px]" style={{ background: "var(--accent)" }} />
        <span className="hidden lg:inline font-medium text-[15.5px] tracking-tight">Repère</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/review")}
        className="w-full inline-flex items-center gap-[9px] mt-3.5 px-2.5 min-h-10 text-[13.5px] font-medium rounded-md justify-center lg:justify-start"
        style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
      >
        <i className="ph ph-play-circle" style={{ fontSize: 16 }} />
        <span className="hidden lg:inline">Nouvelle révision</span>
        {dueCount > 0 && (
          <span
            className="hidden lg:inline ml-auto text-[11px] tabular-nums px-[7px] py-px rounded-full"
            style={{ color: "var(--accent)", background: "var(--accent-soft2)" }}
          >
            {dueCount}
          </span>
        )}
      </button>

      <div className="flex flex-col gap-0.5 mt-1.5">
        {sidebarNav.map((item) => {
          const active = item.match(pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 lg:px-[9px] py-2 rounded-md text-[13.5px] min-h-[38px] justify-center lg:justify-start",
                active ? "font-medium" : "font-normal hover:bg-hover"
              )}
              style={active ? { color: "var(--accent)", background: "var(--accent-soft)" } : { color: "var(--text)" }}
            >
              <i className={item.icon} style={{ fontSize: 17 }} />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto pt-3">
        <div
          className="h-px mb-3"
          style={{
            background: "linear-gradient(to right, transparent, var(--border) 24px, var(--border) calc(100% - 24px), transparent)",
          }}
        />
        <NavLink
          to="/settings"
          title="Paramètres"
          className={cn(
            "w-full flex items-center gap-2.5 px-2 lg:px-[9px] py-2 mb-0.5 rounded-md text-[13.5px] min-h-[38px] justify-center lg:justify-start",
            settingsActive ? "font-medium" : "font-normal hover:bg-hover"
          )}
          style={settingsActive ? { color: "var(--accent)", background: "var(--accent-soft)" } : { color: "var(--text)" }}
        >
          <i className="ph ph-sliders-horizontal" style={{ fontSize: 17 }} />
          <span className="hidden lg:inline">Paramètres</span>
        </NavLink>
        {/* Just an identity readout, not a second way to reach Paramètres —
            see nav.ts for why "/settings" isn't in sidebarNav too. */}
        <div className="w-full flex items-center gap-2.5 px-2 py-[7px]">
          <Avatar initials={initials(user.name)} size={28} />
          <div className="hidden lg:block min-w-0">
            <div className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</div>
            <div className="text-[11px]" style={{ color: "var(--faint)" }}>
              {user.class_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
