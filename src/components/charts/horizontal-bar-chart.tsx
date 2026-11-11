"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type ChartUnit, formatAxis, formatValue } from "@/components/charts/format";

export interface BarDatum {
  name: string;
  value: number;
  color?: string;
  note?: string;
}

/** Horizontal ranking bar chart (e.g. energy by machine). */
export function HorizontalBarChart({
  data,
  unit,
  height,
  ariaLabel,
  color = "#16A36A",
}: {
  data: BarDatum[];
  unit: ChartUnit;
  height?: number;
  ariaLabel: string;
  color?: string;
}) {
  const h = height ?? Math.max(160, data.length * 42 + 30);
  return (
    <div role="img" aria-label={ariaLabel} style={{ height: h }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid stroke="#EEF2EF" horizontal={false} />
          <XAxis type="number" tickFormatter={(v: number) => formatAxis(unit, v)} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#344054" }}
            tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + "…" : v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,163,106,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as BarDatum;
              return (
                <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
                  <p className="font-semibold">{d.name}</p>
                  <p className="num text-ink">{formatValue(unit, d.value)}</p>
                  {d.note && <p className="text-muted">{d.note}</p>}
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
