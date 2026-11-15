"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpenCheck,
  Gauge,
  History,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { GreenScoreComponent, GreenScoreResult } from "@/lib/domain/types";
import type { GreenScoreWeights } from "@/lib/config";
import { GREEN_SCORE_DISCLAIMER } from "@/lib/config";
import { gradeLabel } from "@/lib/calc/green-score";
import { clamp, cn, fmtDate, fmtNumber, fmtPct } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { MACHINE_COLORS, VIZ } from "@/components/charts/format";
import { ScoreRing } from "@/components/data/score-ring";
import { DataTable, type Column } from "@/components/data/data-table";

export type GreenScoreDimensionKey =
  | "breakdown"
  | "history"
  | "simulator"
  | "methodology";

export interface GreenScoreHistoryRow {
  t: string;
  label: string;
  score: number;
  grade: GreenScoreResult["grade"];
  [key: string]: string | number | null;
}

const DIMENSIONS: {
  key: GreenScoreDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Gauge;
}[] = [
  {
    key: "breakdown",
    label: "Rincian 5 Komponen Skor",
    shortDesc: "Kontribusi poin tertimbang, nilai mentah & rekomendasi",
    icon: Gauge,
  },
  {
    key: "history",
    label: "Tren Historis & Benchmark",
    shortDesc: "Perkembangan skor 4 periode & posisi benchmark sektor",
    icon: History,
  },
  {
    key: "simulator",
    label: "Simulator Peningkatan Skor",
    shortDesc: "Simulasi interaktif 5 parameter menuju Grade A (≥ 80)",
    icon: SlidersHorizontal,
  },
  {
    key: "methodology",
    label: "Metodologi & Aturan Bobot",
    shortDesc: "Formula transparan, ambang batas 0–100 & tata kelola",
    icon: BookOpenCheck,
  },
];

interface RuleDocRow {
  key: GreenScoreComponent["key"];
  name: string;
  weight: number;
  minThreshold: string;
  maxThreshold: string;
  formula: string;
  provenance: string;
}

