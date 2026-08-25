import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost" | "danger";
type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  solid: "text-accent bg-accent-soft border border-accent hover:bg-accent-soft2",
  outline: "text-text bg-transparent border border-border hover:bg-hover",
  ghost: "text-muted bg-transparent border border-transparent hover:bg-hover",
  danger: "text-err bg-transparent border border-err-line hover:bg-err-soft",
};

const sizeClasses: Record<Size, string> = {
  default: "min-h-[40px] px-[13px] text-[13.5px] gap-[7px]",
  sm: "min-h-[34px] px-[11px] text-[12.5px] gap-1.5",
  lg: "min-h-[48px] px-[18px] text-[14.5px] gap-2",
  icon: "h-8 w-8 p-0 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "outline", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center rounded font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
