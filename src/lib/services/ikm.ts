import "server-only";
import { cache } from "react";
import type { Alert, DateRange, EnergyReading, GreenScoreResult, RangeKey, SavingsPeriod } from "@/lib/domain/types";
import { getDataSource } from "@/lib/data";
import { store } from "@/lib/store/platform-store";
import {
  breakdownByMachine,
  buildSeries,
  computeTotals,
  dailyIntensity,
  overallIntensity,
  pctChange,
  type EnergyTotals,
} from "@/lib/calc/energy";
import { assessQuality } from "@/lib/calc/quality";
import { baselineAdequacy, computeBaseline, computeSavingsPeriod } from "@/lib/calc/savings";
import { computeGreenScore, type GreenScoreInputs } from "@/lib/calc/green-score";
import { detectAlerts } from "@/lib/calc/alerts";
import { buildRecommendations } from "@/lib/calc/recommendations";
import { DAY_MS, HOUR_MS, isRangeKey, localDayKey, localHour, previousRange, resolveRange, startOfLocalDay, TZ_OFFSET_MS } from "@/lib/time";

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export const getIkmContext = cache(async () => {
  const ds = getDataSource();
  const [business, machines, devices, latest, earliest, measures, verifications] = await Promise.all([
    ds.getBusiness(),
    ds.getMachines(),
    ds.getDevices(),
    ds.getLatestTimestamp(),
    ds.getEarliestTimestamp(),
    ds.getMeasures(),
    ds.getVerificationRecords(),
  ]);
  const s = store();
  return {
    ds,
    mode: ds.mode,
    business,
    machines,
    devices,
    latest,
    earliest,
    lastUpdate: new Date(latest.getTime() + HOUR_MS),
    measures,
    verifications,
    tariff: s.tariff,
    weights: s.weights,
  };
});

export type IkmContext = Awaited<ReturnType<typeof getIkmContext>>;

/** Readings provenance in the active environment. */
export function measuredProvenance(ctx: IkmContext) {
  return ctx.mode === "demo" ? ("simulated" as const) : ("live" as const);
}

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolve preset or custom (yyyy-mm-dd, Jakarta days, inclusive) range. */
export function resolveAnyRange(
  ctx: IkmContext,
  params: { range?: string; from?: string; to?: string },
  fallback: RangeKey = "30d",
): DateRange & { custom: boolean } {
  if (params.range === "custom" && params.from && params.to && DATE_RE.test(params.from) && DATE_RE.test(params.to)) {
    let from = new Date(new Date(`${params.from}T00:00:00Z`).getTime() - TZ_OFFSET_MS);
    let to = new Date(new Date(`${params.to}T00:00:00Z`).getTime() - TZ_OFFSET_MS + DAY_MS);
    const maxTo = new Date(ctx.latest.getTime() + HOUR_MS);
    if (from < ctx.earliest) from = ctx.earliest;
    if (to > maxTo) to = maxTo;
    if (from < to) {
      const days = (to.getTime() - from.getTime()) / DAY_MS;
      return {
        key: "30d",
        from,
        to,
        label: `${params.from} s.d. ${params.to}`,
        granularity: days <= 7 ? "hour" : "day",
        custom: true,
      };
    }
  }
  return { ...resolveRange(isRangeKey(params.range) ? params.range : undefined, ctx.latest, fallback), custom: false };
}

export function rangeDays(r: DateRange) {
  return (r.to.getTime() - r.from.getTime()) / DAY_MS;
}

/* ------------------------------------------------------------------ */
/* Savings (M&V)                                                       */
/* ------------------------------------------------------------------ */

