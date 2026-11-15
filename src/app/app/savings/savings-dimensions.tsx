"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Calculator,
  CheckCircle2,
  FlaskConical,
  GitCompareArrows,
  PiggyBank,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  Wrench,
} from "lucide-react";
import type { Baseline, EnergyMeasure, SavingsPeriod } from "@/lib/domain/types";
import { cn, fmtDate, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { VIZ } from "@/components/charts/format";
import { DataTable, type Column } from "@/components/data/data-table";

export type SavingsDimensionKey = "verification" | "baseline" | "measures" | "simulator";

export interface DailyMvPoint {
  t: string;
  actual: number;
  modelled: number;
  units: number;
  phase: string;
  [key: string]: string | number | null;
}

const DIMENSIONS: {
  key: SavingsDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof PiggyBank;
}[] = [
  {
    key: "verification",
    label: "Verifikasi & Periode M&V",
    shortDesc: "Kurva aktual vs baseline & tabel periode verifikasi",
    icon: BadgeCheck,
  },
  {
    key: "baseline",
    label: "Model Baseline & Regresi",
    shortDesc: "Persamaan regresi linier harian, R² & CV(RMSE)",
    icon: GitCompareArrows,
  },
  {
    key: "measures",
    label: "Tindakan Efisiensi & ROI",
    shortDesc: "Daftar proyek konservasi energi, biaya & payback",
    icon: Wrench,
  },
  {
    key: "simulator",
    label: "Kalkulator Proyeksi M&V",
    shortDesc: "Simulasi volume produksi, target hemat & ROI",
    icon: Calculator,
  },
];

export function SavingsDimensionsView({
  initialDim,
  measure,
  planned,
  baseline,
  adequacy,
  periods,
  daily,
  verified,
  calculated,
  machines,
  tariffRateIdr,
  emissionFactor,
  productUnit,
}: {
  initialDim: SavingsDimensionKey;
  measure: EnergyMeasure | null;
  planned: EnergyMeasure[];
  baseline: Baseline | null;
  adequacy: { ok: boolean; note: string } | null;
  periods: SavingsPeriod[];
  daily: DailyMvPoint[];
  verified: { kwh: number; idr: number; emissionKg: number; pct: number; periods: number; lastPeriodEnd: string } | null;
  calculated: { kwh: number; idr: number; emissionKg: number; pct: number; periods: number; lastPeriodEnd: string } | null;
  machines: { id: string; name: string }[];
  tariffRateIdr: number;
  emissionFactor: number;
  productUnit: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlDim = searchParams.get("dim") as SavingsDimensionKey | null;

  const [dim, setDim] = useState<SavingsDimensionKey>(
    urlDim && DIMENSIONS.some((d) => d.key === urlDim) ? urlDim : initialDim,
  );
  const [phaseFilter, setPhaseFilter] = useState<"all" | "reporting">("reporting");

  // Simulator states
  const defaultUnitsPerDay = baseline ? Math.round(baseline.totalUnits / Math.max(1, baseline.days)) : 280;
  const [simUnitsPerDay, setSimUnitsPerDay] = useState<number>(defaultUnitsPerDay);
  const [simEffPct, setSimEffPct] = useState<number>(15);
  const [simInvestJt, setSimInvestJt] = useState<number>(120);

  const [prevUrlDim, setPrevUrlDim] = useState(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (urlDim && DIMENSIONS.some((d) => d.key === urlDim)) {
      setDim(urlDim);
    }
  }

  function selectDimension(next: SavingsDimensionKey) {
    setDim(next);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("dim", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const mById = new Map(machines.map((m) => [m.id, m.name]));

  const filteredDaily = phaseFilter === "reporting" ? daily.filter((d) => d.phase === "reporting") : daily;

  const totalActualReporting = periods.reduce((s, p) => s + p.actualKwh, 0);
  const verifiedKwh = verified?.kwh ?? 0;
  const unverifiedSavedKwh = Math.max(0, (calculated?.kwh ?? 0) - verifiedKwh);

  const periodColumns: Column<SavingsPeriod>[] = [
    {
      key: "id",
      header: "ID Periode",
      sortable: true,
      render: (p) => <span className="num font-semibold text-ink">{p.id}</span>,
    },
    {
      key: "periodStart",
      header: "Rentang Waktu",
      sortable: true,
      render: (p) => (
        <span className="text-[12.5px] text-ink">
          {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
        </span>
      ),
    },
    {
      key: "adjustedBaselineKwh",
      header: "Baseline Disesuaikan",
      align: "right",
      sortable: true,
      render: (p) => <span className="num">{fmtNumber(p.adjustedBaselineKwh)} kWh</span>,
    },
    {
      key: "actualKwh",
      header: "Konsumsi Aktual",
      align: "right",
      sortable: true,
      render: (p) => <span className="num font-medium">{fmtNumber(p.actualKwh)} kWh</span>,
    },
    {
      key: "savedKwh",
      header: "Penghematan (kWh)",
      align: "right",
      sortable: true,
      render: (p) => (
        <span className="num font-semibold text-brand-700">
          {fmtNumber(p.savedKwh)} kWh ({fmtPct(p.savedPct)})
        </span>
      ),
    },
    {
      key: "savedIdr",
      header: "Nilai Hemat (Rp)",
      align: "right",
      sortable: true,
      render: (p) => <span className="num font-semibold text-ink">{fmtIdr(p.savedIdr)}</span>,
    },
    {
      key: "avoidedEmissionKg",
      header: "Emisi Terhindarkan",
      align: "right",
      hideOnMobile: true,
      render: (p) => <span className="num text-muted">{fmtNumber(p.avoidedEmissionKg / 1000, 2)} t CO₂e</span>,
    },
    {
      key: "status",
      header: "Status & Verifikator",
      render: (p) => (
        <div className="flex flex-col items-start gap-0.5">
          <Badge tone={p.status === "verified" ? "success" : p.status === "calculated" ? "info" : "warning"}>
            {p.status === "verified" ? "Terverifikasi" : p.status === "calculated" ? "Dihitung" : "Sedang Berjalan"}
          </Badge>
          {p.verifier && <span className="text-[11px] text-muted">{p.verifier}</span>}
        </div>
      ),
    },
  ];

  // Simulator calculations
  const intercept = baseline?.interceptKwh ?? 185;
  const slope = baseline?.slopeKwhPerUnit ?? 1.42;
  const simDailyBaselineKwh = intercept + slope * simUnitsPerDay;
  const simMonthlyBaselineKwh = Math.round(simDailyBaselineKwh * 26); // 26 working days/month
  const simMonthlySavedKwh = Math.round((simMonthlyBaselineKwh * simEffPct) / 100);
  const simMonthlyActualKwh = simMonthlyBaselineKwh - simMonthlySavedKwh;
  const simMonthlySavedIdr = Math.round(simMonthlySavedKwh * tariffRateIdr * 1.1);
  const simAnnualSavedIdr = simMonthlySavedIdr * 12;
  const simAnnualCo2Ton = (simMonthlySavedKwh * 12 * emissionFactor) / 1000;
  const simPaybackMonths = simMonthlySavedIdr > 0 ? Math.round(((simInvestJt * 1_000_000) / simMonthlySavedIdr) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      {/* Interactive Dimension Selector Cards */}
      <div
        role="tablist"
        aria-label="Dimensi Penghematan M&V"
        className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
      >
        {DIMENSIONS.map((d) => {
          const Icon = d.icon;
          const active = dim === d.key;
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectDimension(d.key)}
              className={cn(
                "group relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-forest bg-forest text-white shadow-md ring-2 ring-brand-500/20"
                  : "border-line bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/30",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                  active
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-brand-50 text-brand-700 group-hover:bg-brand-100",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[13.5px] font-bold">{d.label}</span>
                  {active && (
                    <span className="size-2 shrink-0 rounded-full bg-brand-300 shadow-[0_0_8px_#86dcb2]" />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-2 block text-[11.5px] leading-snug",
                    active ? "text-white/75" : "text-muted",
                  )}
                >
                  {d.shortDesc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* DIMENSION 1: VERIFICATION & M&V PERIODS */}
      {dim === "verification" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Kurva Konsumsi Aktual vs Baseline Disesuaikan (IPMVP Opsi C)"
                subtitle="Selisih antara garis putus-putus (baseline model) dan area hijau (aktual) adalah penghematan energi"
                actions={
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5 text-[11.5px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPhaseFilter("reporting")}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition",
                          phaseFilter === "reporting" ? "bg-forest text-white shadow-xs" : "text-muted hover:text-ink",
                        )}
                      >
                        Fase Pelaporan
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhaseFilter("all")}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition",
                          phaseFilter === "all" ? "bg-forest text-white shadow-xs" : "text-muted hover:text-ink",
                        )}
                      >
                        Semua Fase
                      </button>
                    </div>
                    <ProvenanceBadge kind="verified" />
                  </div>
                }
              />
              <CardBody>
                {filteredDaily.length > 0 ? (
                  <TimeSeriesChart
                    ariaLabel="Grafik konsumsi aktual vs baseline disesuaikan"
                    data={filteredDaily}
                    unit="kwh"
                    granularity="day"
                    series={[
                      { key: "modelled", label: "Baseline Disesuaikan Produksi", color: VIZ.amber, type: "line", dashed: true },
                      { key: "actual", label: "Konsumsi Aktual", color: VIZ.green, type: "area" },
                    ]}
                  />
                ) : (
                  <EmptyState title="Belum ada data harian M&V" />
                )}
              </CardBody>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Tindakan: <strong className="text-ink">{measure?.name ?? "Belum ada"}</strong>
                </span>
                <span>
                  Implementasi: <strong className="num text-ink">{measure ? fmtDate(measure.implementedAt) : "–"}</strong>
                </span>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader
                title="Porsi Penghematan Pelaporan"
                subtitle="Perbandingan terhadap total baseline disesuaikan"
                actions={<ProvenanceBadge kind="verified" />}
              />
              <CardBody>
                <DonutChart
                  ariaLabel="Komposisi konsumsi aktual dan penghematan"
                  data={[
                    { name: "Konsumsi Aktual", value: Math.round(totalActualReporting), color: VIZ.navy },
                    { name: "Hemat Terverifikasi", value: Math.round(verifiedKwh), color: VIZ.green },
                    ...(unverifiedSavedKwh > 0
                      ? [{ name: "Hemat Dihitung (Proses)", value: Math.round(unverifiedSavedKwh), color: VIZ.blue }]
                      : []),
                  ]}
                  unit="kwh"
                  centerValue={verified ? `${fmtPct(verified.pct)}` : "–"}
                  centerLabel="hemat M&V"
                  height={185}
                />
              </CardBody>
              <CardFooter>
                {verified ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-700">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                    Diverifikasi s.d. {fmtDate(verified.lastPeriodEnd)}
                  </span>
                ) : (
                  <span>Menunggu penutupan periode 30 hari pertama</span>
                )}
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Rekapitulasi Periode Pelaporan M&V (Jendela 30 Hari)"
              subtitle="Setiap periode dievaluasi terhadap model regresi baseline dan ditinjau oleh verifikator"
              actions={<Badge tone="success">{periods.filter((p) => p.status === "verified").length} Periode Terverifikasi</Badge>}
            />
            <CardBody>
              <DataTable
                rows={periods}
                columns={periodColumns}
                getRowId={(p) => p.id}
                caption="Rekapitulasi periode pelaporan M&V"
                emptyTitle="Belum ada periode pelaporan M&V."
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* DIMENSION 2: BASELINE MODEL & REGRESSION */}
      {dim === "baseline" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Persamaan Regresi Baseline Harian"
                subtitle={baseline?.normalization ?? "Regresi linier kWh harian terhadap output produksi"}
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody className="space-y-5">
                {baseline ? (
                  <>
                    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
                      <p className="text-[11.5px] font-bold uppercase tracking-wider text-brand-700">
                        Persamaan Model Baseline (Ordinary Least Squares)
                      </p>
                      <p className="num mt-2 text-xl font-extrabold text-forest sm:text-2xl">
                        E<sub>baseline</sub> = {fmtNumber(baseline.interceptKwh, 1)} kWh + {fmtNumber(baseline.slopeKwhPerUnit, 2)} kWh × Unit Produksi
                      </p>
                      <p className="mt-2 text-[12.5px] text-muted">
                        Beban dasar tetap fasilitas sebesar <strong className="num text-ink">{fmtNumber(baseline.interceptKwh, 1)} kWh/hari</strong> ditambah konsumsi variabel{" "}
                        <strong className="num text-ink">{fmtNumber(baseline.slopeKwhPerUnit, 2)} kWh</strong> untuk setiap <strong className="text-ink">{productUnit}</strong> yang diproduksi.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <p className="text-[11.5px] text-muted">Durasi Baseline</p>
                        <p className="num mt-1 text-lg font-bold text-ink">{baseline.days} hari</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {fmtDate(baseline.periodStart)} – {fmtDate(baseline.periodEnd)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <p className="text-[11.5px] text-muted">Total Energi Baseline</p>
                        <p className="num mt-1 text-lg font-bold text-ink">{fmtNumber(baseline.totalKwh)} kWh</p>
                        <p className="mt-0.5 text-[11px] text-muted">Sebelum intervensi efisiensi</p>
                      </div>
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <p className="text-[11.5px] text-muted">Total Output Produksi</p>
                        <p className="num mt-1 text-lg font-bold text-ink">{fmtNumber(baseline.totalUnits)}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{productUnit}</p>
                      </div>
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <p className="text-[11.5px] text-muted">Intensitas Rata-Rata</p>
                        <p className="num mt-1 text-lg font-bold text-brand-700">
                          {fmtNumber(baseline.intensityKwhPerUnit, 2)} kWh
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">per {productUnit}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-ink">
                        Kecocokan Model Baseline vs Aktual pada Periode Baseline ({baseline.days} Hari)
                      </p>
                      <TimeSeriesChart
                        ariaLabel="Grafik kecocokan model baseline"
                        data={daily.filter((d) => d.phase === "baseline")}
                        unit="kwh"
                        granularity="day"
                        series={[
                          { key: "actual", label: "Konsumsi Historis Baseline", color: VIZ.navy, type: "bar" },
                          { key: "modelled", label: "Prediksi Regresi Linier", color: VIZ.amber, type: "line" },
                        ]}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyState title="Model baseline belum tersedia" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Uji Kelayakan Statistik IPMVP"
                subtitle="Kriteria kecukupan model regresi M&V"
                actions={
                  <Badge tone={adequacy?.ok ? "success" : "warning"}>
                    {adequacy?.ok ? "Memenuhi Syarat" : "Perlu Tinjauan"}
                  </Badge>
                }
              />
              <CardBody className="space-y-5">
                {baseline ? (
                  <>
                    <div>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink">Koefisien Determinasi (R²)</span>
                        <span className="num font-bold text-brand-700">{fmtNumber(baseline.r2, 2)}</span>
                      </div>
                      <Progress
                        value={baseline.r2 * 100}
                        className="mt-2"
                        label="Koefisien determinasi R2"
                        tone={baseline.r2 >= 0.75 ? "brand" : "warning"}
                      />
                      <p className="mt-1 text-[11.5px] text-muted">
                        Syarat IPMVP: <strong>R² ≥ 0,75</strong> (menjelaskan {fmtPct(baseline.r2 * 100)} variasi beban harian).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink">Galat CV(RMSE)</span>
                        <span className="num font-bold text-brand-700">{fmtPct(baseline.cvRmsePct)}</span>
                      </div>
                      <Progress
                        value={Math.max(0, 100 - baseline.cvRmsePct * 2)}
                        className="mt-2"
                        label="Akurasi CV RMSE"
                        tone={baseline.cvRmsePct <= 25 ? "brand" : "warning"}
                      />
                      <p className="mt-1 text-[11.5px] text-muted">
                        Syarat IPMVP: <strong>CV(RMSE) ≤ 25%</strong> (semakin rendah semakin presisi).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink">Sampel Hari Produksi</span>
                        <span className="num font-bold text-ink">{baseline.days} / 30 hari min.</span>
                      </div>
                      <Progress
                        value={Math.min(100, (baseline.days / 30) * 100)}
                        className="mt-2"
                        label="Kecukupan hari baseline"
                        tone={baseline.days >= 30 ? "brand" : "warning"}
                      />
                      <p className="mt-1 text-[11.5px] text-muted">
                        Syarat minimum: <strong>≥ 30 hari produksi</strong> sebelum tanggal implementasi.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-canvas p-3.5 text-[12px] leading-relaxed text-muted">
                      <p className="font-semibold text-ink">Catatan Metodologi:</p>
                      <p className="mt-1">{adequacy?.note}</p>
                    </div>
                  </>
                ) : (
                  <EmptyState title="Belum ada evaluasi statistik" />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* DIMENSION 3: EFFICIENCY MEASURES & ROI */}
      {dim === "measures" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Program Konservasi Energi (ECM) & Evaluasi Keekonomian"
                subtitle="Proyek efisiensi yang telah diimplementasikan maupun dalam rencana investasi"
                actions={<Badge tone="brand">{(measure ? 1 : 0) + planned.length} Program Terdaftar</Badge>}
              />
              <CardBody className="space-y-4">
                {measure && (
                  <div className="rounded-2xl border-2 border-brand-500/40 bg-brand-50/30 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="success">Telah Diimplementasikan</Badge>
                          <span className="font-mono text-xs text-muted">{measure.id}</span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-forest">{measure.name}</h3>
                        <p className="mt-1 text-[12.5px] text-muted">
                          Mesin sasaran: <strong className="text-ink">{measure.machineIds.map((id) => mById.get(id) ?? id).join(", ")}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted">Nilai Investasi</p>
                        <p className="num text-lg font-extrabold text-ink">{fmtIdr(measure.investmentIdr)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-brand-200/70 pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] text-muted">Metodologi Verifikasi</p>
                        <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{measure.methodology}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted">Penghematan Tahunan (Proyeksi)</p>
                        <p className="num mt-0.5 text-[13.5px] font-bold text-brand-700">
                          {verified ? fmtIdr((verified.idr / Math.max(1, verified.periods)) * 12) : "–"} / thn
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted">Estimasi Balik Modal (Payback)</p>
                        <p className="num mt-0.5 text-[13.5px] font-bold text-ink">
                          {verified && verified.idr > 0
                            ? `${fmtNumber(measure.investmentIdr / (verified.idr / Math.max(1, verified.periods)), 1)} bulan`
                            : "–"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {planned.map((pm) => {
                  const estAnnualSavings = Math.round(pm.investmentIdr * 0.42);
                  const paybackMonths = Math.round((pm.investmentIdr / (estAnnualSavings / 12)) * 10) / 10;
                  return (
                    <div key={pm.id} className="rounded-2xl border border-line bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge tone="info">Rencana Tahap Berikutnya</Badge>
                            <span className="font-mono text-xs text-muted">{pm.id}</span>
                          </div>
                          <h3 className="mt-2 text-base font-bold text-ink">{pm.name}</h3>
                          <p className="mt-1 text-[12.5px] text-muted">
                            Mesin sasaran: <strong className="text-ink">{pm.machineIds.map((id) => mById.get(id) ?? id).join(", ")}</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted">Estimasi CAPEX</p>
                          <p className="num text-lg font-bold text-ink">{fmtIdr(pm.investmentIdr)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 border-t border-line pt-3.5 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] text-muted">Pendekatan M&V</p>
                          <p className="mt-0.5 text-[12.5px] font-medium text-ink">{pm.methodology}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted">Potensi Hemat Tahunan</p>
                          <p className="num mt-0.5 text-[13px] font-semibold text-brand-700">{fmtIdr(estAnnualSavings)} / thn</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted">Target Payback Period</p>
                          <p className="num mt-0.5 text-[13px] font-semibold text-ink">~{fmtNumber(paybackMonths, 1)} bulan</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Perbandingan CAPEX vs Hemat Tahunan"
                subtitle="Analisis keekonomian proyek efisiensi"
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <HorizontalBarChart
                  ariaLabel="Perbandingan nilai investasi dan penghematan tahunan"
                  unit="idr"
                  data={[
                    ...(measure
                      ? [
                          {
                            name: "CAPEX Tahap 1 (Aktif)",
                            value: measure.investmentIdr,
                            color: VIZ.navy,
                          },
                          {
                            name: "Hemat/Thn Tahap 1",
                            value: verified ? Math.round((verified.idr / Math.max(1, verified.periods)) * 12) : 32_000_000,
                            color: VIZ.green,
                          },
                        ]
                      : []),
                    ...planned.flatMap((pm, idx) => [
                      {
                        name: `CAPEX Rencana ${idx + 2}`,
                        value: pm.investmentIdr,
                        color: VIZ.blue,
                      },
                      {
                        name: `Potensi Hemat/Thn ${idx + 2}`,
                        value: Math.round(pm.investmentIdr * 0.42),
                        color: VIZ.amber,
                      },
                    ]),
                  ]}
                />
              </CardBody>
              <CardFooter>
                Penghematan tahunan yang terverifikasi dapat dijadikan dasar kemampuan bayar cicilan kredit hijau.
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* DIMENSION 4: INTERACTIVE M&V SIMULATOR */}
      {dim === "simulator" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                icon={<SlidersHorizontal />}
                title="Simulator Proyeksi Penghematan M&V & Kelayakan Investasi"
                subtitle="Sesuaikan parameter produksi dan target penghematan untuk menghitung dampak finansial & masa balik modal"
                actions={<ProvenanceBadge kind="simulated" />}
              />
              <CardBody className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sim-units" className="text-[12.5px] font-semibold text-ink">
                        Output Produksi / Hari
                      </label>
                      <span className="num rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                        {fmtNumber(simUnitsPerDay)} unit
                      </span>
                    </div>
                    <input
                      id="sim-units"
                      type="range"
                      min={100}
                      max={600}
                      step={10}
                      value={simUnitsPerDay}
                      onChange={(e) => setSimUnitsPerDay(Number(e.target.value))}
                      className="mt-3 w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>100 unit</span>
                      <span>600 unit/hari</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sim-eff" className="text-[12.5px] font-semibold text-ink">
                        Target Efisiensi Energi
                      </label>
                      <span className="num rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                        {simEffPct}%
                      </span>
                    </div>
                    <input
                      id="sim-eff"
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={simEffPct}
                      onChange={(e) => setSimEffPct(Number(e.target.value))}
                      className="mt-3 w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>5%</span>
                      <span>35% hemat</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sim-invest" className="text-[12.5px] font-semibold text-ink">
                        Nilai Investasi Proyek
                      </label>
                      <span className="num rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                        Rp{simInvestJt} jt
                      </span>
                    </div>
                    <input
                      id="sim-invest"
                      type="range"
                      min={20}
                      max={500}
                      step={10}
                      value={simInvestJt}
                      onChange={(e) => setSimInvestJt(Number(e.target.value))}
                      className="mt-3 w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>Rp20 jt</span>
                      <span>Rp500 jt</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-[11.5px] text-muted">Baseline Disesuaikan / Bulan</p>
                    <p className="num mt-1.5 text-xl font-extrabold text-ink">{fmtNumber(simMonthlyBaselineKwh)} kWh</p>
                    <p className="mt-1 text-[11px] text-muted">Pada {fmtNumber(simUnitsPerDay * 26)} unit/bulan</p>
                  </div>
                  <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
                    <p className="text-[11.5px] font-medium text-brand-800">Energi Dihemat / Bulan</p>
                    <p className="num mt-1.5 text-xl font-extrabold text-brand-700">{fmtNumber(simMonthlySavedKwh)} kWh</p>
                    <p className="mt-1 text-[11px] text-brand-700">Konsumsi baru: {fmtNumber(simMonthlyActualKwh)} kWh</p>
                  </div>
                  <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
                    <p className="text-[11.5px] font-medium text-brand-800">Penghematan Biaya / Tahun</p>
                    <p className="num mt-1.5 text-xl font-extrabold text-forest">{fmtIdrCompact(simAnnualSavedIdr)}</p>
                    <p className="mt-1 text-[11px] text-brand-700">{fmtIdr(simMonthlySavedIdr)} / bulan</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-forest p-4 text-white">
                    <p className="text-[11.5px] text-white/75">Estimasi Balik Modal (ROI)</p>
                    <p className="num mt-1.5 text-xl font-extrabold text-brand-300">{fmtNumber(simPaybackMonths, 1)} bulan</p>
                    <p className="mt-1 text-[11px] text-white/70">
                      Setara {fmtNumber(simPaybackMonths / 12, 1)} tahun · -{fmtNumber(simAnnualCo2Ton, 1)} tCO₂e/thn
                    </p>
                  </div>
                </div>
              </CardBody>
              <CardFooter className="flex items-center gap-2">
                <FlaskConical className="size-4 text-info" aria-hidden />
                <span>Simulasi menggunakan koefisien regresi baseline usaha Anda (26 hari kerja aktif per bulan).</span>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader
                icon={<Sparkles />}
                title="Perbandingan Sebelum vs Sesudah"
                subtitle="Simulasi konsumsi bulanan (kWh)"
              />
              <CardBody className="space-y-4">
                <DonutChart
                  ariaLabel="Simulasi proporsi konsumsi dan penghematan"
                  data={[
                    { name: "Konsumsi Baru", value: simMonthlyActualKwh, color: VIZ.navy },
                    { name: "Penghematan Simulasi", value: simMonthlySavedKwh, color: VIZ.green },
                  ]}
                  unit="kwh"
                  centerValue={`-${simEffPct}%`}
                  centerLabel="target hemat"
                  height={180}
                />
                <div className="rounded-xl bg-canvas p-3.5 text-[12px] leading-relaxed text-muted">
                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                    <TrendingDown className="size-4 text-brand-600" aria-hidden /> Ringkasan Arus Kas Kredit Hijau
                  </p>
                  <p className="mt-1">
                    Dengan penghematan <strong className="text-ink">{fmtIdr(simMonthlySavedIdr)}/bulan</strong>, proyek senilai{" "}
                    <strong className="text-ink">Rp{simInvestJt} juta</strong> dapat menutup cicilan kredit dari penghematan tagihan listrik sendiri.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
