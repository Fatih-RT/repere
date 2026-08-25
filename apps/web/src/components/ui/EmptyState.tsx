import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center text-center py-14 px-5 border border-dashed border-border2 rounded-xl">
      <div
        className="w-11 h-11 rounded-md grid place-items-center mb-3.5"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <i className={icon} style={{ fontSize: 22 }} />
      </div>
      <h3 className="m-0 mb-1.5 text-lg font-medium">{title}</h3>
      <p className="m-0 mb-4 text-sm text-muted max-w-[320px]" style={{ textWrap: "pretty" }}>
        {description}
      </p>
      {action}
    </div>
  );
}
