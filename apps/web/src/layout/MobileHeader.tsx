import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import type { AppUser } from "@/lib/types";
import { initials } from "@/lib/format";

export function MobileHeader({ user, streak }: { user: AppUser; streak: number }) {
  const navigate = useNavigate();
  return (
    <div className="md:hidden flex items-center gap-2.5 px-4 py-3 border-b border-border">
      <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5 mr-auto">
        <div className="w-2.5 h-2.5 rotate-45 rounded-[1px]" style={{ background: "var(--accent)" }} />
        <span className="font-medium text-[15px] tracking-tight">Repère</span>
      </button>
      <div className="inline-flex items-center gap-[5px] px-[9px] py-1 border border-border rounded-full text-xs">
        <i className="ph-fill ph-flame" style={{ fontSize: 13, color: "var(--accent)" }} />
        <span className="tabular-nums">{streak}</span>
      </div>
      {/* One tap from any screen — the fast-entry requirement for question creation on mobile. */}
      <button
        type="button"
        onClick={() => navigate("/create")}
        className="w-8 h-8 grid place-items-center rounded-md hover:bg-hover"
        style={{ color: "var(--accent)" }}
        aria-label="Nouvelle question"
      >
        <i className="ph ph-plus" style={{ fontSize: 18 }} />
      </button>
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="w-8 h-8 grid place-items-center rounded-md hover:bg-hover"
        style={{ color: "var(--muted)" }}
      >
        <i className="ph ph-sliders-horizontal" style={{ fontSize: 17 }} />
      </button>
      <Avatar initials={initials(user.name)} size={30} />
    </div>
  );
}
