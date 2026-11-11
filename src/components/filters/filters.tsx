"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  return { params, update, pending };
}

/** Segmented date-range control bound to the `range` query param. */
export function RangeSelect({
  value,
  options,
  clearParams = [],
}: {
  value: string;
  options: { key: string; label: string }[];
  /** Params removed when a preset is chosen (e.g. custom from/to). */
  clearParams?: string[];
}) {
  const { update, pending } = useQueryUpdater();
  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label="Rentang waktu" className="inline-flex items-center rounded-lg border border-line-strong bg-white p-0.5 shadow-xs">
        <CalendarRange className="ml-2 mr-1 size-4 text-muted" aria-hidden />
        {options.map((o) => {
          const active = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => update({ range: o.key, ...Object.fromEntries(clearParams.map((p) => [p, null])) })}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                active ? "bg-forest text-white shadow-sm" : "text-muted hover:bg-canvas hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {pending && <Loader2 className="size-4 animate-spin text-brand-600" aria-label="Memuat data" />}
    </div>
  );
}

/** Native select bound to a query param. */
export function QuerySelect({
  param,
  value,
  options,
  label,
  className,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const { update, pending } = useQueryUpdater();
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => update({ [param]: e.target.value })}
        className="h-9 rounded-lg border border-line-strong bg-white pl-3 pr-8 text-[13px] font-medium text-ink shadow-xs focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="absolute -right-6 size-4 animate-spin text-brand-600" aria-label="Memuat data" />}
    </label>
  );
}

/** Custom date range (yyyy-mm-dd) bound to `from` / `to` params. */
export function CustomDateRange({ from, to, min, max }: { from: string; to: string; min: string; max: string }) {
  const { update, pending } = useQueryUpdater();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const f = String(fd.get("from") ?? "");
        const t = String(fd.get("to") ?? "");
        if (f && t && f <= t) update({ from: f, to: t, range: "custom" });
      }}
    >
      <label className="sr-only" htmlFor="custom-from">
        Dari tanggal
      </label>
      <input
        id="custom-from"
        name="from"
        type="date"
        defaultValue={from}
        min={min}
        max={max}
        className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
      />
      <span className="text-[12px] text-muted">s.d.</span>
      <label className="sr-only" htmlFor="custom-to">
        Sampai tanggal
      </label>
      <input
        id="custom-to"
        name="to"
        type="date"
        defaultValue={to}
        min={min}
        max={max}
        className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
      />
      <button type="submit" className="h-9 rounded-lg bg-forest px-3 text-[13px] font-semibold text-white hover:bg-forest-800 disabled:opacity-60" disabled={pending}>
        {pending ? "Memuat…" : "Terapkan"}
      </button>
    </form>
  );
}
