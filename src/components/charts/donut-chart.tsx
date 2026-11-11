"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { type ChartUnit, formatValue } from "@/components/charts/format";
import { fmtPct } from "@/lib/utils";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

/** Donut with legend list (accessible: values are also rendered as text). */
export function DonutChart({
  data,
  unit,
  centerLabel,
  centerValue,
  height = 200,
  ariaLabel,
}: {
  data: Slice[];
  unit: ChartUnit;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  ariaLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,200px)_1fr]">
      <div role="img" aria-label={ariaLabel} className="relative mx-auto w-full max-w-[200px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="96%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                return (
                  <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
                    <p className="font-semibold">{p.name}</p>
                    <p className="num text-muted">
                      {formatValue(unit, Number(p.value))} · {fmtPct((Number(p.value) / (total || 1)) * 100)}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              {centerValue && <p className="num text-lg font-semibold leading-tight">{centerValue}</p>}
              {centerLabel && <p className="text-[11px] text-muted">{centerLabel}</p>}
            </div>
          </div>
        )}
      </div>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
              <span className="truncate text-ink">{d.name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="num font-semibold">{formatValue(unit, d.value)}</span>
              <span className="num w-12 text-right text-[12px] text-muted">{fmtPct((d.value / (total || 1)) * 100)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
