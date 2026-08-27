import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/contrib/mhchem"; // registers the \ce{} / \pu{} macros with katex on import
import { MoleculeDrawing } from "@/components/MoleculeDrawing";

// Splits on $$...$$ (block) and $...$ (inline) delimiters and renders each
// math segment with KaTeX; everything else is plain text. Lets users write
// questions like "Calcule $\int_0^1 x^2\,dx$" or "$\ce{H2O + CO2}$" without
// any special editor. $smiles{...}$ is a third kind of inline span — same
// delimiters, but rendered as a molecular structure (MoleculeDrawing)
// instead of being handed to KaTeX.
const SPLIT = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;
const SMILES_TOKEN = /^smiles\{(.+)\}$/;

export type MathSegment =
  | { kind: "text"; content: string }
  | { kind: "smiles"; smiles: string }
  | { kind: "math"; src: string; block: boolean };

// Pure text -> segments parser, kept separate from the component so it can
// be unit-tested without a DOM — the JSX below is then just a thin map over
// its output. Several $...$/\ce{}/$smiles{} spans in one string each get
// their own independent segment, in order, so they render side by side
// exactly as typed, however many there are.
export function parseMathSegments(text: string): MathSegment[] {
  return text
    .split(SPLIT)
    .filter((p) => p !== "")
    .map((part): MathSegment => {
      const block = part.startsWith("$$") && part.endsWith("$$");
      const inline = !block && part.startsWith("$") && part.endsWith("$");
      if (!block && !inline) return { kind: "text", content: part };
      const src = part.slice(block ? 2 : 1, part.length - (block ? 2 : 1));
      const smilesMatch = inline ? src.match(SMILES_TOKEN) : null;
      if (smilesMatch) return { kind: "smiles", smiles: smilesMatch[1] };
      return { kind: "math", src, block };
    });
}

interface MathTextProps {
  text: string;
  className?: string;
  // "inline" (default) sits a $smiles{}$ span beside the surrounding text,
  // wrapping with it — right for prose (notes). "omit" skips it from the
  // flow entirely, for callers that render the structures themselves
  // afterward, as a separate block below — see MoleculeStrip, and why
  // Questions use it instead of "inline" in CreateQuestionPage/
  // ReviewSessionPage: nesting the diagram's own box inside another
  // already-boxed preview looked broken, not "beside the text".
  smilesPlacement?: "inline" | "omit";
}

export function MathText({ text, className, smilesPlacement = "inline" }: MathTextProps) {
  const segments = useMemo(() => parseMathSegments(text), [text]);
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <Fragment key={i}>{seg.content}</Fragment>;
        if (seg.kind === "smiles") {
          if (smilesPlacement === "omit") return null;
          // Inline-block, small and fixed-size on purpose — it sits beside
          // the surrounding text (and wraps with it) rather than pushing a
          // full-width block underneath. Kept as a real React prop, never
          // dangerouslySetInnerHTML, since smiles comes from user content.
          return (
            <span
              key={i}
              className="inline-block align-middle rounded-md mx-1"
              style={{ width: 118, height: 92, padding: 4, background: "var(--surface2)", border: "1px solid var(--border)", verticalAlign: "middle" }}
            >
              <MoleculeDrawing smiles={seg.smiles} />
            </span>
          );
        }
        try {
          const html = katex.renderToString(seg.src, { throwOnError: false, displayMode: seg.block });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <Fragment key={i}>{seg.block ? `$$${seg.src}$$` : `$${seg.src}$`}</Fragment>;
        }
      })}
    </span>
  );
}

// Renders every $smiles{...}$ structure found in text as its own boxed
// diagram, in a wrapping row — paired with <MathText smilesPlacement="omit">
// so a structure shows as a block below the text's own box, not nested
// inside it. Renders nothing when text has no molecule span.
function isSmilesSegment(seg: MathSegment): seg is Extract<MathSegment, { kind: "smiles" }> {
  return seg.kind === "smiles";
}

export function MoleculeStrip({ text, className }: { text: string; className?: string }) {
  const molecules = useMemo(() => parseMathSegments(text).filter(isSmilesSegment), [text]);
  if (!molecules.length) return null;
  return (
    <div className={className} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {molecules.map((seg, i) => (
        <div
          key={i}
          className="rounded-md flex-none"
          style={{ width: 140, height: 112, padding: 5, background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <MoleculeDrawing smiles={seg.smiles} />
        </div>
      ))}
    </div>
  );
}
