import { NavLink, useLocation } from "react-router-dom";
import { bottomNav } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div
      className="md:hidden flex items-stretch gap-0.5 px-2 pt-[7px] sticky bottom-0 border-t border-border bg-surface2"
      style={{ paddingBottom: "max(9px, env(safe-area-inset-bottom))" }}
    >
      {bottomNav.map((item) => {
        const active = item.match(pathname);
        const mid = item.to === "/review";
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] py-1.5 rounded-lg",
              mid && "border"
            )}
            style={{
              borderColor: mid ? "var(--accent-line)" : undefined,
              background: mid || active ? "var(--accent-soft)" : "transparent",
              color: mid || active ? "var(--accent)" : "var(--muted)",
              fontWeight: mid || active ? 500 : 400,
            }}
          >
            <i className={item.icon} style={{ fontSize: 19 }} />
            <span className="text-[10.5px] tracking-[0.01em]">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
