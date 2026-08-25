import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Label({ children }: { children: ReactNode }) {
  return <span className="block mb-1.5 text-xs text-muted">{children}</span>;
}

export function FieldWrap({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      {children}
    </label>
  );
}

const fieldBase =
  "w-full text-text bg-surface2 border border-border rounded-md placeholder:text-faint disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, "min-h-[40px] px-[11px] text-sm", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-[80px] px-3 py-2.5 text-[15px] leading-normal resize-y", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, "min-h-[40px] px-[11px] text-sm", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
