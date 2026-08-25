import type { Difficulty } from "@/lib/types";
import { difficultyVar, mix } from "@/lib/visual";

export function DiffTag({ diff }: { diff: Difficulty }) {
  const v = difficultyVar(diff);
  return (
    <span
      className="inline-flex flex-none items-center text-[11px] px-[9px] py-[2px] rounded-md"
      style={{ color: `var(${v})`, border: `1px solid ${mix(v, 38)}` }}
    >
      {diff}
    </span>
  );
}

export function DueTag({ due }: { due: number }) {
  return (
    <span
      className="inline-flex flex-none whitespace-nowrap text-[11px] px-2 py-[2px] rounded-md"
      style={due > 0 ? { color: "var(--accent)", background: "var(--accent-soft)" } : { color: "var(--faint)" }}
    >
      {due > 0 ? `${due} à revoir` : "à jour"}
    </span>
  );
}

export function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span
      className="flex-none rounded-[2px] rotate-45"
      style={{ width: size, height: size, background: color }}
    />
  );
}
