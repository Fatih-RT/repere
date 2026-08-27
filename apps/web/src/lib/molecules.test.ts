import { describe, expect, it } from "vitest";
import {
  findByFormula,
  findByName,
  findBySmiles,
  isCursorInsideMath,
  looksLikeFormula,
  looksLikeSmiles,
  normalizeFormula,
  MOLECULES,
} from "./molecules";

describe("findByFormula", () => {
  it("returns every hexose for the ambiguous C6H12O6 formula", () => {
    const results = findByFormula("C6H12O6").map((m) => m.name).sort();
    expect(results).toEqual(["Fructose", "Galactose", "Glucose", "Mannose"]);
  });

  it("returns both propanol isomers for C3H8O", () => {
    const results = findByFormula("C3H8O").map((m) => m.name).sort();
    expect(results).toEqual(["Propan-1-ol", "Propan-2-ol"]);
  });

  it("returns both butane isomers for C4H10", () => {
    const results = findByFormula("C4H10").map((m) => m.name).sort();
    expect(results).toEqual(["Butane", "Isobutane"]);
  });

  it("returns ethanol and dimethyl ether for C2H6O", () => {
    const results = findByFormula("C2H6O").map((m) => m.name).sort();
    expect(results).toEqual(["Diméthyléther", "Éthanol"]);
  });

  it("finds water by its formula regardless of element order", () => {
    expect(findByFormula("H2O").map((m) => m.name)).toEqual(["Eau"]);
    expect(findByFormula("OH2").map((m) => m.name)).toEqual(["Eau"]); // written the "wrong" way round
  });

  it("returns a single, unambiguous result for a non-isomeric formula", () => {
    expect(findByFormula("CH4").map((m) => m.name)).toEqual(["Méthane"]);
  });

  it("returns nothing for a formula no molecule in the database has", () => {
    expect(findByFormula("C99H200")).toEqual([]);
  });

  it("returns nothing for an empty or garbage query", () => {
    expect(findByFormula("")).toEqual([]);
    expect(findByFormula("not a formula!!!")).toEqual([]);
  });
});

describe("normalizeFormula", () => {
  it("is insensitive to the order elements were written in", () => {
    expect(normalizeFormula("C6H12O6")).toBe(normalizeFormula("O6C6H12"));
  });

  it("treats an implicit count of 1 the same as an explicit one", () => {
    expect(normalizeFormula("CH4O")).toBe(normalizeFormula("C1H4O1"));
  });
});

describe("findByName", () => {
  it("finds a molecule by its exact French name, case-insensitively", () => {
    expect(findByName("glucose").map((m) => m.name)).toContain("Glucose");
    expect(findByName("GLUCOSE").map((m) => m.name)).toContain("Glucose");
  });

  it("finds an accented name typed without accents", () => {
    const results = findByName("ethanol").map((m) => m.name); // no accent on "É"
    expect(results).toContain("Éthanol");
  });

  it("finds an accented name typed with accents", () => {
    const results = findByName("Éthanol").map((m) => m.name);
    expect(results).toContain("Éthanol");
  });

  it("matches on a synonym, not just the primary name", () => {
    expect(findByName("sucrose").map((m) => m.name)).toContain("Saccharose");
    expect(findByName("dextrose").map((m) => m.name)).toContain("Glucose");
    expect(findByName("acétaminophène").map((m) => m.name)).toContain("Paracétamol");
  });

  it("matches partial input (progressive typing)", () => {
    expect(findByName("gluc").map((m) => m.name)).toContain("Glucose");
  });

  it("returns nothing for an empty query or an unknown name", () => {
    expect(findByName("")).toEqual([]);
    expect(findByName("zzzznotamolecule")).toEqual([]);
  });
});

describe("findBySmiles", () => {
  it("recognizes a pasted SMILES that matches a database entry exactly", () => {
    const ethanol = MOLECULES.find((m) => m.name === "Éthanol")!;
    expect(findBySmiles(ethanol.smiles)?.name).toBe("Éthanol");
  });

  it("tolerates surrounding whitespace, as a paste often has", () => {
    expect(findBySmiles("  CCO  ")?.name).toBe("Éthanol");
  });

  it("returns undefined for a SMILES not in the database, without throwing", () => {
    expect(findBySmiles("CCCCCCCCCCCCCCCC")).toBeUndefined(); // hexadecane, plausible but absent
  });

  it("returns undefined for garbage input, without throwing", () => {
    expect(findBySmiles("not-a-smiles!!!")).toBeUndefined();
    expect(findBySmiles("")).toBeUndefined();
  });
});

describe("looksLikeFormula", () => {
  it("accepts standard molecular formulas", () => {
    expect(looksLikeFormula("C6H12O6")).toBe(true);
    expect(looksLikeFormula("H2O")).toBe(true);
    expect(looksLikeFormula("NH3")).toBe(true);
  });

  it("a bare SMILES like ethanol's 'CCO' is shape-ambiguous with a formula, but the database lookup resolves it", () => {
    // looksLikeFormula is shape-only (letter+digit runs) — "CCO" passes it,
    // same as "C6H12O6" would. That's fine: no stored formula repeats an
    // element the way "CCO" (C twice) does, so the actual database lookup
    // comes back empty and the selector (next stage) falls through to
    // treating it as pasted SMILES instead.
    expect(looksLikeFormula("CCO")).toBe(true);
    expect(findByFormula("CCO")).toEqual([]);
  });

  it("rejects punctuation SMILES can have but a formula never does", () => {
    expect(looksLikeFormula("CC(=O)O")).toBe(false);
    expect(looksLikeFormula("c1ccccc1")).toBe(false);
  });

  it("rejects free text and empty input", () => {
    expect(looksLikeFormula("glucose")).toBe(false);
    expect(looksLikeFormula("")).toBe(false);
    expect(looksLikeFormula("   ")).toBe(false);
  });
});

describe("looksLikeSmiles", () => {
  it("accepts SMILES with bond/branch/charge punctuation", () => {
    expect(looksLikeSmiles("CC(=O)O")).toBe(true);
    expect(looksLikeSmiles("O=C=O")).toBe(true);
    expect(looksLikeSmiles("[Na+]")).toBe(true);
  });

  it("accepts an aromatic ring with a closure digit", () => {
    expect(looksLikeSmiles("c1ccccc1")).toBe(true);
  });

  it("rejects formula-shaped input, even though it's shape-ambiguous with a bare SMILES", () => {
    // "CCO" (ethanol) has no SMILES-only punctuation, so it's left to the
    // normal formula/name search rather than treated as a confirmed paste.
    expect(looksLikeSmiles("CCO")).toBe(false);
    expect(looksLikeSmiles("C6H12O6")).toBe(false);
  });

  it("rejects plain words and empty input", () => {
    expect(looksLikeSmiles("glucose")).toBe(false);
    expect(looksLikeSmiles("")).toBe(false);
    expect(looksLikeSmiles("   ")).toBe(false);
  });
});

describe("isCursorInsideMath", () => {
  it("is false when the cursor sits in plain text before any $", () => {
    expect(isCursorInsideMath("Calcule la masse de ", 20)).toBe(false);
  });

  it("is true while typing inside an open $...$ span", () => {
    const text = "Un texte $\\ce{H2O + ";
    expect(isCursorInsideMath(text, text.length)).toBe(true);
  });

  it("is false again once the span is closed", () => {
    const text = "Un texte $\\ce{H2O}$ et la suite";
    expect(isCursorInsideMath(text, text.length)).toBe(false);
  });

  it("is true right after the opening $ of an empty span", () => {
    expect(isCursorInsideMath("$", 1)).toBe(true);
  });
});
