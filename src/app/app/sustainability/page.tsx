import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Activity,
  Factory,
  Leaf,
  Trees,
  TrendingDown,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getIkmContext,
  getSavings,
  loadWindow,
  rangeDays,
  resolveAnyRange,
} from "@/lib/services/ikm";
import {
  breakdownByMachine,
  buildSeries,
  computeTotals,
  dailyIntensity,
  overallIntensity,
  pctChange,
} from "@/lib/calc/energy";
import { DAY_MS, RANGE_OPTIONS, TZ_OFFSET_MS } from "@/lib/time";
import { fmtDateTime, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RangeSelect } from "@/components/filters/filters";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { MascotAvatar } from "@/components/brand/logo";
import {
  SustainabilityDimensionsView,
  type CarbonIntensityPoint,
  type EmissionTrendPoint,
  type MachineEmissionRow,
  type SustainabilityDimensionKey,
} from "@/app/app/sustainability/sustainability-dimensions";

export const metadata: Metadata = { title: "Keberlanjutan" };

export default async function SustainabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, savings] = await Promise.all([getIkmContext(), getSavings()]);
  const range = resolveAnyRange(ctx, { range: sp.range, from: sp.from, to: sp.to });

  const initialDim: SustainabilityDimensionKey =
    sp.dim === "machines" || sp.dim === "intensity" || sp.dim === "decarbonization"
      ? sp.dim
      : "footprint";

  const w = await loadWindow(ctx, range);
  const totals = computeTotals(w.readings, ctx.tariff);
  const prevTotals = w.prevComplete ? computeTotals(w.prevReadings, ctx.tariff) : null;
  const emissionDelta = prevTotals
    ? pctChange(totals.emissionKg, prevTotals.emissionKg)
    : null;

  const ef = ctx.tariff.emissionFactorKgPerKwh;
  const series = buildSeries(w.readings, range.from, range.to, range.granularity, ctx.tariff);
  const prevSeries = w.prevComplete
    ? buildSeries(w.prevReadings, w.prev.from, w.prev.to, range.granularity, ctx.tariff)
    : [];

  const trend: EmissionTrendPoint[] = series.map((p, i) => {
    const emissionKg = Math.round(p.kwh * ef * 10) / 10;
    const peakEmissionKg = Math.round(p.peakKwh * ef * 10) / 10;
    const offPeakEmissionKg = Math.max(0, Math.round((emissionKg - peakEmissionKg) * 10) / 10);
    return {
      t: p.t,
      kwh: p.kwh,
      emissionKg,
      prevEmissionKg:
        prevSeries[i] !== undefined ? Math.round(prevSeries[i].kwh * ef * 10) / 10 : null,
      peakEmissionKg,
      offPeakEmissionKg,
    };
  });

  const breakdown = breakdownByMachine(w.readings, ctx.machines, ctx.tariff);
  const machineRows: MachineEmissionRow[] = breakdown.map((b) => {
    const m = ctx.machines.find((x) => x.id === b.machineId);
    const emissionKg = Math.round(b.kwh * ef * 10) / 10;
    return {
      machineId: b.machineId,
      name: b.name,
      category: m?.category ?? "utility",
      location: m?.location ?? "Area produksi",
      kwh: b.kwh,
      emissionKg,
      sharePct: b.share * 100,
      runHours: b.runHours,
      kgPerRunHour: b.runHours > 0 ? emissionKg / b.runHours : 0,
      costIdr: b.costIdr,
    };
  });

  // Carbon intensity per unit (use at least 7 days when viewing 24h)
  const daysInRange = rangeDays(range);
  const intFrom =
    daysInRange < 7 ? new Date(range.to.getTime() - 7 * DAY_MS) : range.from;
  const [intReadings, intProd] =
    intFrom === range.from
      ? [w.readings, w.production]
      : await Promise.all([
          ctx.ds.getReadings({ from: intFrom, to: range.to }),
          ctx.ds.getProduction(intFrom, range.to),
        ]);

  const intensitySeries: CarbonIntensityPoint[] = dailyIntensity(intReadings, intProd).map(
    (d) => {
      const em = Math.round(d.kwh * ef * 10) / 10;
      return {
        t: new Date(new Date(`${d.date}T00:00:00Z`).getTime() - TZ_OFFSET_MS).toISOString(),
        date: d.date,
        units: d.units,
        kwh: d.kwh,
        emissionKg: em,
        carbonIntensity: d.intensity !== null ? Math.round(d.intensity * ef * 1000) / 1000 : null,
      };
    },
  );

  const kwhPerUnitNow = overallIntensity(intReadings, intProd);
  const currentCarbonIntensity = kwhPerUnitNow !== null ? kwhPerUnitNow * ef : null;
  const baselineCarbonIntensity = savings.baseline
    ? savings.baseline.intensityKwhPerUnit * ef
    : null;

  const avoidedEmissionKg = savings.calculated?.emissionKg ?? 0;
  const treesEquivalent = Math.max(1, Math.round(totals.emissionKg / 21.8));
  const peakEmissionKg = Math.round(totals.peakKwh * ef);
  const effectiveRateIdr =
    totals.kwh > 0 ? totals.costIdr / totals.kwh : ctx.tariff.baseRateIdrPerKwh;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Keberlanjutan & Jejak Karbon"
        description={
          <>
            Inventarisasi emisi Gas Rumah Kaca (GRK) Scope 2 dari konsumsi listrik untuk{" "}
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
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Emisi GRK Scope 2 dihitung dengan mengalikan kWh terukur terhadap faktor emisi jaringan interkoneksi PLN Jawa-Madura-Bali ({fmtNumber(ef, 2)} kg CO₂e/kWh). Anda dapat menyesuaikan faktor emisi di Pengaturan.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama keberlanjutan dan emisi karbon" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Emisi GRK Scope 2"
          value={fmtNumber(totals.emissionKg, 0)}
          unit="kg CO₂e"
          provenance="estimated"
          icon={<Leaf />}
          deltaPct={emissionDelta}
          goodWhen="down"
          footnote={`${fmtNumber(totals.emissionKg / 1000, 2)} tCO₂e · dari ${fmtNumber(totals.kwh, 0)} kWh`}
        />
        <KpiCard
          label="Intensitas Karbon Produk"
          value={
            currentCarbonIntensity !== null
              ? fmtNumber(currentCarbonIntensity, 2)
              : "—"
          }
          unit={`kg CO₂e / ${ctx.business.productUnit}`}
          provenance="estimated"
          icon={<Activity />}
          footnote={
            baselineCarbonIntensity !== null && currentCarbonIntensity !== null
              ? `${fmtPct(((currentCarbonIntensity - baselineCarbonIntensity) / baselineCarbonIntensity) * 100, 1)} vs baseline (${fmtNumber(baselineCarbonIntensity, 2)} kg/unit)`
              : "Rasio emisi terhadap output produksi"
          }
        />
        <KpiCard
          label="Emisi Terhindarkan (M&V)"
          value={fmtNumber(avoidedEmissionKg, 0)}
          unit="kg CO₂e"
          provenance={savings.verified ? "verified" : "estimated"}
          icon={<TrendingDown />}
          footnote={`${fmtNumber(avoidedEmissionKg / 1000, 2)} tCO₂e kumulatif dari proyek efisiensi`}
        />
        <KpiCard
          label="Ekuivalensi Serapan Karbon"
          value={fmtNumber(treesEquivalent, 0)}
          unit="pohon / thn"
          provenance="estimated"
          icon={<Trees />}
          accent
          footnote={`Daya serap pohon dewasa untuk menyeimbangkan ${fmtNumber(totals.emissionKg / 1000, 2)} tCO₂e`}
        />
      </section>

      <Suspense fallback={null}>
        <SustainabilityDimensionsView
          initialDim={initialDim}
          rangeLabel={range.label}
          granularity={range.granularity}
          rangeDaysCount={daysInRange}
          totalKwh={totals.kwh}
          totalEmissionKg={totals.emissionKg}
          peakEmissionKg={peakEmissionKg}
          avoidedEmissionKg={avoidedEmissionKg}
          emissionFactor={ef}
          tariffRateIdr={Math.round(effectiveRateIdr)}
          employees={ctx.business.employees}
          productUnit={ctx.business.productUnit}
          trend={trend}
          machineRows={machineRows}
          intensitySeries={intensitySeries}
          currentCarbonIntensity={currentCarbonIntensity}
          baselineCarbonIntensity={baselineCarbonIntensity}
        />
      </Suspense>
    </>
  );
}
