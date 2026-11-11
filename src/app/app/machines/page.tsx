import type { Metadata } from "next";
import { Suspense } from "react";
import { Bolt, Clock, Factory, Flame, Gauge } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getIkmContext,
  loadWindow,
  measuredProvenance,
  resolveAnyRange,
} from "@/lib/services/ikm";
import {
  breakdownByMachine,
  buildSeries,
  computeTotals,
  isPeakHour,
  readingCost,
} from "@/lib/calc/energy";
import type { MachineCategory } from "@/lib/domain/types";
import { RANGE_OPTIONS, localHour } from "@/lib/time";
import { fmtDateTime, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RangeSelect } from "@/components/filters/filters";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { MascotAvatar } from "@/components/brand/logo";
import {
  MachinesDimensionsView,
  type MachineDetailItem,
  type MachinesDimensionKey,
} from "@/app/app/machines/machines-dimensions";

export const metadata: Metadata = { title: "Mesin" };

const CATEGORY_LABEL: Record<MachineCategory, string> = {
  compressor: "Kompresor Udara",
  cnc: "Permesinan CNC",
  welding: "Pengelasan",
  oven: "Oven & Termal",
  pump: "Pompa & Fluida",
  utility: "Utilitas & HVAC",
};

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const ctx = await getIkmContext();
  const range = resolveAnyRange(ctx, { range: sp.range, from: sp.from, to: sp.to });
  const initialDim: MachinesDimensionKey =
    sp.dim === "comparison" || sp.dim === "schedule" || sp.dim === "telemetry" ? sp.dim : "overview";

  const w = await loadWindow(ctx, range);
  const totals = computeTotals(w.readings, ctx.tariff);
  const breakdown = breakdownByMachine(w.readings, ctx.machines, ctx.tariff);
  const prov = measuredProvenance(ctx);

  const machineIds = ctx.machines.map((m) => m.id);
  const series = buildSeries(w.readings, range.from, range.to, range.granularity, ctx.tariff, machineIds);

  const machineDetails: MachineDetailItem[] = breakdown.map((b) => {
    const m = ctx.machines.find((x) => x.id === b.machineId)!;
    const dev = ctx.devices.find((d) => d.id === m.deviceId)!;
    const rs = w.readings.filter((r) => r.machine_id === m.id);

    let scheduledKwh = 0;
    let offScheduleKwh = 0;
    let offScheduleCostIdr = 0;
    let peakTariffKwh = 0;
    let peakTariffCostIdr = 0;
    let vSum = 0;
    let vN = 0;
    let maxPowerKw = 0;

    const hourSums = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));

    for (const r of rs) {
      const h = localHour(r.timestamp);
      const cost = readingCost(r, ctx.tariff);
      const kw = (r.active_power_watt ?? 0) / 1000;
      if (kw > maxPowerKw) maxPowerKw = kw;
      if (r.voltage_volt !== null) {
        vSum += r.voltage_volt;
        vN += 1;
      }
      if (h >= m.schedule.start && h < m.schedule.end) {
        scheduledKwh += r.energy_kwh;
      } else {
        offScheduleKwh += r.energy_kwh;
        offScheduleCostIdr += cost;
      }
      if (isPeakHour(h, ctx.tariff)) {
        peakTariffKwh += r.energy_kwh;
        peakTariffCostIdr += cost;
      }
      hourSums[h].sum += r.energy_kwh;
      hourSums[h].count += 1;
    }

    const hourlyKw = hourSums.map((s) => (s.count > 0 ? Math.round((s.sum / s.count) * 100) / 100 : 0));

    return {
      id: m.id,
      name: m.name,
      category: m.category,
      categoryLabel: CATEGORY_LABEL[m.category],
      location: m.location,
      ratedPowerKw: m.ratedPowerKw,
      scheduleStart: m.schedule.start,
      scheduleEnd: m.schedule.end,
      scheduleDays: m.schedule.days,
      deviceId: dev.id,
      deviceSerial: dev.serial,
      deviceStatus: dev.status,
      deviceLastSeen: dev.lastSeen,
      deviceSignalDbm: dev.signalDbm,
      kwh: b.kwh,
      costIdr: b.costIdr,
      sharePct: Math.round(b.share * 1000) / 10,
      avgPowerKw: Math.round(b.avgPowerKw * 10) / 10,
      maxPowerKw: Math.round(maxPowerKw * 10) / 10,
      peakLoadPct: Math.min(100, Math.round(b.peakLoadPct * 10) / 10),
      avgPowerFactor: b.avgPowerFactor,
      avgVoltage: vN > 0 ? Math.round(vSum / vN) : null,
      runHours: b.runHours,
      scheduledKwh: Math.round(scheduledKwh * 10) / 10,
      offScheduleKwh: Math.round(offScheduleKwh * 10) / 10,
      offScheduleCostIdr: Math.round(offScheduleCostIdr),
      offScheduleSharePct: b.kwh > 0 ? Math.round((offScheduleKwh / b.kwh) * 1000) / 10 : 0,
      peakTariffKwh: Math.round(peakTariffKwh * 10) / 10,
      peakTariffCostIdr: Math.round(peakTariffCostIdr),
      hourlyKw,
    };
  });

  const topConsumer = machineDetails[0];
  const totalOffScheduleKwh = machineDetails.reduce((s, m) => s + m.offScheduleKwh, 0);
  const totalOffScheduleCost = machineDetails.reduce((s, m) => s + m.offScheduleCostIdr, 0);
  const lowestPfMachine = [...machineDetails]
    .filter((m) => m.avgPowerFactor !== null)
    .sort((a, b) => (a.avgPowerFactor ?? 1) - (b.avgPowerFactor ?? 1))[0];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Mesin"
        description={
          <>
            Profil beban dan efisiensi per mesin untuk{" "}
            <strong className="font-semibold text-ink">{range.label}</strong>. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={<RangeSelect value={range.key} options={RANGE_OPTIONS} />}
      />

      {ctx.mode === "demo" && (
        <Callout tone="info" icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />} className="mb-6">
          <strong>Lingkungan DEMO.</strong> Seluruh pembacaan energi pada dashboard ini adalah data simulasi untuk usaha fiktif dan bukan pembacaan sensor nyata.
          Biaya dan emisi merupakan estimasi berdasarkan asumsi yang dapat diubah di Pengaturan.
        </Callout>
      )}

      {/* Top KPI Row */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Konsumsi Terbesar"
          icon={<Flame />}
          value={topConsumer ? fmtNumber(topConsumer.kwh) : "0"}
          unit="kWh"
          provenance={prov}
          footnote={topConsumer ? `${topConsumer.name} (${fmtPct(topConsumer.sharePct)} dari total)` : "–"}
        />
        <KpiCard
          label="Total Daya Terpasang"
          icon={<Bolt />}
          value={fmtNumber(ctx.machines.reduce((s, m) => s + m.ratedPowerKw, 0), 1)}
          unit="kW rated"
          provenance={prov}
          footnote={`${ctx.machines.length} mesin dipantau secara terpisah`}
        />
        <KpiCard
          label="Konsumsi Luar Jadwal"
          icon={<Clock />}
          value={fmtNumber(totalOffScheduleKwh)}
          unit="kWh"
          provenance="estimated"
          footnote={`Est. biaya idle/lembur ${fmtIdrCompact(totalOffScheduleCost)}`}
        />
        <KpiCard
          accent
          label="Perhatian Faktor Daya"
          icon={<Gauge />}
          value={
            lowestPfMachine && lowestPfMachine.avgPowerFactor !== null
              ? fmtNumber(lowestPfMachine.avgPowerFactor, 2)
              : "–"
          }
          unit="cos φ terendah"
          provenance={prov}
          footnote={lowestPfMachine ? `${lowestPfMachine.name}` : "Seluruh mesin optimal"}
        />
      </div>

      <Suspense fallback={null}>
        <MachinesDimensionsView
          initialDim={initialDim}
          rangeLabel={range.label}
          granularity={range.granularity}
          provenance={prov}
          totalKwh={totals.kwh}
          totalCostIdr={totals.costIdr}
          machines={machineDetails}
          trend={series}
        />
      </Suspense>
    </>
  );
}
