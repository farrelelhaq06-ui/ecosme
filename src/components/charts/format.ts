import { fmtDateShort, fmtIdrCompact, fmtNumber, fmtTime } from "@/lib/utils";

export type ChartUnit = "kwh" | "idr" | "kw" | "a" | "v" | "pf" | "hz" | "kwh_unit" | "kg" | "pct" | "score" | "count";

export const UNIT_SUFFIX: Record<ChartUnit, string> = {
  kwh: "kWh",
  idr: "",
  kw: "kW",
  a: "A",
  v: "V",
  pf: "",
  hz: "Hz",
  kwh_unit: "kWh/unit",
  kg: "kg CO₂e",
  pct: "%",
  score: "",
  count: "",
};

export function formatValue(unit: ChartUnit, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  switch (unit) {
    case "idr":
      return fmtIdrCompact(v);
    case "pf":
      return fmtNumber(v, 2);
    case "kwh_unit":
      return `${fmtNumber(v, 2)} kWh/unit`;
    case "hz":
      return `${fmtNumber(v, 2)} Hz`;
    case "pct":
      return `${fmtNumber(v, 1)}%`;
    case "score":
    case "count":
      return fmtNumber(v);
    case "a":
    case "kw":
      return `${fmtNumber(v, 1)} ${UNIT_SUFFIX[unit]}`;
    default:
      return `${fmtNumber(v, v < 10 ? 1 : 0)} ${UNIT_SUFFIX[unit]}`;
  }
}

export function formatAxis(unit: ChartUnit, v: number): string {
  if (unit === "idr") return fmtIdrCompact(v).replace("Rp", "");
  if (unit === "pf") return fmtNumber(v, 2);
  if (Math.abs(v) >= 1000) return `${fmtNumber(v / 1000, 1)}rb`;
  return fmtNumber(v, Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0);
}

export function formatTick(iso: string, granularity: "hour" | "day" | "month"): string {
  if (granularity === "hour") return fmtTime(iso);
  if (granularity === "month") return new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
  return fmtDateShort(iso);
}

export function formatTooltipLabel(iso: string, granularity: "hour" | "day" | "month"): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);
  }
  if (granularity === "month") return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
}

export const VIZ = {
  green: "#16A36A",
  forest: "#123B2A",
  navy: "#14243A",
  blue: "#2E90FA",
  amber: "#F79009",
  violet: "#9E77ED",
  gray: "#98A2B3",
  mint: "#86DCB2",
  red: "#D92D20",
};

export const MACHINE_COLORS = [VIZ.green, VIZ.navy, VIZ.blue, VIZ.amber, VIZ.violet, VIZ.gray, VIZ.mint];
