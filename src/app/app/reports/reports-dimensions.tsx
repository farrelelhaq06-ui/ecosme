"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  AuditLog,
  Baseline,
  Business,
  GreenScoreResult,
  SavingsPeriod,
  TariffSettings,
} from "@/lib/domain/types";
import { logReportDownload } from "@/app/actions/platform";
import {
  cn,
  fmtDate,
  fmtDateTime,
  fmtIdr,
  fmtIdrCompact,
  fmtNumber,
  fmtPct,
} from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data/data-table";

export type ReportsDimensionKey = "packages" | "preview" | "export" | "history";

export interface ExportMachineRow {
  machineId: string;
  name: string;
  kwh: number;
  costIdr: number;
  emissionKg: number;
  sharePct: number;
  avgPf: number | null;
  runHours: number;
}

export interface ExportDailyRow {
  date: string;
  kwh: number;
  units: number;
  intensity: number | null;
  emissionKg: number;
}

const DIMENSIONS: {
  key: ReportsDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof FileText;
}[] = [
  {
    key: "packages",
    label: "Paket Laporan Resmi",
    shortDesc: "4 bundel dokumen standar bank mitra, M&V, ESG & teknis",
    icon: FileText,
  },
  {
    key: "preview",
    label: "Pratinjau Eksekutif & M&V",
    shortDesc: "Tampilan dokumen siap cetak (PDF) dengan cap verifikasi",
    icon: Eye,
  },
  {
    key: "export",
    label: "Ekspor CSV & Dataset Mentah",
    shortDesc: "Unduh tabel CSV konsumsi harian, mesin, M&V & Green Score",
    icon: FileSpreadsheet,
  },
  {
    key: "history",
    label: "Riwayat Unduhan & Audit",
    shortDesc: "Jejak audit pembuatan laporan & akses mitra keuangan",
    icon: History,
  },
];

