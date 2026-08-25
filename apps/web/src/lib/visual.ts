import type { Difficulty } from "./types";

export function mix(cssVar: string, pct: number): string {
  return `color-mix(in srgb, var(${cssVar}) ${pct}%, transparent)`;
}

// Matches Repere.dc.html's Component#hue(): a subject/chapter accent color
// derived from a stored hue, tuned differently per theme mode for contrast.
export function subjectHue(h: number, strong = false, isDark = true): string {
  const l = isDark ? (strong ? 0.74 : 0.7) : strong ? 0.56 : 0.52;
  const c = isDark ? 0.085 : 0.105;
  return `oklch(${l} ${c} ${h})`;
}

export function difficultyVar(diff: Difficulty): string {
  if (diff === "Difficile") return "--err";
  if (diff === "Facile") return "--ok";
  return "--warn";
}
