import type { Baseline, EnergyMeasure, EnergyReading, ProductionRecord, SavingsPeriod, TariffSettings } from "@/lib/domain/types";
import { computeTotals, dailyIntensity } from "@/lib/calc/energy";

/**
 * Measurement & Verification (M&V) — simplified IPMVP Option C.
 *
 * A daily baseline model  kWh_d = a + b · units_d  is fitted by ordinary least
 * squares on the baseline period. Savings for a reporting period are
 *   Σ (a + b · units_d)  −  Σ actual kWh_d
 * i.e. "avoided energy use" under reporting-period production conditions.
 *
 * Monitoring alone does NOT produce savings; a documented baseline does.
 */

export interface RegressionFit {
  intercept: number;
  slope: number;
  r2: number;
  cvRmsePct: number;
}

export function linearFit(xs: number[], ys: number[]): RegressionFit {
  const n = xs.length;
  if (n < 2) return { intercept: ys[0] ?? 0, slope: 0, r2: 0, cvRmsePct: 0 };
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / Math.max(1, n - 2));
  return { intercept, slope, r2, cvRmsePct: my ? (rmse / my) * 100 : 0 };
}

export function computeBaseline(
  measure: EnergyMeasure,
  readings: EnergyReading[],
  production: ProductionRecord[],
  periodStart: Date,
  periodEnd: Date,
): Baseline {
  const days = dailyIntensity(readings, production);
  const fit = linearFit(
    days.map((d) => d.units),
    days.map((d) => d.kwh),
  );
  const totalKwh = days.reduce((s, d) => s + d.kwh, 0);
  const totalUnits = days.reduce((s, d) => s + d.units, 0);
  return {
    id: `BL-${measure.id}`,
    measureId: measure.id,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    intensityKwhPerUnit: totalUnits ? totalKwh / totalUnits : 0,
    totalKwh,
    totalUnits,
    days: days.length,
    interceptKwh: fit.intercept,
    slopeKwhPerUnit: fit.slope,
    r2: fit.r2,
    cvRmsePct: fit.cvRmsePct,
    normalization: "Regresi harian kWh terhadap volume produksi (unit)",
  };
}

export interface SavingsPeriodInput {
  id: string;
  measure: EnergyMeasure;
  baseline: Baseline;
  readings: EnergyReading[];
  production: ProductionRecord[];
  periodStart: Date;
  periodEnd: Date;
  tariff: TariffSettings;
  closed: boolean;
  verification?: { verifier: string; verifiedAt: string } | null;
}

export function computeSavingsPeriod(i: SavingsPeriodInput): SavingsPeriod {
  const days = dailyIntensity(i.readings, i.production);
  const adjusted = days.reduce((s, d) => s + i.baseline.interceptKwh + i.baseline.slopeKwhPerUnit * d.units, 0);
  const totals = computeTotals(i.readings, i.tariff);
  const saved = adjusted - totals.kwh;
  const effectiveRate = totals.kwh > 0 ? totals.costIdr / totals.kwh : i.tariff.baseRateIdrPerKwh;
  const status = i.verification ? "verified" : i.closed ? "calculated" : "in_progress";
  return {
    id: i.id,
    measureId: i.measure.id,
    periodStart: i.periodStart.toISOString(),
    periodEnd: i.periodEnd.toISOString(),
    status,
    verifier: i.verification?.verifier ?? null,
    verifiedAt: i.verification?.verifiedAt ?? null,
    adjustedBaselineKwh: adjusted,
    actualKwh: totals.kwh,
    savedKwh: saved,
    savedIdr: saved * effectiveRate,
    savedPct: adjusted > 0 ? (saved / adjusted) * 100 : 0,
    avoidedEmissionKg: saved * i.tariff.emissionFactorKgPerKwh,
  };
}

/** Baseline model is considered adequate per common M&V guidance thresholds. */
export function baselineAdequacy(b: Baseline): { ok: boolean; note: string } {
  const ok = b.r2 >= 0.75 && b.cvRmsePct <= 25 && b.days >= 30;
  return {
    ok,
    note: ok
      ? "Model baseline memenuhi ambang kecukupan (R² ≥ 0,75; CV(RMSE) ≤ 25%; ≥ 30 hari)."
      : "Model baseline belum memenuhi ambang kecukupan; hasil penghematan perlu ditinjau analis.",
  };
}