export function ReportsDimensionsView({
  initialDim,
  business,
  tariff,
  green,
  readinessPct,
  completenessPct,
  totalKwh30d,
  totalCostIdr30d,
  totalEmissionKg30d,
  measureName,
  baseline,
  periods,
  machineRows,
  dailyRows,
  auditLogs,
}: {
  initialDim: ReportsDimensionKey;
  business: Business;
  tariff: TariffSettings;
  green: GreenScoreResult;
  readinessPct: number;
  completenessPct: number;
  totalKwh30d: number;
  totalCostIdr30d: number;
  totalEmissionKg30d: number;
  measureName: string;
  baseline: Baseline | null;
  periods: SavingsPeriod[];
  machineRows: ExportMachineRow[];
  dailyRows: ExportDailyRow[];
  auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as ReportsDimensionKey | null;
  const [activeDim, setActiveDim] = useState<ReportsDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<ReportsDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "packages" ||
        urlDim === "preview" ||
        urlDim === "export" ||
        urlDim === "history")
    ) {
      setActiveDim(urlDim);
    }
  }

  const [previewDoc, setPreviewDoc] = useState<"dossier" | "mv" | "esg">("dossier");
  const [csvDataset, setCsvDataset] = useState<"daily" | "machines" | "mv" | "greenscore">(
    "daily",
  );
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function selectDimension(dim: ReportsDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "packages") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function triggerPrint(docTitle: string) {
    startTransition(async () => {
      await logReportDownload(docTitle);
    });
    setLastDownloaded(docTitle);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    startTransition(async () => {
      await logReportDownload(filename);
    });
    setLastDownloaded(filename);
  }

  function handleExportCsv(kind: "daily" | "machines" | "mv" | "greenscore") {
    if (kind === "daily") {
      downloadCsvFile(
        "ecosme_rekap_harian_30hari.csv",
        ["tanggal", "energi_kwh", "output_produksi_unit", "intensitas_kwh_per_unit", "emisi_co2_kg"],
        dailyRows.map((d) => [
          d.date,
          d.kwh,
          d.units,
          d.intensity ?? "",
          d.emissionKg,
        ]),
      );
    } else if (kind === "machines") {
      downloadCsvFile(
        "ecosme_profil_mesin_30hari.csv",
        ["id_mesin", "nama_mesin", "energi_kwh", "biaya_idr", "emisi_co2_kg", "porsi_pct", "pf_rata2", "jam_operasi"],
        machineRows.map((m) => [
          m.machineId,
          m.name,
          m.kwh,
          m.costIdr,
          m.emissionKg,
          m.sharePct.toFixed(1),
          m.avgPf ? m.avgPf.toFixed(2) : "",
          m.runHours,
        ]),
      );
    } else if (kind === "mv") {
      downloadCsvFile(
        "ecosme_periode_verifikasi_mv.csv",
        [
          "id_periode",
          "mulai",
          "selesai",
          "status",
          "baseline_terkoreksi_kwh",
          "aktual_kwh",
          "penghematan_kwh",
          "penghematan_idr",
          "penghematan_pct",
          "emisi_terhindarkan_kg",
          "verifikator",
        ],
        periods.map((p) => [
          p.id,
          p.periodStart.slice(0, 10),
          p.periodEnd.slice(0, 10),
          p.status,
          Math.round(p.adjustedBaselineKwh),
          Math.round(p.actualKwh),
          Math.round(p.savedKwh),
          Math.round(p.savedIdr),
          p.savedPct.toFixed(1),
          Math.round(p.avoidedEmissionKg),
          p.verifier ?? "-",
        ]),
      );
    } else {
      downloadCsvFile(
        "ecosme_rincian_green_score.csv",
        ["komponen", "label", "bobot_pct", "skor_0_100", "nilai_terukur"],
        green.components.map((c) => [c.key, c.label, c.weight, c.score, c.rawValue]),
      );
    }
  }

  const machineColumns: Column<ExportMachineRow>[] = [
    {
      key: "name",
      header: "Mesin",
      render: (r) => <span className="font-medium text-ink">{r.name}</span>,
    },
    {
      key: "kwh",
      header: "Energi (kWh)",
      align: "right",
      sortValue: (r) => r.kwh,
      render: (r) => `${fmtNumber(r.kwh, 0)} kWh`,
    },
    {
      key: "costIdr",
      header: "Estimasi Biaya",
      align: "right",
      sortValue: (r) => r.costIdr,
      render: (r) => fmtIdr(r.costIdr),
    },
    {
      key: "emissionKg",
      header: "Emisi CO₂e",
      align: "right",
      sortValue: (r) => r.emissionKg,
      render: (r) => `${fmtNumber(r.emissionKg, 0)} kg`,
    },
    {
      key: "sharePct",
      header: "Porsi",
      align: "right",
      sortValue: (r) => r.sharePct,
      render: (r) => fmtPct(r.sharePct, 1),
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    {
      key: "at",
      header: "Waktu (WIB)",
      sortValue: (l) => l.at,
      render: (l) => (
        <span className="font-mono text-xs text-ink-muted">{fmtDateTime(l.at)}</span>
      ),
    },
    {
      key: "actor",
      header: "Pelaku & Peran",
      render: (l) => (
        <div>
          <span className="font-medium text-ink">{l.actor}</span>{" "}
          <Badge tone="neutral">{l.role.toUpperCase()}</Badge>
        </div>
      ),
    },
    {
      key: "action",
      header: "Aktivitas",
      render: (l) => <span className="text-ink">{l.action}</span>,
    },
    {
      key: "target",
      header: "Objek / Dokumen",
      render: (l) => (
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">
          {l.target}
        </code>
      ),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Multi-Dimensional Selector Bar */}
      <section aria-label="Dimensi pusat laporan dan ekspor data">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi Laporan &amp; Ekspor</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk mengunduh bundel laporan resmi, melihat pratinjau dokumen cetak, mengekspor CSV mentah, atau meninjau log audit:
            </span>
          </div>
          {lastDownloaded && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Terakhir diproses: {lastDownloaded}
            </span>
          )}
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
      {/* DIMENSION 1: PAKET LAPORAN RESMI                                 */}
      {/* ================================================================ */}
      {activeDim === "packages" && (
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              id: "PAKET-BANK-01",
              previewKey: "dossier" as const,
              title: "Paket Kesiapan Pembiayaan Hijau (Bank-Ready Dossier)",
              badge: "Standar Bank Mitra",
              tone: "brand" as const,
              desc: "Bundel komprehensif berisi profil energi fasilitas, rincian 5 komponen EcoSME Green Score, ringkasan M&V terverifikasi, serta status checklist kesiapan dokumen.",
              contents: [
                `EcoSME Green Score: ${green.total}/100 (Grade ${green.grade})`,
                `Indeks Kesiapan Pembiayaan: ${readinessPct}%`,
                `Rekap konsumsi 30 hari: ${fmtNumber(totalKwh30d, 0)} kWh (${fmtIdrCompact(totalCostIdr30d)})`,
              ],
            },
            {
              id: "PAKET-MV-02",
              previewKey: "mv" as const,
              title: "Laporan Pengukuran & Verifikasi (M&V IPMVP Opsi C)",
              badge: "Terverifikasi M&V",
              tone: "success" as const,
              desc: "Dokumen teknis verifikasi penghematan energi berbasis regresi linier harian terhadap output produksi, lengkap dengan uji statistik R² dan CV(RMSE).",
              contents: [
                `Proyek ECM: ${measureName}`,
                baseline
                  ? `Model Baseline: R² ${fmtNumber(baseline.r2, 2)} · CV(RMSE) ${fmtPct(baseline.cvRmsePct, 1)}`
                  : "Model baseline sedang dihitung",
                `${periods.filter((p) => p.status === "verified").length} periode terverifikasi oleh pihak independen`,
              ],
            },
            {
              id: "PAKET-ESG-03",
              previewKey: "esg" as const,
              title: "Laporan Inventarisasi Emisi GRK Scope 2 & Intensitas Karbon",
              badge: "GHG Protocol Scope 2",
              tone: "info" as const,
              desc: "Laporan jejak karbon fasilitas manufaktur dan intensitas CO₂e per unit produk untuk pemenuhan kuesioner ESG pelanggan korporasi dan rantai pasok.",
              contents: [
                `Total emisi 30 hari: ${fmtNumber(totalEmissionKg30d, 0)} kg CO₂e (${fmtNumber(totalEmissionKg30d / 1000, 2)} tCO₂e)`,
                `Faktor emisi grid: ${fmtNumber(tariff.emissionFactorKgPerKwh, 2)} kg CO₂e/kWh`,
                `Distribusi beban karbon untuk ${machineRows.length} mesin produksi`,
              ],
            },
            {
              id: "PAKET-IOT-04",
              previewKey: "dossier" as const,
              title: "Lampiran Audit Kualitas Data Telemetri & Profil Beban",
              badge: `Kelengkapan ${fmtPct(completenessPct, 1)}`,
              tone: "neutral" as const,
              desc: "Bukti integritas pembacaan sensor per jam, rekap faktor daya (PF) tertimbang, serta distribusi konsumsi jam beban puncak (WBP) vs luar puncak (LWBP).",
              contents: [
                `Kelengkapan interval per jam: ${fmtPct(completenessPct, 1)}`,
                `Golongan tarif: ${tariff.tariffGroup} (Rp${fmtNumber(tariff.baseRateIdrPerKwh, 0)}/kWh)`,
                "Siap diekspor dalam format PDF maupun CSV",
              ],
            },
          ].map((pkg) => (
            <Card key={pkg.id} className="flex flex-col justify-between">
              <CardHeader
                title={pkg.title}
                subtitle={`Kode dokumen: ${pkg.id}`}
                actions={<Badge tone={pkg.tone}>{pkg.badge}</Badge>}
              />
              <CardBody className="space-y-3">
                <p className="text-xs leading-relaxed text-ink-muted">{pkg.desc}</p>
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Ringkasan Isi Dokumen
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs text-ink">
                    {pkg.contents.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 shrink-0 text-brand-700" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPreviewDoc(pkg.previewKey);
                    selectDimension("preview");
                  }}
                >
                  <Eye className="size-4" aria-hidden />
                  Buka Pratinjau
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPreviewDoc(pkg.previewKey);
                    triggerPrint(pkg.id);
                  }}
                >
                  <Printer className="size-4" aria-hidden />
                  Cetak / Simpan PDF
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: PRATINJAU EKSEKUTIF & M&V                           */}
      {/* ================================================================ */}
      {activeDim === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink">Pilih Dokumen Pratinjau:</span>
              {(
                [
                  { k: "dossier", l: "1. Dossier Pembiayaan Hijau" },
                  { k: "mv", l: "2. Sertifikat Verifikasi M&V" },
                  { k: "esg", l: "3. Laporan Emisi GRK Scope 2" },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setPreviewDoc(t.k)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    previewDoc === t.k
                      ? "bg-brand-900 text-white"
                      : "bg-surface-muted text-ink-muted hover:text-ink",
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => triggerPrint(`PREVIEW-${previewDoc.toUpperCase()}`)}
            >
              <Printer className="size-4" aria-hidden />
              Cetak Dokumen Ini (PDF)
            </Button>
          </div>

          {/* Printable Formal Sheet */}
          <Card className="border-2 border-brand-900/15 bg-white p-2 sm:p-4">
            <CardBody className="space-y-6">
              {/* Document Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-800">
                    <ShieldCheck className="size-4" aria-hidden />
                    DOKUMEN RESMI ECOSME ENERGY INTELLIGENCE
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold text-ink">
                    {previewDoc === "dossier"
                      ? "Dossier Kesiapan Pembiayaan Efisiensi Energi (Bank-Ready Package)"
                      : previewDoc === "mv"
                        ? "Laporan Pengukuran & Verifikasi Penghematan Energi (IPMVP Opsi C)"
                        : "Laporan Inventarisasi Gas Rumah Kaca (GRK) Scope 2 & Intensitas Produk"}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    Entitas Usaha: <strong className="text-ink">{business.name}</strong> ·{" "}
                    {business.sector} · {business.city} · Daya Kontrak {business.contractedPowerKva} kVA ({business.tariffGroup})
                  </p>
                </div>
                <div className="text-right text-xs text-ink-muted">
                  <div className="font-mono font-semibold text-ink">
                    ID: DOC-2026-{previewDoc.toUpperCase()}-001
                  </div>
                  <div>Kelengkapan Telemetri: {fmtPct(completenessPct, 1)}</div>
                  <div className="mt-1">
                    <ProvenanceBadge kind="verified" />
                  </div>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="text-[11px] text-ink-muted">EcoSME Green Score</div>
                  <div className="mt-0.5 font-display text-lg font-bold text-ink">
                    {green.total} / 100 (Grade {green.grade})
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="text-[11px] text-ink-muted">Konsumsi Listrik (30 Hari)</div>
                  <div className="mt-0.5 font-display text-lg font-bold text-ink">
                    {fmtNumber(totalKwh30d, 0)} kWh
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="text-[11px] text-ink-muted">Emisi GRK Scope 2</div>
                  <div className="mt-0.5 font-display text-lg font-bold text-ink">
                    {fmtNumber(totalEmissionKg30d / 1000, 2)} tCO₂e
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="text-[11px] text-ink-muted">Kesiapan Berkas Bank</div>
                  <div className="mt-0.5 font-display text-lg font-bold text-emerald-800">
                    {readinessPct}% Lengkap
                  </div>
                </div>
              </div>

              {/* Section 1: Green Score or M&V Table */}
              {previewDoc !== "esg" ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-ink">
                    Rekapitulasi Periode Pengukuran &amp; Verifikasi (M&amp;V) — {measureName}
                  </h4>
                  {baseline && (
                    <p className="text-xs text-ink-muted">
                      Persamaan Regresi Baseline Harian:{" "}
                      <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-ink">
                        kWh/hari = {fmtNumber(baseline.interceptKwh, 1)} +{" "}
                        {fmtNumber(baseline.slopeKwhPerUnit, 2)} × unit
                      </code>{" "}
                      (R² = {fmtNumber(baseline.r2, 2)}, CV(RMSE) = {fmtPct(baseline.cvRmsePct, 1)},{" "}
                      {baseline.days} hari baseline)
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-surface-muted text-ink-muted">
                        <tr>
                          <th className="px-3 py-2">Periode</th>
                          <th className="px-3 py-2 text-right">Baseline Terkoreksi</th>
                          <th className="px-3 py-2 text-right">Konsumsi Aktual</th>
                          <th className="px-3 py-2 text-right">Hemat Energi</th>
                          <th className="px-3 py-2 text-right">Nilai Penghematan</th>
                          <th className="px-3 py-2">Status &amp; Verifikator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {periods.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 font-medium text-ink">
                              {p.id} ({fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)})
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtNumber(p.adjustedBaselineKwh, 0)} kWh
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtNumber(p.actualKwh, 0)} kWh
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-800 tabular-nums">
                              {fmtNumber(p.savedKwh, 0)} kWh ({fmtPct(p.savedPct, 1)})
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-ink tabular-nums">
                              {fmtIdr(p.savedIdr)}
                            </td>
                            <td className="px-3 py-2">
                              {p.status === "verified" ? (
                                <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                                  <BadgeCheck className="size-3.5" aria-hidden />
                                  Terverifikasi ({p.verifier})
                                </span>
                              ) : (
                                <span className="text-ink-muted">Terhitung otomatis</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-ink">
                    Inventarisasi Emisi Karbon &amp; Energi per Mesin (30 Hari Terakhir)
                  </h4>
                  <DataTable
                    rows={machineRows}
                    columns={machineColumns}
                    getRowId={(r) => r.machineId}
                    caption="Tabel inventarisasi energi dan emisi per mesin pada pratinjau laporan"
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: EKSPOR CSV & DATASET MENTAH                         */}
      {/* ================================================================ */}
      {activeDim === "export" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: "daily" as const,
                title: "Rekap Harian Energi & Produksi",
                file: "ecosme_rekap_harian_30hari.csv",
                rowsCount: `${dailyRows.length} baris harian`,
                desc: "Tanggal, kWh harian, volume output produksi, intensitas kWh/unit, dan kg CO₂e.",
              },
              {
                key: "machines" as const,
                title: "Profil Beban & Emisi per Mesin",
                file: "ecosme_profil_mesin_30hari.csv",
                rowsCount: `${machineRows.length} mesin produksi`,
                desc: "Konsumsi kWh, estimasi biaya Rp, emisi CO₂e, porsi beban, faktor daya, dan jam aktif.",
              },
              {
                key: "mv" as const,
                title: "Tabel Periode Verifikasi M&V",
                file: "ecosme_periode_verifikasi_mv.csv",
                rowsCount: `${periods.length} periode M&V`,
                desc: "Baseline terkoreksi, kWh aktual, penghematan kWh & Rp, serta tanda tangan verifikator.",
              },
              {
                key: "greenscore" as const,
                title: "Rincian 5 Komponen Green Score",
                file: "ecosme_rincian_green_score.csv",
                rowsCount: "5 komponen indikator",
                desc: "Bobot metodologi, skor terhitung (0–100), dan nilai mentah setiap indikator.",
              },
            ].map((ds) => {
              const selected = csvDataset === ds.key;
              return (
                <Card
                  key={ds.key}
                  className={cn(
                    "flex flex-col justify-between transition-all",
                    selected && "ring-2 ring-brand-700",
                  )}
                >
                  <CardHeader
                    title={ds.title}
                    subtitle={ds.rowsCount}
                    actions={<Badge tone="neutral">CSV UTF-8</Badge>}
                  />
                  <CardBody>
                    <p className="text-xs leading-relaxed text-ink-muted">{ds.desc}</p>
                    <code className="mt-2 block truncate rounded bg-surface-muted px-2 py-1 font-mono text-[11px] text-ink">
                      {ds.file}
                    </code>
                  </CardBody>
                  <CardFooter className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCsvDataset(ds.key)}
                      className="text-xs font-semibold text-brand-800 hover:underline"
                    >
                      {selected ? "Sedang ditampilkan" : "Lihat sampel →"}
                    </button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleExportCsv(ds.key)}
                    >
                      <Download className="size-3.5" aria-hidden />
                      Unduh CSV
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader
              title="Pratinjau Struktur Tabel Dataset"
              subtitle="Data siap diolah lebih lanjut di Microsoft Excel, Google Sheets, atau perangkat audit analis bank"
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportCsv(csvDataset)}
                >
                  <Download className="size-4" aria-hidden />
                  Unduh Dataset Terpilih (.CSV)
                </Button>
              }
            />
            <CardBody className="p-0">
              <DataTable
                rows={machineRows}
                columns={machineColumns}
                getRowId={(r) => r.machineId}
                caption="Pratinjau tabel inventarisasi mesin untuk ekspor CSV"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: RIWAYAT UNDUHAN & AUDIT                             */}
      {/* ================================================================ */}
      {activeDim === "history" && (
        <Card>
          <CardHeader
            title="Jejak Audit Pembuatan Laporan & Akses Data"
            subtitle="Mencatat setiap aktivitas pengunduhan laporan, pencetakan dokumen, dan perubahan izin berbagi data"
            actions={<Badge tone="brand">{auditLogs.length} Catatan Audit</Badge>}
          />
          <CardBody className="p-0">
            <DataTable
              rows={auditLogs}
              columns={auditColumns}
              getRowId={(l) => l.id}
              caption="Tabel log audit pembuatan laporan dan akses data"
            />
          </CardBody>
          <CardFooter className="flex items-center gap-2 text-xs text-ink-muted">
            <Sparkles className="size-3.5 text-brand-700" aria-hidden />
            <span>
              Log audit ini menjamin transparansi tata kelola data antara pelaku IKM dan lembaga keuangan mitra.
            </span>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
