import type { Metadata } from "next";
import { Suspense } from "react";
import { Bolt, CircleDollarSign, Gauge, Sunset, Zap } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  filterHours,
  getIkmContext,
  loadWindow,
  measuredProvenance,
  resolveAnyRange,
  type HourFilter,
} from "@/lib/services/ikm";
import {
  breakdownByMachine,
  buildSeries,
  computeTotals,
  isPeakHour,
  pctChange,
  readingCost,
} from "@/lib/calc/energy";
import { HOUR_MS, RANGE_OPTIONS, localHour, startOfLocalDay } from "@/lib/time";
import { fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { QuerySelect, RangeSelect } from "@/components/filters/filters";
import { KpiCard } from "@/components/data/kpi-card";
import {
  EnergyDimensionsView,
  type EnergyDimensionKey,
  type EnergyTrendPoint,
  type HourlyProfilePoint,
  type IntervalRow,
  type MachineQualitySummary,
} from "@/app/app/energy/energy-dimensions";

export const metadata: Metadata = { title: "Monitoring Energi" };

export default async function EnergyMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const ctx = await getIkmContext();
  const range = resolveAnyRange(ctx, { range: sp.range, from: sp.from, to: sp.to });
  const hourFilter: HourFilter =
    sp.hours === "work" || sp.hours === "off" || sp.hours === "peak" ? sp.hours : "all";
  const selectedMachineId =
    sp.machine && ctx.machines.some((m) => m.id === sp.machine) ? sp.machine : "";
  const initialDim: EnergyDimensionKey =
    sp.dim === "tariff" || sp.dim === "quality" || sp.dim === "intervals" ? sp.dim : "consumption";

  const w = await loadWindow(ctx, range, selectedMachineId ? [selectedMachineId] : undefined);
  const peakWindow = { start: ctx.tariff.peakStartHour, end: ctx.tariff.peakEndHour };
  const readings = filterHours(w.readings, hourFilter, peakWindow);
  const prevReadings = filterHours(w.prevReadings, hourFilter, peakWindow);

  const totals = computeTotals(readings, ctx.tariff);
  const prevTotals = w.prevComplete ? computeTotals(prevReadings, ctx.tariff) : null;
  const prov = measuredProvenance(ctx);

  const machineIds = ctx.machines.map((m) => m.id);
  const baseSeries = buildSeries(readings, range.from, range.to, range.granularity, ctx.tariff, machineIds);
  const prevSeries = w.prevComplete
    ? buildSeries(prevReadings, w.prev.from, w.prev.to, range.granularity, ctx.tariff)
    : [];

  // Bucket electrical averages (kw, pf, voltage, current, frequency)
  const step = range.granularity === "hour" ? HOUR_MS : 24 * HOUR_MS;
  const bucketMap = new Map<
    number,
    { kwSum: number; kwN: number; pfSum: number; pfE: number; vSum: number; vN: number; aSum: number; aN: number; hzSum: number; hzN: number }
  >();
  for (const r of readings) {
    const ms = new Date(r.timestamp).getTime();
    const key = range.granularity === "hour" ? ms : startOfLocalDay(new Date(ms)).getTime();
    let b = bucketMap.get(key);
    if (!b) {
      b = { kwSum: 0, kwN: 0, pfSum: 0, pfE: 0, vSum: 0, vN: 0, aSum: 0, aN: 0, hzSum: 0, hzN: 0 };
      bucketMap.set(key, b);
    }
    if (r.active_power_watt !== null) {
      b.kwSum += r.active_power_watt / 1000;
      b.kwN += 1;
    }
    if (r.power_factor !== null) {
      b.pfSum += r.power_factor * r.energy_kwh;
      b.pfE += r.energy_kwh;
    }
    if (r.voltage_volt !== null) {
      b.vSum += r.voltage_volt;
      b.vN += 1;
    }
    if (r.current_ampere !== null) {
      b.aSum += r.current_ampere;
      b.aN += 1;
    }
    if (r.frequency_hz !== null) {
      b.hzSum += r.frequency_hz;
      b.hzN += 1;
    }
  }

  const peakRate = ctx.tariff.baseRateIdrPerKwh * ctx.tariff.peakMultiplier;
  const trend: EnergyTrendPoint[] = baseSeries.map((p, i) => {
    const ms = new Date(p.t).getTime();
    const b = bucketMap.get(ms);
    const peakCostIdr = Math.round(p.peakKwh * peakRate);
    const offPeakCostIdr = Math.max(0, Math.round(p.costIdr - peakCostIdr));
    const offPeakKwh = Math.max(0, Math.round((p.kwh - p.peakKwh) * 100) / 100);
    const hoursInBucket = step / HOUR_MS;
    const row: EnergyTrendPoint = {
      t: p.t,
      kwh: p.kwh,
      prevKwh: prevSeries[i]?.kwh ?? null,
      costIdr: p.costIdr,
      peakCostIdr,
      offPeakCostIdr,
      peakKwh: p.peakKwh,
      offPeakKwh,
      kw: Math.round((p.kwh / hoursInBucket) * 10) / 10,
      pf: b && b.pfE > 0 ? Math.round((b.pfSum / b.pfE) * 1000) / 1000 : null,
      voltage: b && b.vN > 0 ? Math.round((b.vSum / b.vN) * 10) / 10 : null,
      current: b && b.aN > 0 ? Math.round((b.aSum / b.aN) * 10) / 10 : null,
      frequency: b && b.hzN > 0 ? Math.round((b.hzSum / b.hzN) * 100) / 100 : null,
    };
    for (const mid of machineIds) {
      row[mid] = (p[mid] as number) ?? 0;
    }
    return row;
  });

  // 24-hour diurnal load profile
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    kwhSum: 0,
    timestamps: new Set<string>(),
    pfSum: 0,
    pfE: 0,
  }));
  for (const r of readings) {
    const h = localHour(r.timestamp);
    const slot = byHour[h];
    if (!slot) continue;
    slot.kwhSum += r.energy_kwh;
    slot.timestamps.add(r.timestamp);
    if (r.power_factor !== null) {
      slot.pfSum += r.power_factor * r.energy_kwh;
      slot.pfE += r.energy_kwh;
    }
  }
  const hourlyProfile: HourlyProfilePoint[] = byHour.map((slot) => {
    const count = Math.max(1, slot.timestamps.size);
    const avgKw = Math.round((slot.kwhSum / count) * 10) / 10;
    const zone: HourlyProfilePoint["zone"] = isPeakHour(slot.hour, ctx.tariff)
      ? "wbp"
      : slot.hour >= 7 && slot.hour < 17
        ? "work"
        : "idle";
    return {
      hour: slot.hour,
      hourLabel: `${String(slot.hour).padStart(2, "0")}.00`,
      avgKwh: avgKw,
      avgKw,
      avgPf: slot.pfE > 0 ? Math.round((slot.pfSum / slot.pfE) * 100) / 100 : null,
      zone,
    };
  });

  // Per-machine breakdown & quality summary
  const breakdown = breakdownByMachine(readings, ctx.machines, ctx.tariff);
  const machineSummaries: MachineQualitySummary[] = breakdown.map((b) => {
    const m = ctx.machines.find((x) => x.id === b.machineId)!;
    const rs = readings.filter((r) => r.machine_id === m.id);
    const vList = rs.map((r) => r.voltage_volt).filter((v): v is number => v !== null);
    const pfList = rs.map((r) => r.power_factor).filter((p): p is number => p !== null);
    const maxKw = rs.reduce((mx, r) => Math.max(mx, (r.active_power_watt ?? 0) / 1000), 0);
    return {
      machineId: m.id,
      name: m.name,
      ratedKw: m.ratedPowerKw,
      kwh: b.kwh,
      costIdr: b.costIdr,
      sharePct: b.share * 100,
      avgPf: b.avgPowerFactor,
      minPf: pfList.length ? Math.min(...pfList) : null,
      avgVoltage: vList.length ? Math.round(vList.reduce((s, v) => s + v, 0) / vList.length) : null,
      maxKw: Math.round(maxKw * 10) / 10,
      peakLoadPct: Math.min(100, Math.round(b.peakLoadPct * 10) / 10),
      outOfRangeCount: rs.filter((r) => r.quality === "out_of_range").length,
    };
  });

  // Interval table rows (latest 150 intervals)
  const mById = new Map(ctx.machines.map((m) => [m.id, m.name]));
  const intervalRows: IntervalRow[] = [...readings]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 150)
    .map((r, idx) => {
      const h = localHour(r.timestamp);
      const peak = isPeakHour(h, ctx.tariff);
      return {
        id: `${r.device_id}-${r.timestamp}-${idx}`,
        timestamp: r.timestamp,
        machineId: r.machine_id,
        machineName: mById.get(r.machine_id) ?? r.machine_id,
        deviceId: r.device_id,
        kwh: r.energy_kwh,
        kw: r.active_power_watt !== null ? Math.round((r.active_power_watt / 1000) * 10) / 10 : null,
        voltage: r.voltage_volt,
        current: r.current_ampere,
        pf: r.power_factor,
        frequency: r.frequency_hz,
        costIdr: Math.round(readingCost(r, ctx.tariff)),
        zone: peak ? "WBP" : "LWBP",
        quality: r.quality,
      };
    });

  const peakCostTotal = Math.round(totals.peakKwh * peakRate);
  const offPeakCostTotal = Math.max(0, Math.round(totals.costIdr - peakCostTotal));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5" aria-hidden /> Monitoring Energi Multi-Dimensi
          </span>
        }
        title="Monitoring Energi & Kualitas Daya"
        description={
          <>
            Analisis konsumsi listrik, distribusi tarif WBP/LWBP, dan parameter kelistrikan 3-fase untuk{" "}
            <strong className="font-semibold text-ink">{range.label}</strong>.
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuerySelect
              param="machine"
              value={selectedMachineId}
              label="Filter mesin"
              options={[
                { value: "", label: "Semua Mesin (6 titik ukur)" },
                ...ctx.machines.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
            <QuerySelect
              param="hours"
              value={hourFilter}
              label="Filter jam operasional"
              options={[
                { value: "all", label: "Semua Jam (24 Jam)" },
                { value: "work", label: "Jam Kerja (07.00–17.00)" },
                { value: "peak", label: `Jam Puncak WBP (${ctx.tariff.peakStartHour}.00–${ctx.tariff.peakEndHour}.00)` },
                { value: "off", label: "Luar Jam Kerja (17.00–07.00)" },
              ]}
            />
            <RangeSelect value={range.key} options={RANGE_OPTIONS} clearParams={["from", "to"]} />
          </div>
        }
      />

      {/* Top KPI Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Konsumsi Energi"
          icon={<Bolt />}
          value={fmtNumber(totals.kwh)}
          unit="kWh"
          provenance={prov}
          deltaPct={prevTotals ? pctChange(totals.kwh, prevTotals.kwh) : null}
          goodWhen="down"
          footnote="vs periode pembanding"
        />
        <KpiCard
          label="Estimasi Biaya Listrik"
          icon={<CircleDollarSign />}
          value={fmtIdrCompact(totals.costIdr)}
          provenance="estimated"
          deltaPct={prevTotals ? pctChange(totals.costIdr, prevTotals.costIdr) : null}
          goodWhen="down"
          footnote={`Golongan ${ctx.tariff.tariffGroup} · LWBP & WBP`}
        />
        <KpiCard
          label="Porsi Beban Puncak (WBP)"
          icon={<Sunset />}
          value={fmtPct(totals.peakShare * 100)}
          unit={`(${fmtNumber(totals.peakKwh)} kWh)`}
          provenance={prov}
          footnote={`Jam ${ctx.tariff.peakStartHour}.00–${ctx.tariff.peakEndHour}.00 WIB · Puncak ${fmtNumber(totals.maxDemandKw, 1)} kW`}
        />
        <KpiCard
          accent
          label="Rata-Rata Faktor Daya"
          icon={<Gauge />}
          value={totals.avgPowerFactor !== null ? fmtNumber(totals.avgPowerFactor, 2) : "–"}
          unit="cos φ"
          provenance={prov}
          footnote={
            totals.avgPowerFactor !== null && totals.avgPowerFactor >= 0.85
              ? "Memenuhi standar PLN (≥ 0,85)"
              : "Di bawah ambang 0,85 — cek kapasitor"
          }
        />
      </div>

      <Suspense fallback={null}>
        <EnergyDimensionsView
          initialDim={initialDim}
          rangeLabel={range.label}
          granularity={range.granularity}
          provenance={prov}
          totals={{
            kwh: totals.kwh,
            costIdr: totals.costIdr,
            peakKwh: totals.peakKwh,
            offPeakKwh: Math.max(0, Math.round((totals.kwh - totals.peakKwh) * 10) / 10),
            peakCostIdr: peakCostTotal,
            offPeakCostIdr: offPeakCostTotal,
            peakShare: totals.peakShare,
            avgPowerFactor: totals.avgPowerFactor,
            maxDemandKw: totals.maxDemandKw,
            hasPrev: !!prevTotals,
          }}
          tariff={{
            tariffGroup: ctx.tariff.tariffGroup,
            baseRateIdrPerKwh: ctx.tariff.baseRateIdrPerKwh,
            peakMultiplier: ctx.tariff.peakMultiplier,
            peakStartHour: ctx.tariff.peakStartHour,
            peakEndHour: ctx.tariff.peakEndHour,
          }}
          machines={ctx.machines.map((m) => ({ id: m.id, name: m.name }))}
          trend={trend}
          hourlyProfile={hourlyProfile}
          machineSummaries={machineSummaries}
          intervalRows={intervalRows}
        />
      </Suspense>
    </>
  );
}