export const getSavings = cache(async () => {
  const ctx = await getIkmContext();
  const measure = ctx.measures.find((m) => m.status === "implemented");
  const planned = ctx.measures.filter((m) => m.status === "planned");
  if (!measure) return { measure: null, planned, baseline: null, adequacy: null, periods: [] as SavingsPeriod[], daily: [], verified: null, calculated: null };

  const implAt = new Date(measure.implementedAt);
  const blStart = ctx.earliest;
  const [blReadings, blProd] = await Promise.all([ctx.ds.getReadings({ from: blStart, to: implAt }), ctx.ds.getProduction(blStart, implAt)]);
  const baseline = computeBaseline(measure, blReadings, blProd, blStart, implAt);

  // Reporting periods: consecutive 30-day windows of complete days only.
  const reportEnd = startOfLocalDay(new Date(ctx.latest.getTime() + HOUR_MS));
  const periods: SavingsPeriod[] = [];
  let n = 1;
  for (let s = implAt.getTime(); s < reportEnd.getTime(); s += 30 * DAY_MS, n++) {
    const e = Math.min(s + 30 * DAY_MS, reportEnd.getTime());
    const from = new Date(s);
    const to = new Date(e);
    const [rs, prod] = await Promise.all([ctx.ds.getReadings({ from, to }), ctx.ds.getProduction(from, to)]);
    const v = ctx.verifications.find((x) => x.measureId === measure.id && x.periodStart === from.toISOString());
    periods.push(
      computeSavingsPeriod({
        id: `MV-${measure.id}-P${n}`,
        measure,
        baseline,
        readings: rs,
        production: prod,
        periodStart: from,
        periodEnd: to,
        tariff: ctx.tariff,
        closed: e - s === 30 * DAY_MS,
        verification: v ? { verifier: v.verifier, verifiedAt: v.verifiedAt } : null,
      }),
    );
  }

  // Daily actual vs. modelled baseline (for charting), across baseline + reporting.
  const [allReadings, allProd] = await Promise.all([ctx.ds.getReadings({ from: blStart, to: reportEnd }), ctx.ds.getProduction(blStart, reportEnd)]);
  const implKey = localDayKey(implAt);
  const daily = dailyIntensity(allReadings, allProd).map((d) => ({
    t: new Date(new Date(`${d.date}T00:00:00Z`).getTime() - TZ_OFFSET_MS).toISOString(),
    actual: d.kwh,
    modelled: Math.round((baseline.interceptKwh + baseline.slopeKwhPerUnit * d.units) * 10) / 10,
    units: d.units,
    phase: d.date < implKey ? "baseline" : "reporting",
  }));

  const sum = (ps: SavingsPeriod[]) =>
    ps.length
      ? {
          kwh: ps.reduce((s, p) => s + p.savedKwh, 0),
          idr: ps.reduce((s, p) => s + p.savedIdr, 0),
          emissionKg: ps.reduce((s, p) => s + p.avoidedEmissionKg, 0),
          pct: ps[ps.length - 1].savedPct,
          periods: ps.length,
          lastPeriodEnd: ps[ps.length - 1].periodEnd,
        }
      : null;

  return {
    measure,
    planned,
    baseline,
    adequacy: baselineAdequacy(baseline),
    periods,
    daily,
    verified: sum(periods.filter((p) => p.status === "verified")),
    calculated: sum(periods.filter((p) => p.status !== "in_progress")),
  };
});

/* ------------------------------------------------------------------ */
/* Green Score                                                         */
/* ------------------------------------------------------------------ */

async function greenScoreForWindow(ctx: IkmContext, from: Date, to: Date, label: string, baselineIntensity: number | null, verifiedPct: number | null) {
  const [rs, prod] = await Promise.all([ctx.ds.getReadings({ from, to }), ctx.ds.getProduction(from, to)]);
  const totals = computeTotals(rs, ctx.tariff);
  const quality = assessQuality(rs, ctx.machines, from, to);
  const intensity = overallIntensity(rs, prod);
  const inputs: GreenScoreInputs = {
    intensityImprovementPct: baselineIntensity && intensity ? ((baselineIntensity - intensity) / baselineIntensity) * 100 : null,
    verifiedSavingsPct: verifiedPct,
    completeness: quality.completeness,
    peakShare: totals.peakShare,
    avgPowerFactor: totals.avgPowerFactor,
    periodLabel: label,
  };
  return { result: computeGreenScore(inputs, ctx.weights), inputs, totals, intensity };
}

export const getGreenScore = cache(async () => {
  const ctx = await getIkmContext();
  const savings = await getSavings();
  const end = startOfLocalDay(new Date(ctx.latest.getTime() + HOUR_MS));
  const baselineIntensity = savings.baseline?.intensityKwhPerUnit ?? null;

  const history: { t: string; label: string; score: number; grade: GreenScoreResult["grade"] }[] = [];
  let current: Awaited<ReturnType<typeof greenScoreForWindow>> | null = null;
  for (let i = 3; i >= 0; i--) {
    const to = new Date(end.getTime() - i * 30 * DAY_MS);
    const from = new Date(to.getTime() - 30 * DAY_MS);
    if (from < ctx.earliest) continue;
    // Only verified periods that had been verified by the end of this window count.
    const verifiedBy = savings.periods.filter((p) => p.status === "verified" && p.verifiedAt && new Date(p.verifiedAt) <= to);
    const vPct = verifiedBy.length ? verifiedBy[verifiedBy.length - 1].savedPct : null;
    const label = i === 0 ? "30 hari terakhir" : `${i * 30 + 30}–${i * 30} hari lalu`;
    const w = await greenScoreForWindow(ctx, from, to, label, baselineIntensity, vPct);
    history.push({ t: to.toISOString(), label, score: w.result.total, grade: w.result.grade });
    if (i === 0) current = w;
  }
  return { current: current!, history };
});

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export const getAlerts = cache(async () => {
  const ctx = await getIkmContext();
  const to = new Date(ctx.latest.getTime() + HOUR_MS);
  const from = new Date(to.getTime() - 7 * DAY_MS);
  const rs = await ctx.ds.getReadings({ from, to });
  const all = detectAlerts(rs, ctx.machines, ctx.devices, { from, to }, ctx.tariff);
  const acked = new Set(store().acknowledgedAlerts);
  return {
    window: { from, to },
    all: all.map((a) => ({ ...a, acknowledged: acked.has(a.id) })),
    open: all.filter((a) => !acked.has(a.id)),
  };
});