export function GreenScoreDimensionsView({
  initialDim,
  result,
  weights,
  history,
  initialInputs,
  sectorName,
}: {
  initialDim: GreenScoreDimensionKey;
  result: GreenScoreResult;
  weights: GreenScoreWeights;
  history: GreenScoreHistoryRow[];
  initialInputs: {
    intensityImprovementPct: number;
    verifiedSavingsPct: number;
    completenessPct: number;
    peakSharePct: number;
    avgPowerFactor: number;
  };
  sectorName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as GreenScoreDimensionKey | null;
  const [activeDim, setActiveDim] = useState<GreenScoreDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<GreenScoreDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "breakdown" ||
        urlDim === "history" ||
        urlDim === "simulator" ||
        urlDim === "methodology")
    ) {
      setActiveDim(urlDim);
    }
  }

  // Interactive Simulator Sliders
  const [simIntensityPct, setSimIntensityPct] = useState<number>(
    Math.round(initialInputs.intensityImprovementPct * 10) / 10,
  );
  const [simVerifiedPct, setSimVerifiedPct] = useState<number>(
    Math.round(initialInputs.verifiedSavingsPct * 10) / 10,
  );
  const [simCompletenessPct, setSimCompletenessPct] = useState<number>(
    Math.round(initialInputs.completenessPct * 10) / 10,
  );
  const [simPeakSharePct, setSimPeakSharePct] = useState<number>(
    Math.round(initialInputs.peakSharePct * 10) / 10,
  );
  const [simPf, setSimPf] = useState<number>(
    Math.round(initialInputs.avgPowerFactor * 100) / 100,
  );

  function selectDimension(dim: GreenScoreDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "breakdown") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function resetSimulator() {
    setSimIntensityPct(Math.round(initialInputs.intensityImprovementPct * 10) / 10);
    setSimVerifiedPct(Math.round(initialInputs.verifiedSavingsPct * 10) / 10);
    setSimCompletenessPct(Math.round(initialInputs.completenessPct * 10) / 10);
    setSimPeakSharePct(Math.round(initialInputs.peakSharePct * 10) / 10);
    setSimPf(Math.round(initialInputs.avgPowerFactor * 100) / 100);
  }

  // Compute simulated scores using the exact linear rules
  const simScores = {
    intensity: Math.round(clamp((simIntensityPct / 25) * 100)),
    verified_savings: Math.round(clamp((simVerifiedPct / 20) * 100)),
    data_quality: Math.round(clamp(((simCompletenessPct / 100 - 0.85) / 0.15) * 100)),
    peak_load: Math.round(clamp(((0.4 - simPeakSharePct / 100) / 0.3) * 100)),
    power_factor: Math.round(clamp(((simPf - 0.75) / 0.2) * 100)),
  };

  const weightSum =
    weights.intensity +
      weights.verified_savings +
      weights.data_quality +
      weights.peak_load +
      weights.power_factor || 1;

  const simTotal = Math.round(
    (simScores.intensity * weights.intensity +
      simScores.verified_savings * weights.verified_savings +
      simScores.data_quality * weights.data_quality +
      simScores.peak_load * weights.peak_load +
      simScores.power_factor * weights.power_factor) /
      weightSum,
  );
  const simGrade: GreenScoreResult["grade"] =
    simTotal >= 80 ? "A" : simTotal >= 65 ? "B" : simTotal >= 50 ? "C" : "D";
  const simDelta = simTotal - result.total;

  // Weighted contribution slices for DonutChart
  const contributionSlices = result.components.map((c, i) => ({
    name: c.label,
    value: Math.round((c.score * c.weight) / weightSum),
    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
  }));

  // Actionable tips per component
  const componentTips: Record<GreenScoreComponent["key"], string> = {
    intensity:
      "Turunkan kWh/unit produksi hingga ≥ 25% di bawah baseline dengan mengoptimalkan tekanan kompresor dan meminimalkan idle mesin CNC.",
    verified_savings:
      "Pertahankan penghematan M&V ≥ 20% dan ajukan verifikasi pada setiap periode tutup buku 30 hari.",
    data_quality:
      "Jaga ketersediaan paket telemetri gateway ≥ 99% dengan sinyal Wi-Fi/LTE yang stabil pada seluruh panel mesin.",
    peak_load:
      "Geser jadwal pemanasan awal Oven Pengecatan ke luar jam beban puncak WBP (17.00–22.00) agar porsi WBP turun mendekati 10%.",
    power_factor:
      "Aktifkan modul kapasitor bank otomatis pada panel induktif (Kompresor & Las) agar faktor daya rata-rata ≥ 0,95.",
  };

  const ruleRows: RuleDocRow[] = [
    {
      key: "intensity",
      name: "Perbaikan Intensitas Energi",
      weight: weights.intensity,
      minThreshold: "0% (Sama/lebih boros dari baseline)",
      maxThreshold: "≥ 25% penurunan kWh/unit vs baseline",
      formula: "clamp((Δ_intensitas_% / 25) × 100, 0, 100)",
      provenance: "Terukur + Log Produksi",
    },
    {
      key: "verified_savings",
      name: "Penghematan Terverifikasi (M&V)",
      weight: weights.verified_savings,
      minThreshold: "0% atau belum ada periode terverifikasi",
      maxThreshold: "≥ 20% penghematan M&V terverifikasi",
      formula: "clamp((hemat_terverifikasi_% / 20) × 100, 0, 100)",
      provenance: "Terverifikasi (IPMVP Opsi C)",
    },
    {
      key: "data_quality",
      name: "Kelengkapan & Kualitas Data",
      weight: weights.data_quality,
      minThreshold: "≤ 85% interval per jam lengkap",
      maxThreshold: "100% interval per jam lengkap & valid",
      formula: "clamp(((kelengkapan - 0,85) / 0,15) × 100, 0, 100)",
      provenance: "Audit Telemetri IoT",
    },
    {
      key: "peak_load",
      name: "Manajemen Beban Puncak (WBP)",
      weight: weights.peak_load,
      minThreshold: "≥ 40% konsumsi kWh di jam WBP",
      maxThreshold: "≤ 10% konsumsi kWh di jam WBP",
      formula: "clamp(((0,40 - porsi_WBP) / 0,30) × 100, 0, 100)",
      provenance: "Terukur per Jam (WIB)",
    },
    {
      key: "power_factor",
      name: "Faktor Daya (cos φ)",
      weight: weights.power_factor,
      minThreshold: "PF rata-rata tertimbang ≤ 0,75",
      maxThreshold: "PF rata-rata tertimbang ≥ 0,95",
      formula: "clamp(((PF - 0,75) / 0,20) × 100, 0, 100)",
      provenance: "Terukur Sensor Daya",
    },
  ];

  const ruleColumns: Column<RuleDocRow>[] = [
    {
      key: "name",
      header: "Komponen Indikator",
      render: (r) => <span className="font-semibold text-ink">{r.name}</span>,
    },
    {
      key: "weight",
      header: "Bobot",
      align: "right",
      sortValue: (r) => r.weight,
      render: (r) => <Badge tone="brand">{r.weight}%</Badge>,
    },
    {
      key: "min",
      header: "Batas Skor 0",
      render: (r) => <span className="text-xs text-ink-muted">{r.minThreshold}</span>,
    },
    {
      key: "max",
      header: "Batas Skor 100",
      render: (r) => <span className="text-xs font-medium text-emerald-800">{r.maxThreshold}</span>,
    },
    {
      key: "formula",
      header: "Fungsi Normalisasi",
      render: (r) => (
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {r.formula}
        </code>
      ),
    },
    {
      key: "prov",
      header: "Sumber Data",
      render: (r) => <span className="text-xs text-ink-muted">{r.provenance}</span>,
    },
  ];

  const historyColumns: Column<GreenScoreHistoryRow>[] = [
    {
      key: "label",
      header: "Jendela Evaluasi (30 Hari)",
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.label}</div>
          <div className="text-xs text-ink-muted">Tutup buku: {fmtDate(r.t)}</div>
        </div>
      ),
    },
    {
      key: "score",
      header: "Total Skor",
      align: "right",
      sortValue: (r) => r.score,
      render: (r) => (
        <span className="font-display text-base font-semibold text-ink tabular-nums">
          {r.score} / 100
        </span>
      ),
    },
    {
      key: "grade",
      header: "Peringkat",
      render: (r) => (
        <Badge
          tone={
            r.grade === "A"
              ? "success"
              : r.grade === "B"
                ? "brand"
                : r.grade === "C"
                  ? "warning"
                  : "danger"
          }
        >
          Grade {r.grade} · {gradeLabel(r.grade)}
        </Badge>
      ),
    },
    {
      key: "readiness",
      header: "Kesiapan Green Financing",
      render: (r) =>
        r.score >= 80 ? (
          <span className="text-xs font-medium text-emerald-800">
            Sangat Layak (Tier 1 Bunga Preferensial)
          </span>
        ) : r.score >= 65 ? (
          <span className="text-xs font-medium text-brand-800">
            Layak (Memenuhi Ambang Minimum Bank Mitra ≥ 65)
          </span>
        ) : (
          <span className="text-xs text-amber-800">
            Perlu Perbaikan Operasional
          </span>
        ),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Multi-Dimensional Selector Bar */}
      <section aria-label="Dimensi analisis EcoSME Green Score">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi Green Score</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk membedah komponen skor, riwayat &amp; benchmark, simulasi peningkatan, atau metodologi bobot:
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Periode aktif: <strong className="text-ink">{result.periodLabel}</strong>
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
      {/* DIMENSION 1: RINCIAN 5 KOMPONEN SKOR                             */}
      {/* ================================================================ */}
      {activeDim === "breakdown" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader
              title="Bedah 5 Komponen EcoSME Green Score"
              subtitle="Setiap komponen dinilai pada skala 0–100 dan dikalikan bobot masing-masing"
              actions={<ProvenanceBadge kind="estimated" />}
            />
            <CardBody className="divide-y divide-border-subtle">
              {result.components.map((c) => {
                const weightedPts = Math.round((c.score * c.weight) / weightSum);
                const maxPts = Math.round((100 * c.weight) / weightSum);
                return (
                  <div key={c.key} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-ink">{c.label}</h4>
                          <Badge tone="neutral">Bobot {c.weight}%</Badge>
                          <Badge
                            tone={
                              c.score >= 80
                                ? "success"
                                : c.score >= 60
                                  ? "brand"
                                  : "warning"
                            }
                          >
                            {c.rawValue}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">{c.explanation}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-semibold text-ink tabular-nums">
                          {c.score}
                          <span className="text-xs font-normal text-ink-muted"> / 100</span>
                        </div>
                        <div className="text-[11px] font-medium text-brand-800">
                          Kontribusi: +{weightedPts} dari {maxPts} poin
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <Progress
                        value={c.score}
                        tone={
                          c.score >= 75
                            ? "brand"
                            : c.score >= 50
                              ? "warning"
                              : "danger"
                        }
                        label={c.label}
                      />
                    </div>

                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-muted/60 px-3 py-2 text-xs text-ink-muted">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-700" aria-hidden />
                      <span>
                        <strong className="font-medium text-ink">Cara naikkan poin:</strong>{" "}
                        {componentTips[c.key]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <div className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader
                title="Ringkasan Skor Saat Ini"
                subtitle={result.periodLabel}
                actions={<Badge tone="brand">Grade {result.grade}</Badge>}
              />
              <CardBody className="flex flex-col items-center text-center">
                <ScoreRing value={result.total} grade={result.grade} size={148} />
                <div className="mt-3 font-display text-base font-semibold text-ink">
                  Peringkat {result.grade} — {gradeLabel(result.grade)}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {result.total >= 80
                    ? "Fasilitas Anda berada di kuartil terbaik dan memenuhi syarat insentif hijau penuh."
                    : `Butuh +${80 - result.total} poin lagi untuk mencapai Grade A (Sangat Baik, ≥ 80).`}
                </p>
                <div className="mt-4 w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => selectDimension("simulator")}
                  >
                    <SlidersHorizontal className="size-4" aria-hidden />
                    Simulasikan Cara Naik ke Grade A
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Komposisi Poin Tertimbang"
                subtitle={`Total ${result.total} poin dari 100 poin maksimum`}
              />
              <CardBody>
                <DonutChart
                  data={contributionSlices}
                  unit="score"
                  centerLabel="Total Skor"
                  centerValue={`${result.total}`}
                  height={220}
                  ariaLabel="Proporsi kontribusi poin dari 5 komponen Green Score"
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: TREN HISTORIS & BENCHMARK                           */}
      {/* ================================================================ */}
      {activeDim === "history" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader
                title="Perkembangan Green Score (4 Periode 30-Hari)"
                subtitle="Evaluasi bergulir setiap jendela 30 hari dari baseline hingga periode saat ini"
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <TimeSeriesChart
                  data={history}
                  granularity="day"
                  unit="score"
                  height={270}
                  ariaLabel="Grafik riwayat perkembangan Green Score"
                  referenceLines={[{ y: 80, label: "Ambang Grade A (80)" }]}
                  series={[
                    {
                      key: "score",
                      label: "EcoSME Green Score (poin)",
                      color: VIZ.green,
                      type: "area",
                    },
                  ]}
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Benchmark Sektor IKM"
                subtitle={`Perbandingan terhadap sektor ${sectorName}`}
                actions={<Badge tone="info">Referensi Industri</Badge>}
              />
              <CardBody>
                <HorizontalBarChart
                  data={[
                    {
                      name: "Target Grade A (Tier 1)",
                      value: 80,
                      color: VIZ.mint,
                    },
                    {
                      name: "Skor Anda Saat Ini",
                      value: result.total,
                      color: VIZ.green,
                    },
                    {
                      name: "Kuartil Atas Sektor (Top 25%)",
                      value: 74,
                      color: VIZ.blue,
                    },
                    {
                      name: "Rata-rata IKM Sektor",
                      value: 58,
                      color: VIZ.gray,
                    },
                  ]}
                  unit="score"
                  height={230}
                  ariaLabel="Perbandingan Green Score terhadap benchmark sektor"
                />
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  Skor fasilitas Anda (<strong>{result.total} poin</strong>) berada{" "}
                  <strong className="text-emerald-800">
                    +{result.total - 58} poin di atas rata-rata IKM sejenis
                  </strong>{" "}
                  dan melampaui ambang kelayakan minimum pembiayaan hijau mitra bank (65 poin).
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Riwayat Evaluasi Jendela 30 Hari"
              subtitle="Rekam jejak skor untuk lampiran pengajuan pembiayaan hijau"
            />
            <CardBody className="p-0">
              <DataTable
                rows={history.slice().reverse()}
                columns={historyColumns}
                getRowId={(r) => r.t}
                caption="Tabel riwayat perkembangan Green Score per 30 hari"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: SIMULATOR PENINGKATAN SKOR                          */}
      {/* ================================================================ */}
      {activeDim === "simulator" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              title="Simulator Interaktif 5 Komponen Green Score"
              subtitle="Geser parameter operasional atau klik skenario cepat untuk melihat proyeksi skor baru"
              actions={
                <Button type="button" variant="ghost" size="sm" onClick={resetSimulator}>
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset
                </Button>
              }
            />
            <CardBody className="space-y-5">
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <span className="text-xs font-semibold text-brand-950">Skenario Cepat:</span>
                <button
                  type="button"
                  onClick={() => setSimPf(0.94)}
                  className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-900 shadow-2xs hover:bg-brand-100"
                >
                  + Kapasitor Bank (PF → 0,94)
                </button>
                <button
                  type="button"
                  onClick={() => setSimPeakSharePct(15)}
                  className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-900 shadow-2xs hover:bg-brand-100"
                >
                  + Geser Jadwal Oven (WBP → 15%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimIntensityPct(18);
                    setSimVerifiedPct(16);
                    setSimCompletenessPct(99);
                    setSimPeakSharePct(14);
                    setSimPf(0.94);
                  }}
                  className="rounded-lg bg-brand-800 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-brand-700"
                >
                  ✨ Paket Optimasi Penuh (Grade A)
                </button>
              </div>

              {/* 5 Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label htmlFor="gs-int" className="text-ink">
                      1. Perbaikan Intensitas Energi vs Baseline (Bobot {weights.intensity}%)
                    </label>
                    <span className="font-mono font-semibold text-brand-800">
                      {fmtPct(simIntensityPct, 1)} → Skor {simScores.intensity}/100
                    </span>
                  </div>
                  <input
                    id="gs-int"
                    type="range"
                    min={0}
                    max={25}
                    step={0.5}
                    value={simIntensityPct}
                    onChange={(e) => setSimIntensityPct(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label htmlFor="gs-ver" className="text-ink">
                      2. Penghematan M&amp;V Terverifikasi (Bobot {weights.verified_savings}%)
                    </label>
                    <span className="font-mono font-semibold text-brand-800">
                      {fmtPct(simVerifiedPct, 1)} → Skor {simScores.verified_savings}/100
                    </span>
                  </div>
                  <input
                    id="gs-ver"
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={simVerifiedPct}
                    onChange={(e) => setSimVerifiedPct(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label htmlFor="gs-dq" className="text-ink">
                      3. Kelengkapan Data Telemetri IoT (Bobot {weights.data_quality}%)
                    </label>
                    <span className="font-mono font-semibold text-brand-800">
                      {fmtPct(simCompletenessPct, 1)} → Skor {simScores.data_quality}/100
                    </span>
                  </div>
                  <input
                    id="gs-dq"
                    type="range"
                    min={85}
                    max={100}
                    step={0.5}
                    value={simCompletenessPct}
                    onChange={(e) => setSimCompletenessPct(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label htmlFor="gs-wbp" className="text-ink">
                      4. Porsi Konsumsi Jam Puncak WBP (Bobot {weights.peak_load}% · makin kecil makin baik)
                    </label>
                    <span className="font-mono font-semibold text-brand-800">
                      {fmtPct(simPeakSharePct, 1)} → Skor {simScores.peak_load}/100
                    </span>
                  </div>
                  <input
                    id="gs-wbp"
                    type="range"
                    min={10}
                    max={40}
                    step={0.5}
                    value={simPeakSharePct}
                    onChange={(e) => setSimPeakSharePct(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label htmlFor="gs-pf" className="text-ink">
                      5. Faktor Daya Rata-rata Tertimbang (Bobot {weights.power_factor}%)
                    </label>
                    <span className="font-mono font-semibold text-brand-800">
                      PF {fmtNumber(simPf, 2)} → Skor {simScores.power_factor}/100
                    </span>
                  </div>
                  <input
                    id="gs-pf"
                    type="range"
                    min={0.75}
                    max={0.98}
                    step={0.01}
                    value={simPf}
                    onChange={(e) => setSimPf(Number(e.target.value))}
                    className="mt-1.5 w-full accent-brand-700"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title="Hasil Simulasi Green Score"
              subtitle="Perbandingan langsung terhadap skor aktual"
              actions={
                <Badge tone={simDelta > 0 ? "success" : simDelta < 0 ? "warning" : "neutral"}>
                  {simDelta >= 0 ? `+${simDelta}` : simDelta} poin vs saat ini
                </Badge>
              }
            />
            <CardBody className="space-y-5">
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-muted/40 p-5 text-center">
                <ScoreRing value={simTotal} grade={simGrade} size={144} />
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-display text-lg font-semibold text-ink">
                    Proyeksi: {simTotal}/100 (Grade {simGrade})
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Skor aktual saat ini: <strong>{result.total}/100 (Grade {result.grade})</strong>
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {result.components.map((c) => {
                  const newScore = simScores[c.key];
                  const diff = newScore - c.score;
                  return (
                    <div
                      key={c.key}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2"
                    >
                      <span className="font-medium text-ink">{c.label}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-ink-muted">{c.score}</span>
                        <span>→</span>
                        <span className="font-semibold text-ink">{newScore}</span>
                        {diff !== 0 && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                              diff > 0
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800",
                            )}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: METODOLOGI & ATURAN BOBOT                           */}
      {/* ================================================================ */}
      {activeDim === "methodology" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Spesifikasi Teknis & Formula Normalisasi Komponen"
              subtitle="Seluruh perhitungan dilakukan secara deterministik dan dapat diaudit oleh mitra lembaga keuangan"
              actions={<Badge tone="brand">Rule-Based v1.4</Badge>}
            />
            <CardBody className="p-0">
              <DataTable
                rows={ruleRows}
                columns={ruleColumns}
                getRowId={(r) => r.key}
                caption="Tabel metodologi dan formula komponen EcoSME Green Score"
              />
            </CardBody>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                grade: "A",
                range: "80 – 100 Poin",
                title: "Sangat Baik (Leader)",
                desc: "Efisiensi tinggi, M&V terverifikasi, dan faktor daya prima. Memenuhi syarat Tier 1 Green Financing.",
                tone: "border-emerald-300 bg-emerald-50/50 text-emerald-950",
              },
              {
                grade: "B",
                range: "65 – 79 Poin",
                title: "Baik (Bankable)",
                desc: "Kinerja operasional terkendali dan memenuhi ambang minimum pengajuan pembiayaan efisiensi energi.",
                tone: "border-brand-300 bg-brand-50/50 text-brand-950",
              },
              {
                grade: "C",
                range: "50 – 64 Poin",
                title: "Cukup (Developing)",
                desc: "Monitoring berjalan namun masih ada pemborosan WBP atau faktor daya yang perlu diperbaiki.",
                tone: "border-amber-300 bg-amber-50/50 text-amber-950",
              },
              {
                grade: "D",
                range: "< 50 Poin",
                title: "Perlu Perbaikan",
                desc: "Data belum lengkap, baseline belum terbentuk, atau intensitas energi masih di atas baseline.",
                tone: "border-red-200 bg-red-50/50 text-red-950",
              },
            ].map((g) => (
              <div key={g.grade} className={cn("rounded-xl border p-4", g.tone)}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-bold">Grade {g.grade}</span>
                  <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs font-semibold">
                    {g.range}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold">{g.title}</div>
                <p className="mt-1 text-xs leading-relaxed opacity-85">{g.desc}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardBody className="flex items-start gap-3 text-xs leading-relaxed text-ink-muted">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
              <div>
                <strong className="font-semibold text-ink">Pernyataan Tata Kelola &amp; Penafian:</strong>{" "}
                {GREEN_SCORE_DISCLAIMER}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
