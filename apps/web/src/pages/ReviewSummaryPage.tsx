import { useLocation, useNavigate } from "react-router-dom";
import { Dot } from "@/components/ui/Badge";

interface SummaryState {
  tally: { again: number; hard: number; good: number };
  total: number;
  minutes: number;
}

export function ReviewSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SummaryState | null;

  if (!state) {
    navigate("/review", { replace: true });
    return null;
  }

  const { tally, total, minutes } = state;
  const accuracy = total > 0 ? Math.round((tally.good / total) * 100) : 0;
  const errWord = tally.again > 1 ? "erreurs" : "erreur";

  const rows = [
    { label: "Maîtrisées", value: tally.good, colorVar: "--ok" },
    { label: "Difficiles", value: tally.hard, colorVar: "--warn" },
    { label: "Erreurs", value: tally.again, colorVar: "--err" },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] grid place-items-center p-6 bg-bg relative overflow-hidden">
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-30%", left: "50%", transform: "translateX(-50%)", width: 540, height: 340, borderRadius: "50%",
          background: "radial-gradient(closest-side, var(--accent-soft), transparent)",
        }}
      />
      <div className="relative w-full max-w-[400px] animate-rise">
        <h1 className="m-0 mb-1.5 text-[28px] font-medium tracking-tight">Session terminée 🎉</h1>
        <p className="m-0 mb-6 text-sm text-muted">
          {total} question{total > 1 ? "s" : ""} revue{total > 1 ? "s" : ""} · {tally.good} maîtrisée{tally.good > 1 ? "s" : ""}, {tally.hard} difficile{tally.hard > 1 ? "s" : ""}, {tally.again} {errWord}
        </p>

        <div className="border border-border rounded-[13px] bg-surface overflow-hidden mb-3.5">
          {rows.map((r, i) => (
            <div key={r.label} className="flex items-center gap-2.5 p-[11px_15px]" style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
              <Dot color={`var(${r.colorVar})`} />
              <span className="flex-1 text-[13.5px]">{r.label}</span>
              <span className="text-[15px] font-medium tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-[22px]">
          <div className="p-3.5 border border-border rounded-xl bg-surface">
            <div className="text-[11.5px] text-muted mb-[7px]">Temps</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-medium tracking-tight tabular-nums leading-none">{minutes}</span>
              <span className="text-xs" style={{ color: "var(--faint)" }}>min</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface" style={{ border: "1px solid var(--accent-line)" }}>
            <div className="text-[11.5px] text-muted mb-[7px]">Précision</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-medium tracking-tight tabular-nums leading-none" style={{ color: "var(--accent)" }}>{accuracy}</span>
              <span className="text-xs" style={{ color: "var(--faint)" }}>%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/review")}
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 text-[14.5px] font-medium rounded-[10px]"
            style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
          >
            Continuer
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 text-[14.5px] rounded-[10px]"
            style={{ color: "var(--text)", background: "transparent", border: "1px solid var(--border)" }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
