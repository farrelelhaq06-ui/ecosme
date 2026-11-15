"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Car,
  Cpu,
  Flame,
  Fuel,
  Leaf,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trees,
  TrendingDown,
} from "lucide-react";
import { cn, fmtDateShort, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/feedback";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { MACHINE_COLORS, VIZ } from "@/components/charts/format";
import { DataTable, type Column } from "@/components/data/data-table";

export type SustainabilityDimensionKey =
  | "footprint"
  | "machines"
  | "intensity"
  | "decarbonization";

export interface EmissionTrendPoint {
  t: string;
  emissionKg: number;
  prevEmissionKg: number | null;
  peakEmissionKg: number;
  offPeakEmissionKg: number;
  kwh: number;
  [key: string]: string | number | null;
}

export interface MachineEmissionRow {
  machineId: string;
  name: string;
  category: string;
  location: string;
  kwh: number;
  emissionKg: number;
  sharePct: number;
  runHours: number;
  kgPerRunHour: number;
  costIdr: number;
}

export interface CarbonIntensityPoint {
  t: string;
  date: string;
  units: number;
  kwh: number;
  emissionKg: number;
  carbonIntensity: number | null;
  [key: string]: string | number | null;
}

const DIMENSIONS: {
  key: SustainabilityDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Leaf;
}[] = [
  {
    key: "footprint",
    label: "Jejak Karbon & Tren CO₂e",
    shortDesc: "Kurva emisi Scope 2 harian, WBP/LWBP & ekuivalensi",
    icon: Leaf,
  },
  {
    key: "machines",
    label: "Kontribusi Emisi Mesin",
    shortDesc: "Peringkat beban karbon per mesin & prioritas mitigasi",
    icon: Cpu,
  },
  {
    key: "intensity",
    label: "Intensitas Karbon Produksi",
    shortDesc: "Rasio kg CO₂e per unit produk terhadap baseline M&V",
    icon: Activity,
  },
  {
    key: "decarbonization",
    label: "Simulasi Dekarbonisasi",
    shortDesc: "Kalkulator PLTS Atap, efisiensi & peta jalan Net-Zero",
    icon: Sun,
  },
];

export function SustainabilityDimensionsView({
  initialDim,
  rangeLabel,
  granularity,
  rangeDaysCount,
  totalKwh,
  totalEmissionKg,
  peakEmissionKg,
  avoidedEmissionKg,
  emissionFactor,
  tariffRateIdr,
  employees,
  productUnit,
  trend,
  machineRows,
  intensitySeries,
  currentCarbonIntensity,
  baselineCarbonIntensity,
}: {
  initialDim: SustainabilityDimensionKey;
  rangeLabel: string;
  granularity: "hour" | "day";
  rangeDaysCount: number;
  totalKwh: number;
  totalEmissionKg: number;
  peakEmissionKg: number;
  avoidedEmissionKg: number;
  emissionFactor: number;
  tariffRateIdr: number;
  employees: number;
  productUnit: string;
  trend: EmissionTrendPoint[];
  machineRows: MachineEmissionRow[];
  intensitySeries: CarbonIntensityPoint[];
  currentCarbonIntensity: number | null;
  baselineCarbonIntensity: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as SustainabilityDimensionKey | null;
  const [activeDim, setActiveDim] = useState<SustainabilityDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<SustainabilityDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "footprint" ||
        urlDim === "machines" ||
        urlDim === "intensity" ||
        urlDim === "decarbonization")
    ) {
      setActiveDim(urlDim);
    }
  }

  // Sub-controls for Footprint tab
  const [chartMode, setChartMode] = useState<"compare" | "shift">("compare");

  // Interactive simulator state for Decarbonization tab
  const [solarKwp, setSolarKwp] = useState<number>(25);
  const [opsEffPct, setOpsEffPct] = useState<number>(10);
  const [sunHours, setSunHours] = useState<number>(4.2);

  function selectDimension(dim: SustainabilityDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "footprint") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Environmental equivalencies for current window
  // 1 mature tropical tree absorbs ~21.8 kg CO2/year
  const treesEquivalent = Math.max(1, Math.round(totalEmissionKg / 21.8));
  // 1 liter industrial diesel emits ~2.68 kg CO2e
  const dieselLitersEquivalent = Math.round(totalEmissionKg / 2.68);
  // 1 km light commercial vehicle ~0.192 kg CO2e
  const vehicleKmEquivalent = Math.round(totalEmissionKg / 0.192);

  const donutSlices = machineRows.map((m, i) => ({
    name: m.name,
    value: m.emissionKg,
    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
  }));

  // Annualized baseline from active window
  const annualMultiplier = rangeDaysCount > 0 ? 365 / rangeDaysCount : 12;
  const annualBaselineKwh = Math.round(totalKwh * annualMultiplier);
  const annualBaselineCo2Kg = Math.round(totalEmissionKg * annualMultiplier);

  // Simulator calculations
  const annualSolarKwh = Math.round(solarKwp * sunHours * 365 * 0.82); // 0.82 performance ratio
  const annualOpsSavedKwh = Math.round(annualBaselineKwh * (opsEffPct / 100));
  const totalAbatedKwh = Math.min(annualBaselineKwh, annualSolarKwh + annualOpsSavedKwh);
  const totalAbatedCo2Kg = Math.round(totalAbatedKwh * emissionFactor);
  const residualCo2Kg = Math.max(0, annualBaselineCo2Kg - totalAbatedCo2Kg);
  const abatementPct = annualBaselineCo2Kg > 0 ? (totalAbatedCo2Kg / annualBaselineCo2Kg) * 100 : 0;
  const annualSavedIdr = Math.round(totalAbatedKwh * tariffRateIdr);
  // Approx rooftop solar capex ~Rp 11.5 jt / kWp + ops retrofit ~Rp 15 jt
  const estimatedCapexIdr = solarKwp * 11_500_000 + (opsEffPct > 0 ? 15_000_000 : 0);
  const paybackYears = annualSavedIdr > 0 ? estimatedCapexIdr / annualSavedIdr : null;

  const machineColumns: Column<MachineEmissionRow>[] = [
    {
      key: "name",
      header: "Mesin & Area",
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.name}</div>
          <div className="text-xs text-ink-muted">
            {r.location} · <span className="uppercase">{r.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: "emission",
      header: "Jejak Karbon",
      align: "right",
      sortValue: (r) => r.emissionKg,
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{fmtNumber(r.emissionKg, 0)} kg CO₂e</div>
          <div className="text-xs text-ink-muted">
            {fmtNumber(r.emissionKg / 1000, 2)} tCO₂e
          </div>
        </div>
      ),
    },
    {
      key: "share",
      header: "Porsi Fasilitas",
      align: "right",
      sortValue: (r) => r.sharePct,
      render: (r) => (
        <div className="inline-flex flex-col items-end gap-1">
          <span className="font-medium text-ink">{fmtPct(r.sharePct, 1)}</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-700"
              style={{ width: `${Math.min(100, r.sharePct)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "kwh",
      header: "Konsumsi Listrik",
      align: "right",
      sortValue: (r) => r.kwh,
      render: (r) => `${fmtNumber(r.kwh, 0)} kWh`,
    },
    {
      key: "rate",
      header: "Laju Emisi Aktif",
      align: "right",
      sortValue: (r) => r.kgPerRunHour,
      render: (r) => `${fmtNumber(r.kgPerRunHour, 2)} kg/jam`,
    },
    {
      key: "priority",
      header: "Prioritas Mitigasi",
      render: (r) =>
        r.sharePct >= 25 ? (
          <Badge tone="danger">Prioritas Utama</Badge>
        ) : r.sharePct >= 12 ? (
          <Badge tone="warning">Prioritas Menengah</Badge>
        ) : (
          <Badge tone="neutral">Rutin</Badge>
        ),
    },
  ];

  const intensityColumns: Column<CarbonIntensityPoint>[] = [
    {
      key: "date",
      header: "Tanggal",
      sortValue: (r) => r.date,
      render: (r) => <span className="font-medium text-ink">{fmtDateShort(r.t)}</span>,
    },
    {
      key: "units",
      header: "Output Produksi",
      align: "right",
      sortValue: (r) => r.units,
      render: (r) => `${fmtNumber(r.units, 0)} ${productUnit}`,
    },
    {
      key: "kwh",
      header: "Energi (kWh)",
      align: "right",
      sortValue: (r) => r.kwh,
      render: (r) => `${fmtNumber(r.kwh, 0)} kWh`,
    },
    {
      key: "emission",
      header: "Emisi Harian",
      align: "right",
      sortValue: (r) => r.emissionKg,
      render: (r) => `${fmtNumber(r.emissionKg, 1)} kg CO₂e`,
    },
    {
      key: "intensity",
      header: "Intensitas Karbon",
      align: "right",
      sortValue: (r) => r.carbonIntensity ?? 0,
      render: (r) =>
        r.carbonIntensity !== null ? (
          <span className="font-semibold text-ink">
            {fmtNumber(r.carbonIntensity, 2)} kg CO₂e/unit
          </span>
        ) : (
          <span className="text-ink-subtle">Libur produksi</span>
        ),
    },
    {
      key: "status",
      header: "vs Baseline M&V",
      render: (r) => {
        if (r.carbonIntensity === null || baselineCarbonIntensity === null) {
          return <Badge tone="neutral">N/A</Badge>;
        }
        const diffPct =
          ((r.carbonIntensity - baselineCarbonIntensity) / baselineCarbonIntensity) * 100;
        return diffPct <= 0 ? (
          <Badge tone="success">{fmtPct(diffPct, 1)} (Lebih rendah)</Badge>
        ) : (
          <Badge tone="warning">+{fmtPct(diffPct, 1)} (Di atas baseline)</Badge>
        );
      },
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Multi-Dimensional Selector Bar */}
      <section aria-label="Dimensi keberlanjutan dan jejak karbon">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi ESG &amp; Karbon</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk menganalisis jejak emisi Scope 2, beban karbon mesin, intensitas produk, atau simulasi dekarbonisasi:
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Faktor emisi grid: <strong className="text-ink">{fmtNumber(emissionFactor, 2)} kg CO₂e/kWh</strong>
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {DIMENSIONS.map((dim, idx) => {
            const Icon = dim.icon;
            const active = activeDim === dim.key;
            return (
              <button
                key={dim.key}
                type="button"
                onClick={() => selectDimension(dim.key)}
                aria-pressed={active}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  active
                    ? "border-brand-700 bg-brand-900 text-white shadow-sm"
                    : "border-border bg-surface-raised text-ink hover:border-brand-300 hover:bg-brand-50/40",
                )}
              >
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border transition-colors",
                    active
                      ? "border-white/15 bg-white/10 text-emerald-300"
                      : "border-brand-100 bg-brand-50 text-brand-800 group-hover:bg-brand-100",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-xs font-semibold tracking-tight">
                      {idx + 1}. {dim.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-[11px] leading-relaxed",
                      active ? "text-white/75" : "text-ink-muted",
                    )}
                  >
                    {dim.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================================================================ */}
      {/* DIMENSION 1: JEJAK KARBON & TREN CO2e                            */}
      {/* ================================================================ */}
      {activeDim === "footprint" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Tren Emisi GRK Scope 2 (kg CO₂e)"
                subtitle={`${rangeLabel} · dihitung dari konsumsi listrik × faktor emisi jaringan PLN`}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setChartMode("compare")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-medium transition-colors",
                          chartMode === "compare"
                            ? "bg-surface-raised text-ink shadow-2xs"
                            : "text-ink-muted hover:text-ink",
                        )}
                      >
                        vs Periode Lalu
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMode("shift")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-medium transition-colors",
                          chartMode === "shift"
                            ? "bg-surface-raised text-ink shadow-2xs"
                            : "text-ink-muted hover:text-ink",
                        )}
                      >
                        WBP vs LWBP
                      </button>
                    </div>
                    <ProvenanceBadge kind="estimated" />
                  </div>
                }
              />
              <CardBody>
                {chartMode === "compare" ? (
                  <TimeSeriesChart
                    data={trend}
                    granularity={granularity}
                    unit="kg"
                    ariaLabel="Grafik tren emisi karbon harian dibanding periode sebelumnya"
                    series={[
                      {
                        key: "emissionKg",
                        label: "Emisi periode ini (kg CO₂e)",
                        color: VIZ.green,
                        type: "area",
                      },
                      {
                        key: "prevEmissionKg",
                        label: "Periode sebelumnya",
                        color: VIZ.gray,
                        type: "line",
                        dashed: true,
                      },
                    ]}
                  />
                ) : (
                  <TimeSeriesChart
                    data={trend}
                    granularity={granularity}
                    unit="kg"
                    ariaLabel="Grafik emisi jam beban puncak WBP dan luar puncak LWBP"
                    series={[
                      {
                        key: "offPeakEmissionKg",
                        label: "Emisi jam LWBP (kg CO₂e)",
                        color: VIZ.mint,
                        type: "bar",
                        stackId: "em",
                      },
                      {
                        key: "peakEmissionKg",
                        label: "Emisi jam puncak WBP (kg CO₂e)",
                        color: VIZ.amber,
                        type: "bar",
                        stackId: "em",
                      },
                    ]}
                  />
                )}
              </CardBody>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  Emisi jam puncak (WBP):{" "}
                  <strong className="font-semibold text-ink">
                    {fmtNumber(peakEmissionKg, 0)} kg CO₂e
                  </strong>{" "}
                  ({fmtPct(totalEmissionKg > 0 ? (peakEmissionKg / totalEmissionKg) * 100 : 0, 1)} dari total)
                </span>
                <span>Standar pelaporan: GHG Protocol Scope 2 (Location-Based)</span>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader
                title="Distribusi Emisi per Mesin"
                subtitle={rangeLabel}
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <DonutChart
                  data={donutSlices}
                  unit="kg"
                  centerLabel="kg CO₂e"
                  centerValue={fmtNumber(totalEmissionKg, 0)}
                  ariaLabel="Proporsi emisi karbon per mesin"
                />
              </CardBody>
              <CardFooter className="flex items-center justify-between text-xs text-ink-muted">
                <span>Sumber emisi terbesar: {machineRows[0]?.name ?? "—"}</span>
                <button
                  type="button"
                  onClick={() => selectDimension("machines")}
                  className="font-semibold text-brand-800 hover:underline"
                >
                  Detail mesin →
                </button>
              </CardFooter>
            </Card>
          </div>

          {/* Environmental Equivalency Cards */}
          <Card>
            <CardHeader
              title="Ekuivalensi Dampak Lingkungan & Neraca Karbon"
              subtitle={`Konversi jejak karbon ${fmtNumber(totalEmissionKg, 0)} kg CO₂e (${fmtNumber(totalEmissionKg / 1000, 2)} tCO₂e) pada periode ${rangeLabel}`}
              actions={<Badge tone="info">Konversi EPA &amp; KLHK</Badge>}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                  <Trees className="size-4 text-emerald-700" aria-hidden />
                  Daya Serap Pohon Tropis
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-emerald-950 tabular-nums">
                  {fmtNumber(treesEquivalent, 0)} pohon
                </div>
                <p className="mt-1 text-xs text-emerald-900/80">
                  Jumlah pohon dewasa yang dibutuhkan selama 1 tahun untuk menyerap emisi periode ini.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <Fuel className="size-4 text-amber-700" aria-hidden />
                  Setara Solar Industri
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-amber-950 tabular-nums">
                  {fmtNumber(dieselLitersEquivalent, 0)} liter
                </div>
                <p className="mt-1 text-xs text-amber-900/80">
                  Setara pembakaran bahan bakar solar B35 pada genset/boiler konvensional (2,68 kg CO₂e/L).
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                  <Car className="size-4 text-blue-700" aria-hidden />
                  Jarak Tempuh Logistik
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-blue-950 tabular-nums">
                  {fmtNumber(vehicleKmEquivalent, 0)} km
                </div>
                <p className="mt-1 text-xs text-blue-900/80">
                  Setara emisi perjalanan kendaraan niaga ringan berbahan bakar fosil.
                </p>
              </div>

              <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-900">
                  <TrendingDown className="size-4 text-brand-700" aria-hidden />
                  Emisi Terhindarkan (M&amp;V)
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-brand-950 tabular-nums">
                  -{fmtNumber(avoidedEmissionKg, 0)} kg
                </div>
                <p className="mt-1 text-xs text-brand-900/80">
                  Total reduksi emisi kumulatif dari proyek konservasi energi yang telah berjalan.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: KONTRIBUSI EMISI MESIN                              */}
      {/* ================================================================ */}
      {activeDim === "machines" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Peringkat Beban Emisi Karbon per Mesin"
                subtitle={`${rangeLabel} · diurutkan dari kontributor CO₂e tertinggi`}
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <HorizontalBarChart
                  data={machineRows.map((m, i) => ({
                    name: m.name,
                    value: m.emissionKg,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                  }))}
                  unit="kg"
                  height={280}
                  ariaLabel="Grafik batang perbandingan emisi karbon per mesin"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Fokus Mitigasi Karbon"
                subtitle="2 mesin kontributor utama (Pareto)"
              />
              <CardBody className="space-y-4">
                {machineRows.slice(0, 2).map((m, idx) => (
                  <div
                    key={m.machineId}
                    className="rounded-xl border border-border bg-surface-muted/50 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={idx === 0 ? "danger" : "warning"}>
                        Kontributor #{idx + 1} · {fmtPct(m.sharePct, 1)}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-ink">
                        {fmtNumber(m.emissionKg, 0)} kg CO₂e
                      </span>
                    </div>
                    <div className="mt-2 font-semibold text-ink">{m.name}</div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {m.category === "compressor"
                        ? "Optimasi tekanan kerja 6,5 bar & perbaikan kebocoran pipa udara tekan berpotensi memangkas 12–18% emisi mesin ini."
                        : m.category === "oven"
                          ? "Penjadwalan batch pemanasan di luar jam beban puncak & pemeriksaan insulasi termal menurunkan konsumsi kWh per batch."
                          : "Pemasangan kontrol inverter (VSD) dan pemeliharaan berkala menurunkan beban idle."}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Tabel Inventarisasi Emisi Mesin (Scope 2)"
              subtitle={`Rincian konsumsi energi, jam operasi aktif, dan laju emisi untuk ${machineRows.length} mesin terpantau`}
            />
            <CardBody className="p-0">
              <DataTable
                rows={machineRows}
                columns={machineColumns}
                getRowId={(r) => r.machineId}
                caption="Tabel rincian emisi karbon per mesin"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: INTENSITAS KARBON PRODUKSI                          */}
      {/* ================================================================ */}
      {activeDim === "intensity" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title={`Tren Intensitas Karbon Harian (kg CO₂e / ${productUnit})`}
                subtitle="Semakin rendah nilai kurva terhadap garis baseline, semakin efisien proses produksi"
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <TimeSeriesChart
                  data={intensitySeries}
                  granularity="day"
                  unit="kg"
                  height={290}
                  ariaLabel="Grafik intensitas karbon harian per unit produksi"
                  referenceLines={
                    baselineCarbonIntensity !== null
                      ? [
                          {
                            y: Math.round(baselineCarbonIntensity * 1000) / 1000,
                            label: `Baseline (${fmtNumber(baselineCarbonIntensity, 2)} kg/unit)`,
                          },
                        ]
                      : []
                  }
                  series={[
                    {
                      key: "carbonIntensity",
                      label: `Intensitas karbon (kg CO₂e / ${productUnit})`,
                      color: VIZ.green,
                      type: "area",
                    },
                  ]}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Ringkasan Intensitas ESG"
                subtitle="Indikator efisiensi karbon"
              />
              <CardBody className="space-y-4">
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5">
                  <div className="text-xs text-ink-muted">Intensitas Saat Ini</div>
                  <div className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
                    {currentCarbonIntensity !== null
                      ? `${fmtNumber(currentCarbonIntensity, 2)} kg CO₂e`
                      : "—"}
                    <span className="ml-1 text-xs font-normal text-ink-muted">
                      / {productUnit}
                    </span>
                  </div>
                  {currentCarbonIntensity !== null && baselineCarbonIntensity !== null && (
                    <div className="mt-1.5 text-xs font-medium text-emerald-800">
                      Perubahan{" "}
                      {fmtPct(
                        ((currentCarbonIntensity - baselineCarbonIntensity) /
                          baselineCarbonIntensity) *
                          100,
                        1,
                      )}{" "}
                      vs baseline ({fmtNumber(baselineCarbonIntensity, 2)} kg/unit)
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5">
                  <div className="text-xs text-ink-muted">Intensitas per Tenaga Kerja</div>
                  <div className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                    {fmtNumber(totalEmissionKg / Math.max(1, employees), 1)} kg CO₂e
                    <span className="ml-1 text-xs font-normal text-ink-muted">
                      / karyawan ({employees} org)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3.5 text-xs leading-relaxed text-brand-950">
                  <div className="flex items-center gap-1.5 font-semibold text-brand-900">
                    <Flame className="size-4 text-brand-700" aria-hidden />
                    Manfaat bagi Rantai Pasok Ekspor
                  </div>
                  <p className="mt-1 text-brand-900/85">
                    Metrik intensitas karbon per unit produk dapat dilampirkan pada kuesioner rantai pasok pembeli korporasi dan persiapan mekanisme pajak karbon (CBAM).
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Log Harian Intensitas Karbon vs Volume Produksi"
              subtitle="Perbandingan output harian, energi listrik, dan emisi CO₂e per unit"
            />
            <CardBody className="p-0">
              <DataTable
                rows={intensitySeries.slice().reverse()}
                columns={intensityColumns}
                getRowId={(r) => r.date}
                caption="Tabel log harian intensitas karbon produksi"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: SIMULASI DEKARBONISASI & PLTS ATAP                  */}
      {/* ================================================================ */}
      {activeDim === "decarbonization" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader
              title="Parameter Skenario Dekarbonisasi"
              subtitle="Sesuaikan kapasitas PLTS Atap & target efisiensi operasional"
              icon={<SlidersHorizontal className="size-4" />}
            />
            <CardBody className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="sim-solar" className="text-ink">
                    Kapasitas PLTS Atap (On-Grid)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {solarKwp} kWp
                  </span>
                </div>
                <input
                  id="sim-solar"
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={solarKwp}
                  onChange={(e) => setSolarKwp(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
                  <span>0 kWp (Tanpa PLTS)</span>
                  <span>Rekomendasi IKM: 25 kWp</span>
                  <span>80 kWp</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="sim-eff" className="text-ink">
                    Efisiensi Operasional &amp; Mesin Tambahan
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {opsEffPct}%
                  </span>
                </div>
                <input
                  id="sim-eff"
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={opsEffPct}
                  onChange={(e) => setOpsEffPct(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
                  <span>0%</span>
                  <span>10% (Koreksi PF + Jadwal Oven)</span>
                  <span>25%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="sim-sun" className="text-ink">
                    Jam Matahari Efektif (Peak Sun Hours)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {fmtNumber(sunHours, 1)} jam/hari
                  </span>
                </div>
                <input
                  id="sim-sun"
                  type="range"
                  min={3.5}
                  max={5.0}
                  step={0.1}
                  value={sunHours}
                  onChange={(e) => setSunHours(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
                  <span>3,5 jam</span>
                  <span>Rata-rata Jawa Timur: 4,2 jam</span>
                  <span>5,0 jam</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader
              title="Proyeksi Dampak Dekarbonisasi Tahunan"
              subtitle={`Dibandingkan terhadap baseline tahunan fasilitas (${fmtNumber(annualBaselineCo2Kg / 1000, 1)} tCO₂e/tahun)`}
              actions={<ProvenanceBadge kind="estimated" />}
            />
            <CardBody className="space-y-5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="text-xs font-medium text-emerald-900">
                    Total Reduksi Emisi Tahunan
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold text-emerald-950 tabular-nums">
                    -{fmtNumber(totalAbatedCo2Kg / 1000, 1)} tCO₂e/thn
                  </div>
                  <div className="mt-1 text-xs font-medium text-emerald-800">
                    Penurunan {fmtPct(abatementPct, 1)} dari jejak karbon tahunan
                  </div>
                </div>

                <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                  <div className="text-xs font-medium text-brand-900">
                    Penghematan Tagihan Listrik / Tahun
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold text-brand-950 tabular-nums">
                    {fmtIdrCompact(annualSavedIdr)}
                  </div>
                  <div className="mt-1 text-xs text-brand-800">
                    {fmtIdr(annualSavedIdr)} · {fmtNumber(totalAbatedKwh, 0)} kWh/thn
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                  <div className="text-xs font-medium text-ink-muted">
                    Bangkitan Bersih PLTS Atap
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                    {fmtNumber(annualSolarKwh, 0)} kWh/thn
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    Kapasitas {solarKwp} kWp · PR 82%
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                  <div className="text-xs font-medium text-ink-muted">
                    Estimasi Capex &amp; Payback
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                    {paybackYears !== null ? `${fmtNumber(paybackYears, 1)} tahun` : "—"}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    Investasi ±{fmtIdrCompact(estimatedCapexIdr)}
                  </div>
                </div>
              </div>

              {/* Net Emissions Comparison Bar */}
              <div className="rounded-xl border border-border bg-surface-muted/30 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Jejak Karbon Bersih Pasca-Intervensi</span>
                  <span>
                    {fmtNumber(residualCo2Kg / 1000, 1)} tCO₂e / {fmtNumber(annualBaselineCo2Kg / 1000, 1)} tCO₂e
                  </span>
                </div>
                <div className="mt-2">
                  <Progress
                    value={Math.max(0, 100 - abatementPct)}
                    tone="brand"
                    label="Proporsi sisa emisi karbon pasca dekarbonisasi"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                    <Sparkles className="size-3.5" aria-hidden />
                    Dapat diajukan untuk Pembiayaan Hijau (Green Capex Loan)
                  </span>
                  <span>Sisa emisi: {fmtPct(Math.max(0, 100 - abatementPct), 1)}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
