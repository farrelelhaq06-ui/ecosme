import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12.5px] font-medium text-muted">{eyebrow}</div>}
        <h1 className="text-[22px] font-bold leading-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-[13.5px] leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {aside}
    </div>
  );
}

/** Small "label : value" list used across detail panels. */
export function DefinitionList({ items, className }: { items: { label: ReactNode; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line/70", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
          <dt className="text-muted">{it.label}</dt>
          <dd className="text-right font-medium text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
