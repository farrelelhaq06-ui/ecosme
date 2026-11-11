"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ChartUnit, formatAxis, formatTick, formatTooltipLabel, formatValue } from "@/components/charts/format";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  type?: "area" | "line" | "bar";
  stackId?: string;
  dashed?: boolean;
  /** Secondary axis (right). */
  right?: boolean;
}

export interface RefLine {
  y: number;
  label: string;
  color?: string;
  right?: boolean;
}

type Row = Record<string, string | number | null>;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  rightUnit,
  granularity,
  series,
  showTotal,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  unit: ChartUnit;
  rightUnit?: ChartUnit;
  granularity: "hour" | "day" | "month";
  series: SeriesDef[];
  showTotal?: boolean;
}) {
  if (!active || !payload?.length || !label) return null;
  const stacked = payload.filter((p) => series.find((s) => s.key === p.dataKey)?.stackId);
  const total = stacked.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-48 rounded-xl border border-line bg-white/95 px-3.5 py-3 text-[12px] shadow-[var(--shadow-pop)] backdrop-blur">
      <p className="mb-2 font-semibold text-ink">{formatTooltipLabel(label, granularity)}</p>
      <ul className="space-y-1">
        {payload.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          if (!s) return null;
          return (
            <li key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="num font-semibold text-ink">{formatValue(s.right && rightUnit ? rightUnit : unit, p.value)}</span>
            </li>
          );
        })}
      </ul>
      {showTotal && stacked.length > 1 && (
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
          <span>Total</span>
          <span className="num">{formatValue(unit, total)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * General-purpose time-series chart (area / line / bar, stacked, dual axis).
 */
export function TimeSeriesChart({
  data,
  series,
  unit,
  rightUnit,
  granularity,
  height = 280,
  referenceLines = [],
  showLegend = true,
  showTotal = false,
  ariaLabel,
  yDomain,
}: {
  data: Row[];
  series: SeriesDef[];
  unit: ChartUnit;
  rightUnit?: ChartUnit;
  granularity: "hour" | "day" | "month";
  height?: number;
  referenceLines?: RefLine[];
  showLegend?: boolean;
  showTotal?: boolean;
  ariaLabel: string;
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
}) {
  const hasRight = series.some((s) => s.right);
  const tickInterval = data.length > 60 ? Math.ceil(data.length / 10) : data.length > 24 ? Math.ceil(data.length / 8) : "preserveStartEnd";
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: hasRight ? 4 : 8, left: 0, bottom: 0 }}>
          <defs>
            {series
              .filter((s) => (s.type ?? "area") === "area")
              .map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
          </defs>
          <CartesianGrid stroke="#EEF2EF" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: string) => formatTick(v, granularity)}
            tickLine={false}
            axisLine={{ stroke: "#E4E9E6" }}
            interval={tickInterval}
            minTickGap={16}
            tickMargin={8}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v: number) => formatAxis(unit, v)}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={yDomain}
          />
          {hasRight && rightUnit && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => formatAxis(rightUnit, v)}
              tickLine={false}
              axisLine={false}
              width={48}
            />
          )}
          <Tooltip
            cursor={{ stroke: "#98A2B3", strokeDasharray: "3 3", fill: "rgba(22,163,106,0.05)" }}
            content={<ChartTooltip unit={unit} rightUnit={rightUnit} granularity={granularity} series={series} showTotal={showTotal} />}
          />
          {showLegend && <Legend verticalAlign="top" align="right" height={30} iconType="circle" iconSize={8} />}
          {referenceLines.map((r) => (
            <ReferenceLine
              key={r.label}
              yAxisId={r.right ? "right" : "left"}
              y={r.y}
              stroke={r.color ?? "#F79009"}
              strokeDasharray="5 4"
              label={{ value: r.label, position: "insideTopRight", fill: r.color ?? "#B54708", fontSize: 11 }}
            />
          ))}
          {series.map((s) => {
            const axis = s.right ? "right" : "left";
            const type = s.type ?? "area";
            if (type === "bar")
              return (
                <Bar
                  key={s.key}
                  yAxisId={axis}
                  dataKey={s.key}
                  name={s.label}
                  stackId={s.stackId}
                  fill={s.color}
                  radius={s.stackId ? 0 : [4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              );
            if (type === "line")
              return (
                <Line
                  key={s.key}
                  yAxisId={axis}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            return (
              <Area
                key={s.key}
                yAxisId={axis}
                dataKey={s.key}
                name={s.label}
                stackId={s.stackId}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
