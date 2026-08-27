import { describe, expect, it } from "vitest";
import { parseMathSegments } from "./MathText";

describe("parseMathSegments", () => {
  it("renders a $smiles{...}$ span as a smiles segment", () => {
    expect(parseMathSegments("Structure : $smiles{CCO}$")).toEqual([
      { kind: "text", content: "Structure : " },
      { kind: "smiles", smiles: "CCO" },
    ]);
  });

  it("keeps a \\ce{} equation as a math segment, unaffected by the smiles handling", () => {
    expect(parseMathSegments("$\\ce{2H2 + O2 -> 2H2O}$")).toEqual([
      { kind: "math", src: "\\ce{2H2 + O2 -> 2H2O}", block: false },
    ]);
  });

  it("handles several $smiles{}/$...$/\\ce{} spans coexisting in one string, in order", () => {
    const text = "Le $\\ce{C2H6O}$ a deux isomères : $smiles{CCO}$ et $smiles{COC}$, formule $x^2$.";
    expect(parseMathSegments(text)).toEqual([
      { kind: "text", content: "Le " },
      { kind: "math", src: "\\ce{C2H6O}", block: false },
      { kind: "text", content: " a deux isomères : " },
      { kind: "smiles", smiles: "CCO" },
      { kind: "text", content: " et " },
      { kind: "smiles", smiles: "COC" },
      { kind: "text", content: ", formule " },
      { kind: "math", src: "x^2", block: false },
      { kind: "text", content: "." },
    ]);
  });

  it("does not treat a $smiles{}$ block-delimited with $$ as a smiles segment", () => {
    // $smiles{...}$ is documented/inserted as a single-$ inline span only —
    // a $$...$$ block containing that text falls through to KaTeX (and
    // fails to parse it, same as any other invalid LaTeX), it isn't
    // special-cased.
    expect(parseMathSegments("$$smiles{CCO}$$")).toEqual([{ kind: "math", src: "smiles{CCO}", block: true }]);
  });

  it("leaves plain text with no $ at all as a single text segment", () => {
    expect(parseMathSegments("Aucune formule ici.")).toEqual([{ kind: "text", content: "Aucune formule ici." }]);
  });
});
