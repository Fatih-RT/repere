// A small, local, hand-curated molecule database — no network calls, no
// external service. Covers the L2 chemistry program listed in the feature
// request, and deliberately includes several isomer sets (the hexoses,
// the propanols, ethanol/dimethyl ether, butane/isobutane) since those are
// exactly the cases that justify the input selector: a raw formula alone
// never determines a structure.
//
// Accuracy note on the four C6H12O6 hexoses: PubChem/Wikipedia were not
// reachable while building this (network egress blocked), so glucose,
// galactose and mannose were derived from the well-established textbook
// relationship between them — galactose is glucose's C4 epimer, mannose
// its C2 epimer — applied to a single glucopyranose reference structure,
// rather than four independently-recalled stereo-SMILES. The anomeric
// carbon (C1) is left unspecified (plain, not alpha/beta) since it
// interconverts in solution and isn't a fixed structural feature. Worth a
// spot-check against course material before relying on it for the exact
// wedge/dash stereochemistry, though the constitutional structure (which
// is what actually justifies the selector — "same formula, different
// molecule") is not in question.
export interface MoleculeEntry {
  smiles: string;
  name: string;
  synonyms: string[];
  formula: string;
  description: string;
}

export const MOLECULES: MoleculeEntry[] = [
  { smiles: "O", name: "Eau", synonyms: [], formula: "H2O", description: "solvant universel, molécule coudée" },
  { smiles: "O=O", name: "Dioxygène", synonyms: ["oxygène"], formula: "O2", description: "gaz respiratoire, comburant" },
  { smiles: "O=C=O", name: "Dioxyde de carbone", synonyms: ["gaz carbonique", "CO2"], formula: "CO2", description: "gaz linéaire, produit de combustion" },
  { smiles: "N", name: "Ammoniac", synonyms: ["NH3"], formula: "NH3", description: "gaz pyramidal, base faible" },
  { smiles: "C", name: "Méthane", synonyms: [], formula: "CH4", description: "alcane le plus simple, gaz naturel" },
  { smiles: "CC", name: "Éthane", synonyms: [], formula: "C2H6", description: "alcane à deux carbones" },
  { smiles: "CCC", name: "Propane", synonyms: [], formula: "C3H8", description: "alcane à trois carbones, gaz de bouteille" },
  { smiles: "CCCC", name: "Butane", synonyms: ["n-butane"], formula: "C4H10", description: "alcane linéaire à quatre carbones" },
  { smiles: "CC(C)C", name: "Isobutane", synonyms: ["2-méthylpropane", "méthylpropane"], formula: "C4H10", description: "isomère ramifié du butane" },
  { smiles: "CCO", name: "Éthanol", synonyms: ["alcool éthylique", "alcool"], formula: "C2H6O", description: "alcool primaire, présent dans les boissons fermentées" },
  { smiles: "COC", name: "Diméthyléther", synonyms: ["méthoxyméthane", "éther diméthylique"], formula: "C2H6O", description: "éther isomère de l'éthanol, sans groupe -OH" },
  { smiles: "CO", name: "Méthanol", synonyms: ["alcool méthylique"], formula: "CH4O", description: "alcool le plus simple, toxique" },
  { smiles: "CCCO", name: "Propan-1-ol", synonyms: ["1-propanol", "n-propanol"], formula: "C3H8O", description: "alcool primaire, -OH en bout de chaîne" },
  { smiles: "CC(O)C", name: "Propan-2-ol", synonyms: ["2-propanol", "isopropanol", "alcool isopropylique"], formula: "C3H8O", description: "alcool secondaire, -OH sur le carbone central" },
  { smiles: "CC=O", name: "Éthanal", synonyms: ["acétaldéhyde"], formula: "C2H4O", description: "aldéhyde à deux carbones" },
  { smiles: "CC(=O)C", name: "Acétone", synonyms: ["propanone"], formula: "C3H6O", description: "cétone la plus simple, solvant courant" },
  { smiles: "CC(=O)O", name: "Acide acétique", synonyms: ["acide éthanoïque", "vinaigre"], formula: "C2H4O2", description: "acide carboxylique du vinaigre" },
  { smiles: "O=CO", name: "Acide formique", synonyms: ["acide méthanoïque"], formula: "CH2O2", description: "acide carboxylique le plus simple" },
  { smiles: "OC(=O)c1ccccc1", name: "Acide benzoïque", synonyms: [], formula: "C7H6O2", description: "acide carboxylique aromatique, conservateur alimentaire" },
  { smiles: "c1ccccc1", name: "Benzène", synonyms: [], formula: "C6H6", description: "cycle aromatique de référence" },
  { smiles: "Cc1ccccc1", name: "Toluène", synonyms: ["méthylbenzène"], formula: "C7H8", description: "benzène substitué par un groupe méthyle" },
  { smiles: "Oc1ccccc1", name: "Phénol", synonyms: ["hydroxybenzène"], formula: "C6H6O", description: "benzène substitué par un groupe hydroxyle" },
  { smiles: "Nc1ccccc1", name: "Aniline", synonyms: ["phénylamine", "aminobenzène"], formula: "C6H7N", description: "benzène substitué par un groupe amine" },
  { smiles: "C1CCCCC1", name: "Cyclohexane", synonyms: [], formula: "C6H12", description: "cycle saturé à six carbones" },
  { smiles: "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O", name: "Glucose", synonyms: ["dextrose", "D-glucose"], formula: "C6H12O6", description: "aldohexose, sucre réducteur le plus courant" },
  { smiles: "OCC1(O)OC(CO)[C@@H](O)[C@H]1O", name: "Fructose", synonyms: ["lévulose", "D-fructose"], formula: "C6H12O6", description: "cétohexose, sucre des fruits, très sucré" },
  { smiles: "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@H]1O", name: "Galactose", synonyms: ["D-galactose"], formula: "C6H12O6", description: "aldohexose, épimère du glucose en C4" },
  { smiles: "OC[C@H]1OC(O)[C@@H](O)[C@@H](O)[C@@H]1O", name: "Mannose", synonyms: ["D-mannose"], formula: "C6H12O6", description: "aldohexose, épimère du glucose en C2" },
  { smiles: "OC[C@H]1O[C@@H](OC2(CO)OC(CO)C(O)C2O)[C@H](O)[C@@H](O)[C@@H]1O", name: "Saccharose", synonyms: ["sucrose", "sucre de table", "sucre"], formula: "C12H22O11", description: "disaccharide glucose-fructose, sucre de table" },
  { smiles: "NC(=O)N", name: "Urée", synonyms: ["carbamide"], formula: "CH4N2O", description: "diamide, déchet azoté de l'organisme" },
  { smiles: "NCC(=O)O", name: "Glycine", synonyms: ["acide aminoacétique"], formula: "C2H5NO2", description: "acide aminé le plus simple, non chiral" },
  { smiles: "CC(N)C(=O)O", name: "Alanine", synonyms: [], formula: "C3H7NO2", description: "acide aminé à chaîne latérale méthyle" },
  { smiles: "OCC(N)C(=O)O", name: "Sérine", synonyms: [], formula: "C3H7NO3", description: "acide aminé à chaîne latérale hydroxyle" },
  { smiles: "CC(=O)Oc1ccccc1C(=O)O", name: "Aspirine", synonyms: ["acide acétylsalicylique"], formula: "C9H8O4", description: "ester d'acide salicylique, antalgique" },
  { smiles: "CC(=O)Nc1ccc(O)cc1", name: "Paracétamol", synonyms: ["acétaminophène"], formula: "C8H9NO2", description: "amide phénolique, antalgique et antipyrétique" },
  { smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C", name: "Caféine", synonyms: [], formula: "C8H10N4O2", description: "alcaloïde purique, stimulant" },
];

// Parses "C6H12O6" into { C: 6, H: 12, O: 6 }. Deliberately simple — no
// parentheses/hydrates support, which none of the molecules above need.
function parseFormula(formula: string): Map<string, number> {
  const counts = new Map<string, number>();
  const re = /([A-Z][a-z]?)(\d*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(formula))) {
    const [whole, element, digits] = match;
    if (!whole) break;
    if (!element) continue;
    counts.set(element, (counts.get(element) ?? 0) + (digits ? parseInt(digits, 10) : 1));
  }
  return counts;
}