export type AlertWithAck = Alert & { acknowledged: boolean };

/* ------------------------------------------------------------------ */
/* Window loader shared by several pages                               */
/* ------------------------------------------------------------------ */

export type HourFilter = "all" | "work" | "off" | "peak";

export function filterHours(readings: EnergyReading[], f: HourFilter, peak: { start: number; end: number }) {
  if (f === "all") return readings;
  return readings.filter((r) => {
    const h = localHour(r.timestamp);
    if (f === "work") return h >= 7 && h < 17;
    if (f === "off") return h < 7 || h >= 17;
    return h >= peak.start && h < peak.end;
  });
}

export async function loadWindow(ctx: IkmContext, range: DateRange, machineIds?: string[]) {
  const prev = previousRange(range);
  const [readings, prevReadings, production, prevProduction] = await Promise.all([
    ctx.ds.getReadings({ from: range.from, to: range.to, machineIds }),
    ctx.ds.getReadings({ from: prev.from < ctx.earliest ? ctx.earliest : prev.from, to: prev.to, machineIds }),
    ctx.ds.getProduction(range.from, range.to),
    ctx.ds.getProduction(prev.from < ctx.earliest ? ctx.earliest : prev.from, prev.to),
  ]);
  const prevComplete = prev.from >= ctx.earliest;
  return { readings, prevReadings, production, prevProduction, prev, prevComplete };
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export async function getOverview(rangeKey: string | undefined) {
  const ctx = await getIkmContext();
  const range = resolveAnyRange(ctx, { range: rangeKey });
  const w = await loadWindow(ctx, range);
  const totals = computeTotals(w.readings, ctx.tariff);
  const prevTotals: EnergyTotals | null = w.prevComplete ? computeTotals(w.prevReadings, ctx.tariff) : null;

  const series = buildSeries(w.readings, range.from, range.to, range.granularity, ctx.tariff);
  const prevSeries = w.prevComplete ? buildSeries(w.prevReadings, w.prev.from, w.prev.to, range.granularity, ctx.tariff) : [];
  const trend = series.map((p, i) => ({
    t: p.t,
    kwh: p.kwh,
    prevKwh: prevSeries[i]?.kwh ?? null,
    costIdr: p.costIdr,
    peakCostIdr: Math.round(p.peakKwh * ctx.tariff.baseRateIdrPerKwh * ctx.tariff.peakMultiplier),
    offPeakCostIdr: Math.round(p.costIdr - p.peakKwh * ctx.tariff.baseRateIdrPerKwh * ctx.tariff.peakMultiplier),
  }));

  const breakdown = breakdownByMachine(w.readings, ctx.machines, ctx.tariff);

  // Intensity needs whole days: use at least the last 7 days.
  const intFrom = rangeDays(range) < 7 ? new Date(range.to.getTime() - 7 * DAY_MS) : range.from;
  const [intReadings, intProd] =
    intFrom === range.from ? [w.readings, w.production] : await Promise.all([ctx.ds.getReadings({ from: intFrom, to: range.to }), ctx.ds.getProduction(intFrom, range.to)]);
  const intensity = dailyIntensity(intReadings, intProd).map((d) => ({
    t: new Date(new Date(`${d.date}T00:00:00Z`).getTime() - TZ_OFFSET_MS).toISOString(),
    intensity: d.intensity,
    units: d.units,
  }));
  const intensityNow = overallIntensity(intReadings, intProd);

  const quality = assessQuality(w.readings, ctx.machines, range.from, range.to);
  const [savings, green, alerts] = await Promise.all([getSavings(), getGreenScore(), getAlerts()]);

  const ovenPeakKwh = w.readings
    .filter((r) => ctx.machines.find((m) => m.id === r.machine_id)?.category === "oven")
    .filter((r) => {
      const h = localHour(r.timestamp);
      return h >= ctx.tariff.peakStartHour && h < ctx.tariff.peakEndHour;
    })
    .reduce((s, r) => s + r.energy_kwh, 0);

  const recommendations = buildRecommendations({
    breakdown,
    alerts: alerts.open,
    totals,
    rangeDays: rangeDays(range),
    tariff: ctx.tariff,
    ovenPeakKwh,
    completeness: quality.completeness,
  });

  return {
    ctx,
    range,
    totals,
    prevTotals,
    deltas: {
      kwh: prevTotals ? pctChange(totals.kwh, prevTotals.kwh) : null,
      cost: prevTotals ? pctChange(totals.costIdr, prevTotals.costIdr) : null,
    },
    trend,
    breakdown,
    intensity,
    intensityNow,
    intensityFromDays: Math.round((range.to.getTime() - intFrom.getTime()) / DAY_MS),
    quality,
    savings,
    green,
    alerts,
    recommendations,
  };
}
