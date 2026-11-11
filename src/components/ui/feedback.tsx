import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4 w-full", className)} />;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-canvas text-subtle ring-1 ring-line [&_svg]:size-5">
        {icon ?? <Inbox aria-hidden />}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Progress({
  value,
  tone = "brand",
  className,
  label,
}: {
  value: number; // 0..100
  tone?: "brand" | "warning" | "danger" | "navy";
  className?: string;
  label?: string;
}) {
  const color = { brand: "bg-brand-500", warning: "bg-warning", danger: "bg-danger", navy: "bg-navy" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-100", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function StatusDot({ status }: { status: "online" | "degraded" | "offline" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        status === "online" && "bg-success animate-pulse-dot",
        status === "degraded" && "bg-warning",
        status === "offline" && "bg-danger",
      )}
    />
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: "info" | "warning" | "brand" | "danger";
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "bg-info-50 border-info/20 text-info-700",
    warning: "bg-warning-50 border-warning/25 text-warning-700",
    brand: "bg-brand-50 border-brand-200 text-forest",
    danger: "bg-danger-50 border-danger/20 text-danger-700",
  }[tone];
  return (
    <div role="note" className={cn("flex gap-3 rounded-xl border px-4 py-3 text-[13px] leading-5", styles, className)}>
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title ? "mt-0.5 opacity-90" : "")}>{children}</div>
      </div>
    </div>
  );
}