// A comparison key, not a display string — element order doesn't matter
// here, only that the same formula always normalizes the same way
// regardless of how the user ordered/spaced it. Rejects a formula whose
// same element appears more than once as a separate run (e.g. the bare
// SMILES "CCO" superficially parses like a formula but no real formula
// repeats an un-summed element token) by simply not special-casing it —
// parseFormula already sums repeats, so "CCO" normalizes the same as a
// (fictitious) "C2O" formula, which is fine: it won't match any stored
// formula either way.
export function normalizeFormula(formula: string): string {
  const counts = parseFormula(formula.trim());
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([el, n]) => `${el}${n}`)
    .join("");
}

export function findByFormula(query: string): MoleculeEntry[] {
  const target = normalizeFormula(query);
  if (!target) return [];
  return MOLECULES.filter((m) => normalizeFormula(m.formula) === target);
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(s: string): string {
  return stripAccents(s.trim().toLowerCase());
}

export function findByName(query: string): MoleculeEntry[] {
  const q = normalizeName(query);
  if (!q) return [];
  return MOLECULES.filter(
    (m) => normalizeName(m.name).includes(q) || m.synonyms.some((s) => normalizeName(s).includes(q))
  );
}

export function findBySmiles(query: string): MoleculeEntry | undefined {
  const q = query.trim();
  if (!q) return undefined;
  return MOLECULES.find((m) => m.smiles === q);
}

// Used by the input selector (next stage) to decide whether what was just
// typed looks like a molecular formula worth searching — letter-then-
// optional-digit runs and nothing else, e.g. "C6H12O6" or "H2O".
export function looksLikeFormula(input: string): boolean {
  const s = input.trim();
  return s.length > 0 && /^([A-Z][a-z]?\d*)+$/.test(s);
}

// Used by the selector's paste handler to decide whether a pasted string is
// itself a SMILES string (as opposed to plain text, or a formula that
// should go through the normal formula/name search instead). Formula-shaped
// input is deliberately excluded here — "CCO" is shape-ambiguous with a
// SMILES, but a plain paste of it should still go through findByFormula/
// findByName like typed text does, not get silently wrapped as-is.
// Punctuation SMILES commonly use (bonds, branches, charges, ring-closure
// digits right after a lowercase aromatic atom) is otherwise never part of
// a formula or a plain word, so its presence is a reliable enough signal.
export function looksLikeSmiles(input: string): boolean {
  const s = input.trim();
  if (!s || looksLikeFormula(s)) return false;
  if (/[()=#@[\]/\\%+-]/.test(s)) return true;
  return /[a-z]\d/.test(s);
}

// The selector suppresses all suggestions while the cursor sits inside an
// open $...$ (or $$...$$) span, so it never fires inside \ce{} chemistry
// equations or any other LaTeX the user is mid-typing — \ce{} only ever
// appears inside a $...$ span, so this one check covers both without
// needing to parse \ce{ specifically. Counts "$" before the cursor: an odd
// count means the most recent one hasn't been closed yet.
export function isCursorInsideMath(text: string, cursor: number): boolean {
  const before = text.slice(0, cursor);
  const count = (before.match(/\$/g) ?? []).length;
  return count % 2 === 1;
}
