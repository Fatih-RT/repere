import { memo, useEffect, useRef, useState } from "react";
import SmilesDrawer from "smiles-drawer";
import { useTheme } from "@/theme/ThemeProvider";

interface MoleculeDrawingProps {
  smiles: string;
  className?: string;
}

// Element accent colors follow the universal CPK chemistry convention (O
// red, N blue, S yellow, halogens green/purple/orange…) — these are
// illustrative science colors, not brand colors, so they stay fixed across
// themes. Only the part that actually breaks dark mode — bond/carbon-label
// foreground and background — comes from the app's own design tokens,
// read live off the DOM so this can never drift from theme.css.
const CPK: Record<string, string> = {
  O: "#e15b5b",
  N: "#4a90d9",
  F: "#3fae6a",
  CL: "#2ea394",
  BR: "#d9822b",
  I: "#9b59b6",
  P: "#d9822b",
  S: "#d4ac0d",
  B: "#e0883d",
  SI: "#e0883d",
};

function readVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function buildTheme(el: Element) {
  const foreground = readVar(el, "--text", "#e9e9ed");
  const faint = readVar(el, "--faint", "#9a9aa2");
  return { FOREGROUND: foreground, BACKGROUND: "transparent", C: foreground, H: faint, ...CPK };
}

// A single, isolated seam onto smiles-drawer (npm: smiles-drawer — pure
// JS/SVG, no native/WASM dependency, unlike RDKit). Everything that knows
// this library's API lives in this one file, so swapping it later (e.g.
// for stereochemistry support) means touching one component, not every
// call site.
export const MoleculeDrawing = memo(function MoleculeDrawing({ smiles, className }: MoleculeDrawingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const [error, setError] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    setError(false);

    let cancelled = false;
    const drawer = new SmilesDrawer.SvgDrawer({ themes: { app: buildTheme(svg) } });
    SmilesDrawer.parse(
      smiles,
      (tree) => {
        if (cancelled) return;
        try {
          drawer.draw(tree, svg, "app", false);
        } catch {
          setError(true);
        }
      },
      () => { if (!cancelled) setError(true); }
    );
    return () => { cancelled = true; };
  }, [smiles, theme]);

  if (error) {
    return (
      <div className={className} style={{ color: "var(--faint)", fontSize: 12.5, textAlign: "center" }}>
        <div>Structure invalide</div>
        <div style={{ fontSize: 11, marginTop: 2, wordBreak: "break-all" }}>{smiles}</div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      role="img"
      aria-label={`Structure moléculaire : ${smiles}`}
      style={{ width: "100%", height: "auto", maxWidth: "100%", display: "block" }}
    />
  );
});
