import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type TextareaHTMLAttributes } from "react";
import { Textarea } from "@/components/ui/Field";
import { MoleculeDrawing } from "@/components/MoleculeDrawing";
import {
  findByFormula,
  findByName,
  isCursorInsideMath,
  looksLikeFormula,
  looksLikeSmiles,
  type MoleculeEntry,
} from "@/lib/molecules";

interface MoleculeAwareTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onPaste" | "onKeyDown"> {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

const DETECT_DELAY_MS = 300;

// A Textarea that watches what's being typed (or pasted) and offers to turn
// a recognized formula/name/SMILES into a $smiles{...}$ token — see
// MathText.tsx for how that token renders. Everything here is additive: no
// prop is swallowed, existing onKeyDown/onPaste handlers (Ctrl+Entrée fast
// entry, pasted-image handling) still fire, Tab still moves focus normally.
export const MoleculeAwareTextarea = forwardRef<HTMLTextAreaElement, MoleculeAwareTextareaProps>(
  ({ value, onChange, onKeyDown, onPaste, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement, []);

    const [open, setOpen] = useState(false);
    const [candidates, setCandidates] = useState<MoleculeEntry[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [wordRange, setWordRange] = useState<{ start: number; end: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timerRef.current), []);

    function detect() {
      const el = innerRef.current;
      if (!el) return;
      const cursor = el.selectionStart ?? 0;
      const text = el.value;
      if (isCursorInsideMath(text, cursor)) return setOpen(false);

      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      // Boundary is whitespace or common prose punctuation — not just
      // whitespace — so "fructose (C6H12O6)" detects the formula even
      // though it's glued to a parenthesis, with no space around it.
      const start = cursor - (/[^\s(),.;:!?"'[\]{}]*$/.exec(before)?.[0].length ?? 0);
      const end = cursor + (/^[^\s(),.;:!?"'[\]{}]*/.exec(after)?.[0].length ?? 0);
      const word = text.slice(start, end);
      if (word.length < 2) return setOpen(false);

      const results = looksLikeFormula(word) ? findByFormula(word) : findByName(word);
      if (!results.length) return setOpen(false);

      setCandidates(results.slice(0, 6));
      setWordRange({ start, end });
      setActiveIndex(0);
      setOpen(true);
    }

    function scheduleDetect() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(detect, DETECT_DELAY_MS);
    }

    function insertToken(smiles: string, start: number, end: number) {
      const el = innerRef.current;
      if (!el) return;
      const insertion = `$smiles{${smiles}}$`;
      const next = el.value.slice(0, start) + insertion + el.value.slice(end);
      onChange(next);
      setOpen(false);
      const pos = start + insertion.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    }

    function applyCandidate(m: MoleculeEntry) {
      if (!wordRange) return;
      insertToken(m.smiles, wordRange.start, wordRange.end);
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      onChange(e.target.value);
      scheduleDetect();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (open) {
        if (e.key === "Escape") {
          setOpen(false);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % candidates.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
          return;
        }
        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          applyCandidate(candidates[activeIndex]);
          return;
        }
        if (e.key === "Tab") {
          setOpen(false);
          // fall through — no preventDefault, Tab keeps moving focus normally
        }
      }
      onKeyDown?.(e);
    }

    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      const pasted = e.clipboardData.getData("text").trim();
      if (pasted && looksLikeSmiles(pasted)) {
        e.preventDefault();
        const el = innerRef.current;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        insertToken(pasted, start, end);
        return;
      }
      onPaste?.(e);
    }

    return (
      <div className="relative">
        <Textarea
          ref={innerRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={scheduleDetect}
          onKeyUp={scheduleDetect}
          onBlur={() => setOpen(false)}
          {...rest}
        />
        {open && candidates.length > 0 && (
          <div
            className="absolute z-20 mt-1 left-0 right-0 max-w-sm rounded-md overflow-hidden animate-rise"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
          >
            {candidates.map((m, i) => (
              <div
                key={m.smiles}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCandidate(m);
                }}
                className="flex items-center gap-2.5 p-2 cursor-pointer"
                style={{ background: i === activeIndex ? "var(--hover)" : "transparent", borderTop: i ? "1px solid var(--border)" : "none" }}
              >
                <div className="w-9 h-9 flex-none rounded" style={{ background: "var(--surface2)" }}>
                  <MoleculeDrawing smiles={m.smiles} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate">{m.name}</div>
                  <div className="text-[11px] truncate" style={{ color: "var(--faint)" }}>
                    {m.formula} · {m.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
MoleculeAwareTextarea.displayName = "MoleculeAwareTextarea";
