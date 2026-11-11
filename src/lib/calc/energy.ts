import type { EnergyReading, Machine, ProductionRecord, TariffSettings } from "@/lib/domain/types";
import { DAY_MS, HOUR_MS, localDayKey, localHour, startOfLocalDay } from "@/lib/time";

/* ---------------- cost ---------------- */

export function isPeakHour(hour: number, t: TariffSettings): boolean {
  return hour >= t.peakStartHour && hour < t.peakEndHour;
}

/** IDR per kWh applicable at a given local hour (LWBP vs WBP). */
export function rateForHour(hour: number, t: TariffSettings): number {
  return isPeakHour(hour, t) ? t.baseRateIdrPerKwh * t.peakMultiplier : t.baseRateIdrPerKwh;
}

export function readingCost(r: Pick<EnergyReading, "energy_kwh" | "timestamp">, t: TariffSettings): number {
  return r.energy_kwh * rateForHour(localHour(r.timestamp), t);
}

export function emissionKg(kwh: number, t: TariffSettings): number {
  return kwh * t.emissionFactorKgPerKwh;
}

/* ---------------- totals ---------------- */

export interface EnergyTotals {
  kwh: number;
  costIdr: number;
  peakKwh: number;
  peakShare: number; // 0..1
  avgPowerFactor: number | null; // energy-weighted
  maxDemandKw: number; // highest facility hourly average
  emissionKg: number;
}

export function computeTotals(readings: EnergyReading[], t: TariffSettings): EnergyTotals {
  let kwh = 0;
  let cost = 0;
  let peak = 0;
  let pfWeighted = 0;
  let pfEnergy = 0;
  const hourly = new Map<string, number>();
  for (const r of readings) {
    kwh += r.energy_kwh;
    const h = localHour(r.timestamp);
    cost += r.energy_kwh * rateForHour(h, t);
    if (isPeakHour(h, t)) peak += r.energy_kwh;
    if (r.power_factor !== null) {
      pfWeighted += r.power_factor * r.energy_kwh;
      pfEnergy += r.energy_kwh;
    }
    hourly.set(r.timestamp, (hourly.get(r.timestamp) ?? 0) + r.energy_kwh);
  }
  let maxDemand = 0;
  for (const v of hourly.values()) maxDemand = Math.max(maxDemand, v);
  return {
    kwh,
    costIdr: cost,
    peakKwh: peak,
    peakShare: kwh > 0 ? peak / kwh : 0,
    avgPowerFactor: pfEnergy > 0 ? pfWeighted / pfEnergy : null,
    maxDemandKw: maxDemand,
    emissionKg: emissionKg(kwh, t),
  };
}

/* ---------------- time series ---------------- */

export interface SeriesPoint {
  t: string; // ISO bucket start
  kwh: number;
  costIdr: number;
  peakKwh: number;
  [machineId: string]: number | string;
}

/** Bucket readings into hourly or daily points, including empty buckets. */
export function buildSeries(
  readings: EnergyReading[],
  from: Date,
  to: Date,
  granularity: "hour" | "day",
  t: TariffSettings,
  machineIds: string[] = [],
): SeriesPoint[] {
  const step = granularity === "hour" ? HOUR_MS : DAY_MS;
  const start = granularity === "hour" ? from.getTime() : startOfLocalDay(from).getTime();
  const points: SeriesPoint[] = [];
  const index = new Map<number, SeriesPoint>();
  for (let ms = start; ms < to.getTime(); ms += step) {
    const p: SeriesPoint = { t: new Date(ms).toISOString(), kwh: 0, costIdr: 0, peakKwh: 0 };
    for (const id of machineIds) p[id] = 0;
    points.push(p);
    index.set(ms, p);
  }
  for (const r of readings) {
    const ms = new Date(r.timestamp).getTime();
    const key = granularity === "hour" ? ms : startOfLocalDay(new Date(ms)).getTime();
    const p = index.get(key);
    if (!p) continue;
    const h = localHour(r.timestamp);
    p.kwh += r.energy_kwh;
    p.costIdr += r.energy_kwh * rateForHour(h, t);
    if (isPeakHour(h, t)) p.peakKwh += r.energy_kwh;
    if (r.machine_id in p) p[r.machine_id] = (p[r.machine_id] as number) + r.energy_kwh;
  }
  for (const p of points) {
    p.kwh = round(p.kwh);
    p.costIdr = Math.round(p.costIdr);
    p.peakKwh = round(p.peakKwh);
    for (const id of machineIds) p[id] = round(p[id] as number);
  }
  return points;
}

/* ---------------- breakdowns ---------------- */

export interface MachineBreakdown {
  machineId: string;
  name: string;
  kwh: number;
  costIdr: number;
  share: number; // 0..1
  avgPowerKw: number;
  avgPowerFactor: number | null;
  peakLoadPct: number; // max hourly kW / rated
  runHours: number;
}

export function breakdownByMachine(readings: EnergyReading[], machines: Machine[], t: TariffSettings): MachineBreakdown[] {
  const total = readings.reduce((s, r) => s + r.energy_kwh, 0);
  return machines
    .map((m) => {
      const rs = readings.filter((r) => r.machine_id === m.id);
      const tot = computeTotals(rs, t);
      const maxKw = rs.reduce((mx, r) => Math.max(mx, (r.active_power_watt ?? 0) / 1000), 0);
      const runHours = rs.filter((r) => (r.active_power_watt ?? 0) >= 0.1 * m.ratedPowerKw * 1000).length;
      return {
        machineId: m.id,
        name: m.name,
        kwh: round(tot.kwh),
        costIdr: Math.round(tot.costIdr),
        share: total > 0 ? tot.kwh / total : 0,
        avgPowerKw: rs.length ? tot.kwh / rs.length : 0,
        avgPowerFactor: tot.avgPowerFactor,
        peakLoadPct: (maxKw / m.ratedPowerKw) * 100,
        runHours,
      };
    })
    .sort((a, b) => b.kwh - a.kwh);
}

export interface IntensityPoint {
  date: string;
  kwh: number;
  units: number;
  intensity: number | null; // kWh per unit; null when no production
}

export function dailyIntensity(readings: EnergyReading[], production: ProductionRecord[]): IntensityPoint[] {
  const kwhByDay = new Map<string, number>();
  for (const r of readings) {
    const k = localDayKey(r.timestamp);
    kwhByDay.set(k, (kwhByDay.get(k) ?? 0) + r.energy_kwh);
  }
  return production.map((p) => {
    const kwh = kwhByDay.get(p.date) ?? 0;
    return { date: p.date, kwh: round(kwh), units: p.units, intensity: p.units > 0 ? round(kwh / p.units, 3) : null };
  });
}

export function overallIntensity(readings: EnergyReading[], production: ProductionRecord[]): number | null {
  const kwh = readings.reduce((s, r) => s + r.energy_kwh, 0);
  const units = production.reduce((s, p) => s + p.units, 0);
  return units > 0 ? kwh / units : null;
}

function round(v: number, d = 2) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
