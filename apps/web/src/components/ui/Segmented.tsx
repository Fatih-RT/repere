import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "default",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "default" | "sm" | "pill";
}) {
  return (
    <div className="inline-flex border border-border rounded-md overflow-hidden">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "border-0 font-medium transition-colors",
              size === "sm" && "px-2.5 py-[5px] text-[11.5px]",
              size === "default" && "min-h-[38px] px-4 text-[13px]",
              size === "pill" && "min-h-[38px] px-[15px] text-[13px] rounded",
              active ? "text-accent bg-accent-soft" : "text-muted bg-transparent font-normal"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
