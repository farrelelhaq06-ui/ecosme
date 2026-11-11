import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Provenance } from "@/lib/domain/types";
import { ProvenanceBadge } from "@/components/ui/badge";
import { cn, fmtPct } from "@/lib/utils";

/**
 * KPI card. `deltaPct` compares against the previous equal-length period;
 * `goodWhen` tells whether an increase is desirable (colour semantics).
 */
export function KpiCard({
  label,
  value,
  unit,
  icon,
  provenance,
  deltaPct,
  goodWhen = "down",
  footnote,
  unavailable,
  className,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  provenance: Provenance;
  deltaPct?: number | null;
  goodWhen?: "up" | "down";
  footnote?: ReactNode;
  unavailable?: boolean;
  className?: string;
  accent?: boolean;
}) {
  const hasDelta = deltaPct !== undefined && deltaPct !== null && Number.isFinite(deltaPct);
  const flat = hasDelta && Math.abs(deltaPct!) < 0.5;
  const good = hasDelta && !flat && (goodWhen === "down" ? deltaPct! < 0 : deltaPct! > 0);
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]",
        accent ? "border-forest bg-forest text-white" : "border-line bg-surface",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg [&_svg]:size-4",
                accent ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-600",
              )}
            >
              {icon}
            </span>
          )}
          <h3 className={cn("text-[13px] font-semibold", accent ? "text-white/80" : "text-muted")}>{label}</h3>
        </div>
        <ProvenanceBadge kind={provenance} className={accent ? "bg-white/10 text-brand-100 ring-white/15" : undefined} />
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        {unavailable ? (
          <span className={cn("text-xl font-semibold", accent ? "text-white/70" : "text-subtle")}>Belum tersedia</span>
        ) : (
          <>
            <span className={cn("num text-[28px] font-semibold leading-none", accent ? "text-white" : "text-ink")}>{value}</span>
            {unit && <span className={cn("text-sm font-medium", accent ? "text-white/70" : "text-muted")}>{unit}</span>}
          </>
        )}
      </div>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
              flat
                ? accent ? "bg-white/10 text-white/80" : "bg-gray-100 text-gray-600"
                : good
                  ? accent ? "bg-brand-500/25 text-brand-200" : "bg-success-50 text-success-700"
                  : accent ? "bg-warning/25 text-warning-50" : "bg-warning-50 text-warning-700",
            )}
          >
            {flat ? <Minus className="size-3" aria-hidden /> : deltaPct! > 0 ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
            {fmtPct(Math.abs(deltaPct!))}
          </span>
        )}
        {footnote && <span className={accent ? "text-white/65" : "text-muted"}>{footnote}</span>}
      </div>
    </article>
  );
}
