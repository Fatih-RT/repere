import { cn } from "@/lib/cn";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative w-10 h-[23px] flex-none rounded-full border transition-colors",
        checked ? "bg-accent-soft border-accent-line" : "bg-track border-border2"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] w-[15px] h-[15px] rounded-full transition-[left] duration-150",
          checked ? "left-5 bg-accent" : "left-[3px] bg-faint"
        )}
      />
    </button>
  );
}
