import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/contrib/mhchem"; // registers the \ce{} / \pu{} macros with katex on import

// Splits on $$...$$ (block) and $...$ (inline) delimiters and renders each
// math segment with KaTeX; everything else is plain text. Lets users write
// questions like "Calcule $\int_0^1 x^2\,dx$" or "$\ce{H2O + CO2}$" without
// any special editor.
const SPLIT = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split(SPLIT).filter((p) => p !== ""), [text]);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const block = part.startsWith("$$") && part.endsWith("$$");
        const inline = !block && part.startsWith("$") && part.endsWith("$");
        if (!block && !inline) return <Fragment key={i}>{part}</Fragment>;
        const src = part.slice(block ? 2 : 1, part.length - (block ? 2 : 1));
        try {
          const html = katex.renderToString(src, { throwOnError: false, displayMode: block });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <Fragment key={i}>{part}</Fragment>;
        }
      })}
    </span>
  );
}
