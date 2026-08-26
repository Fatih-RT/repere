import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MathText } from "@/components/MathText";

interface MemoEntry {
  syntax: string;
  desc: string;
}

interface MemoSection {
  title: string;
  entries: MemoEntry[];
}

const SECTIONS: MemoSection[] = [
  {
    title: "Les bases",
    entries: [
      { syntax: "$x^2$", desc: "Exposant" },
      { syntax: "$x_1$", desc: "Indice" },
      { syntax: "$\\frac{a}{b}$", desc: "Fraction" },
      { syntax: "$\\sqrt{x}$", desc: "Racine carrée" },
      { syntax: "$\\sqrt[3]{x}$", desc: "Racine cubique" },
      { syntax: "$x \\times y$", desc: "Multiplication" },
      { syntax: "$x \\leq y$ · $x \\geq y$", desc: "Inférieur/supérieur ou égal" },
      { syntax: "$\\pm 5$", desc: "Plus ou moins" },
    ],
  },
  {
    title: "Analyse",
    entries: [
      { syntax: "$\\int_0^1 x^2\\,dx$", desc: "Intégrale" },
      { syntax: "$\\lim_{x \\to 0} f(x)$", desc: "Limite" },
      { syntax: "$\\sum_{i=1}^n i$", desc: "Somme" },
      { syntax: "$\\frac{d y}{d x}$", desc: "Dérivée" },
    ],
  },
  {
    title: "Chimie (mhchem)",
    entries: [
      { syntax: "$\\ce{H2O}$", desc: "Formule chimique" },
      { syntax: "$\\ce{2H2 + O2 -> 2H2O}$", desc: "Équation de réaction" },
      { syntax: "$\\ce{Na+ + Cl- -> NaCl}$", desc: "Ions" },
      { syntax: "$\\ce{CO2 ->[\\Delta]}$", desc: "Condition au-dessus de la flèche" },
      { syntax: "$\\ce{H2SO4}$", desc: "Indices automatiques" },
    ],
  },
  {
    title: "Grec et symboles",
    entries: [
      { syntax: "$\\alpha$ · $\\beta$ · $\\gamma$ · $\\pi$ · $\\Delta$ · $\\theta$", desc: "Lettres grecques" },
      { syntax: "$\\infty$", desc: "Infini" },
      { syntax: "$\\rightarrow$", desc: "Flèche" },
      { syntax: "$\\approx$", desc: "Environ égal" },
    ],
  },
];

// Every $...$ becomes an inline formula, $$...$$ a centered block one —
// see MathText.tsx. This memo is the reference for that syntax, dropped
// wherever someone is actually about to type a formula (question/réponse,
// notes) rather than tucked away in a settings page nobody visits.
export function FormulaHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11.5px] hover:underline"
        style={{ color: "var(--accent)" }}
      >
        <i className="ph ph-question" style={{ fontSize: 12.5 }} />
        Aide formules
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Écriture scientifique">
        <p className="m-0 mb-4 text-[12.5px]" style={{ color: "var(--faint)", textWrap: "pretty" }}>
          Entoure une formule de <code className="px-1 rounded" style={{ background: "var(--surface2)" }}>$…$</code> pour
          l'afficher en ligne, ou de <code className="px-1 rounded" style={{ background: "var(--surface2)" }}>$$…$$</code> pour
          un bloc centré. Fonctionne dans les questions, réponses et notes.
        </p>
        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-[11px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--faint)" }}>{section.title}</div>
              <div className="border border-border rounded-lg bg-surface2 overflow-hidden">
                {section.entries.map((e, i) => (
                  <div
                    key={e.syntax}
                    className="flex items-center gap-3 p-[9px_12px] flex-wrap sm:flex-nowrap"
                    style={{ borderTop: i ? "1px solid var(--border)" : "none" }}
                  >
                    <code className="text-[12px] flex-1 min-w-[140px]" style={{ color: "var(--text)" }}>{e.syntax}</code>
                    <span className="text-[11.5px] flex-none order-3 sm:order-none w-full sm:w-auto" style={{ color: "var(--faint)" }}>{e.desc}</span>
                    <span className="text-[14px] flex-none ml-auto" style={{ color: "var(--accent)" }}>
                      <MathText text={e.syntax} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
