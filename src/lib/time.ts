import type { DateRange, RangeKey } from "@/lib/domain/types";

/** Asia/Jakarta is UTC+7 with no DST. */
export const TZ_OFFSET_MS = 7 * 3600_000;
export const HOUR_MS = 3600_000;
export const DAY_MS = 24 * HOUR_MS;

export function localHour(d: Date | string): number {
  return new Date(new Date(d).getTime() + TZ_OFFSET_MS).getUTCHours();
}

/** 0 = Sunday … 6 = Saturday, in Jakarta time. */
export function localWeekday(d: Date | string): number {
  return new Date(new Date(d).getTime() + TZ_OFFSET_MS).getUTCDay();
}

/** yyyy-mm-dd in Jakarta time. */
export function localDayKey(d: Date | string): string {
  return new Date(new Date(d).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the Jakarta-local day containing `d`, returned as a UTC Date. */
export function startOfLocalDay(d: Date): Date {
  const shifted = d.getTime() + TZ_OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - TZ_OFFSET_MS);
}

export function floorHour(d: Date): Date {
  return new Date(d.getTime() - (d.getTime() % HOUR_MS));
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24 jam" },
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
  { key: "90d", label: "90 hari" },
];

export function isRangeKey(v: unknown): v is RangeKey {
  return v === "24h" || v === "7d" || v === "30d" || v === "90d";
}

/** Resolve a range relative to the latest complete data hour. */
export function resolveRange(key: string | undefined, latest: Date, fallback: RangeKey = "30d"): DateRange {
  const k: RangeKey = isRangeKey(key) ? key : fallback;
  const to = new Date(latest.getTime() + HOUR_MS); // exclusive end
  const hours = k === "24h" ? 24 : k === "7d" ? 168 : k === "30d" ? 720 : 2160;
  const from = new Date(to.getTime() - hours * HOUR_MS);
  const label = RANGE_OPTIONS.find((o) => o.key === k)!.label;
  return { key: k, from, to, label: `${label} terakhir`, granularity: k === "24h" || k === "7d" ? "hour" : "day" };
}

/** The equally long period immediately before `range`. */
export function previousRange(range: DateRange): DateRange {
  const len = range.to.getTime() - range.from.getTime();
  return { ...range, from: new Date(range.from.getTime() - len), to: new Date(range.from.getTime()), label: "periode sebelumnya" };
}
