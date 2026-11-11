"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  Info,
  Layers,
  RotateCcw,
  Router,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  Wrench,
  Zap,
} from "lucide-react";
import { acknowledgeAlerts, reopenAlert } from "@/app/actions/platform";
import type { AlertSeverity, AlertType } from "@/lib/domain/types";
import type { AlertWithAck } from "@/lib/services/ikm";
import { cn, fmtDateTime, fmtNumber, fmtRelative } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { VIZ } from "@/components/charts/format";

export type AlertsDimensionKey = "active" | "category" | "rules";

const DIMENSIONS: {
  key: AlertsDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Bell;
}[] = [
  {
    key: "active",
    label: "Tindak Lanjut Peringatan",
    shortDesc: "Inspeksi akar masalah, rekomendasi & status penanganan",
    icon: Siren,
  },
  {
    key: "category",
    label: "Dimensi Kategori Anomali",
    shortDesc: "Distribusi peringatan per jenis gangguan & mesin",
    icon: Layers,
  },
  {
    key: "rules",
    label: "Aturan & Ambang Batas",
    shortDesc: "Parameter deteksi otomatis & kepatuhan operasional",
    icon: SlidersHorizontal,
  },
];

const SEVERITY_META: Record<
  AlertSeverity,
  { label: string; tone: "danger" | "warning" | "info"; dot: string; bg: string }
> = {
  critical: { label: "Kritis", tone: "danger", dot: "bg-danger", bg: "border-danger/35 bg-danger-50/35" },
  warning: { label: "Peringatan", tone: "warning", dot: "bg-warning", bg: "border-warning/35 bg-warning-50/35" },
  info: { label: "Info", tone: "info", dot: "bg-info", bg: "border-info/30 bg-info-50/30" },
};

const TYPE_META: Record<
  AlertType,
  { label: string; desc: string; sop: string[]; threshold: string; color: string }
> = {
  overload: {
    label: "Beban Lebih (Overload)",
    desc: "Daya aktif mesin melampaui batas aman terhadap kapasitas pengenal (rated kW).",
    threshold: "> 92% dari daya pengenal (rated kW)",
    color: VIZ.red,
    sop: [
      "Periksa kondisi bantalan mekanis, tekanan kerja, dan beban umpan material.",
      "Hindari menyalakan beban besar secara bersamaan pada awal shift.",
      "Evaluasi pembagian beban antar unit mesin sejenis.",
    ],
  },
  low_power_factor: {
    label: "Faktor Daya Rendah (cos φ)",
    desc: "Faktor daya rata-rata di bawah ambang PLN yang memicu kenaikan arus dan risiko denda kVARh.",
    threshold: "cos φ rata-rata < 0,85",
    color: VIZ.amber,
    sop: [
      "Periksa modul kapasitor bank pada panel distribusi utama atau lokal mesin.",
      "Pastikan kontaktor kapasitor otomatis (APFC) berfungsi normal.",
      "Pasang kompensasi reaktif lokal pada mesin las atau motor induksi besar.",
    ],
  },
  off_hours: {
    label: "Operasi di Luar Jam Kerja",
    desc: "Mesin produksi tetap mengonsumsi daya signifikan pada jam malam/istirahat tanpa jadwal kerja.",
    threshold: "Daya > 30% rated kW pada pukul 23.00–05.00 WIB",
    color: VIZ.violet,
    sop: [
      "Terapkan checklist pemutusan sakelar utama mesin pada akhir shift sore.",
      "Periksa kebocoran katup udara tekan yang membuat kompresor menyala sendiri malam hari.",
      "Konfirmasi apakah terdapat jadwal lembur yang belum tercatat di sistem.",
    ],
  },
  device_offline: {
    label: "Konektivitas Sensor IoT",
    desc: "Perangkat meter tidak mengirim telemetri atau mengalami penurunan kualitas sinyal.",
    threshold: "Status Offline atau sinyal < -85 dBm",
    color: VIZ.navy,
    sop: [
      "Periksa MCB catu daya power meter dan lampu indikator komunikasi pada panel.",
      "Cek jangkauan gateway Wi-Fi/LoRa di area produksi.",
      "Tambahkan antena eksternal jika panel tertutup boks logam tebal.",
    ],
  },
  voltage_deviation: {
    label: "Deviasi Tegangan",
    desc: "Tegangan suplai menyimpang melampaui batas toleransi dari tegangan nominal 380 V.",
    threshold: "Di luar 380 V ± 10% (< 342 V atau > 418 V)",
    color: VIZ.blue,
    sop: [
      "Periksa keseimbangan beban antar fase (R, S, T) pada panel distribusi utama.",
      "Kencangkan terminal kabel daya yang berpotensi kendor atau panas.",
      "Koordinasikan dengan teknisi listrik / PLN bila terjadi drop tegangan fasilitas.",
    ],
  },
  data_gap: {
    label: "Celah Data (Data Gap)",
    desc: "Terdapat interval jam berturut-turut yang kosong sehingga dikecualikan dari kalkulasi M&V.",
    threshold: "≥ 4 jam berturut-turut tanpa data",
    color: VIZ.gray,
    sop: [
      "Pastikan buffer penyimpanan lokal pada perangkat IoT aktif.",
      "Jaga kelengkapan data ≥ 95% agar syarat verifikasi penghematan M&V terpenuhi.",
    ],
  },
};

export function AlertsDimensionsView({
  initialDim,
  focusId,
  alerts,
  machines,
}: {
  initialDim: AlertsDimensionKey;
  focusId?: string;
  alerts: AlertWithAck[];
  machines: { id: string; name: string; location: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlDim = searchParams.get("dim") as AlertsDimensionKey | null;

  const [dim, setDim] = useState<AlertsDimensionKey>(
    urlDim && DIMENSIONS.some((d) => d.key === urlDim) ? urlDim : initialDim,
  );
  const [statusFilter, setStatusFilter] = useState<"open" | "acked" | "all">("open");
  const [sevFilter, setSevFilter] = useState<AlertSeverity | "all">("all");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [selectedId, setSelectedId] = useState<string>(
    focusId ?? alerts.find((a) => !a.acknowledged)?.id ?? alerts[0]?.id ?? "",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (urlDim && DIMENSIONS.some((d) => d.key === urlDim)) {
      setDim(urlDim);
    }
  }, [urlDim]);

  useEffect(() => {
    if (focusId && alerts.some((a) => a.id === focusId)) {
      const target = alerts.find((a) => a.id === focusId)!;
      if (target.acknowledged) setStatusFilter("all");
      setSelectedId(focusId);
    }
  }, [focusId, alerts]);

  function selectDimension(next: AlertsDimensionKey) {
    setDim(next);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("dim", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const mById = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter === "open" && a.acknowledged) return false;
      if (statusFilter === "acked" && !a.acknowledged) return false;
      if (sevFilter !== "all" && a.severity !== sevFilter) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      return true;
    });
  }, [alerts, statusFilter, sevFilter, typeFilter]);

  const activeAlert =
    filteredAlerts.find((a) => a.id === selectedId) ??
    filteredAlerts[0] ??
    alerts.find((a) => a.id === selectedId) ??
    null;

  const openAlerts = alerts.filter((a) => !a.acknowledged);

  function handleAcknowledge(ids: string[]) {
    startTransition(async () => {
      await acknowledgeAlerts(ids);
    });
  }

  function handleReopen(id: string) {
    startTransition(async () => {
      await reopenAlert(id);
    });
  }

  // Category aggregation
  const categoryStats = (Object.keys(TYPE_META) as AlertType[]).map((type) => {
    const matching = alerts.filter((a) => a.type === type);
    const openCount = matching.filter((a) => !a.acknowledged).length;
    const totalOccurrences = matching.reduce((s, a) => s + a.occurrences, 0);
    return {
      type,
      ...TYPE_META[type],
      totalAlerts: matching.length,
      openCount,
      totalOccurrences,
    };
  });

  return (
    <div className="space-y-5">
      {/* Interactive Dimension Selector Bar */}
      <div
        role="tablist"
        aria-label="Dimensi Peringatan"
        className="grid gap-2.5 sm:grid-cols-3"
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
                    ? "bg-white/15 text-brand-300"
                    : "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-bold">{d.label}</span>
                  {active && (
                    <span className="rounded-full bg-brand-400/25 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-200">
                      Aktif
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-1 block text-[12px]",
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

      {/* ================================================================== */}
      {/* DIMENSION 1: INTERACTIVE ALERT TRIAGE & INSPECTOR                  */}
      {/* ================================================================== */}
      {dim === "active" && (
        <div className="space-y-4 animate-fade-in">
          {/* Interactive Filter Toolbar */}
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Tabs */}
                <div className="inline-flex rounded-xl border border-line bg-canvas p-1 text-[12.5px] font-semibold">
                  {[
                    { k: "open" as const, l: `Belum Ditangani (${openAlerts.length})` },
                    { k: "acked" as const, l: `Selesai (${alerts.length - openAlerts.length})` },
                    { k: "all" as const, l: `Semua (${alerts.length})` },
                  ].map((st) => (
                    <button
                      key={st.k}
                      type="button"
                      onClick={() => setStatusFilter(st.k)}
                      className={cn(
                        "rounded-lg px-3 py-1 transition",
                        statusFilter === st.k ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                      )}
                    >
                      {st.l}
                    </button>
                  ))}
                </div>

                {/* Severity Pills */}
                <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-white p-1 text-[12px]">
                  {(
                    [
                      { k: "all", l: "Semua Level" },
                      { k: "critical", l: "Kritis" },
                      { k: "warning", l: "Peringatan" },
                      { k: "info", l: "Info" },
                    ] as const
                  ).map((sv) => (
                    <button
                      key={sv.k}
                      type="button"
                      onClick={() => setSevFilter(sv.k)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 font-semibold transition",
                        sevFilter === sv.k ? "bg-forest text-white" : "text-muted hover:bg-canvas hover:text-ink",
                      )}
                    >
                      {sv.l}
                    </button>
                  ))}
                </div>

                {typeFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setTypeFilter("all")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[12px] font-semibold text-brand-700 ring-1 ring-brand-200"
                  >
                    Kategori: {TYPE_META[typeFilter].label} ✕
                  </button>
                )}
              </div>

              {openAlerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAcknowledge(openAlerts.map((a) => a.id))}
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Tandai Semua Ditangani ({openAlerts.length})
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Split View: Alert List + Root-Cause Inspector */}
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<CheckCircle2 />}
                  title="Tidak ada peringatan pada filter ini"
                  description="Seluruh anomali telah ditangani atau tidak ditemukan pada kategori yang dipilih."
                  action={
                    statusFilter !== "all" || sevFilter !== "all" || typeFilter !== "all" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setSevFilter("all");
                          setTypeFilter("all");
                        }}
                      >
                        Tampilkan Semua Peringatan
                      </Button>
                    ) : undefined
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-12">
              {/* Left List */}
              <div className="space-y-2.5 lg:col-span-5">
                {filteredAlerts.map((a) => {
                  const sev = SEVERITY_META[a.severity];
                  const isSelected = activeAlert?.id === a.id;
                  const machine = a.machineId ? mById.get(a.machineId) : null;

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-forest bg-brand-50/45 shadow-md ring-2 ring-brand-500/25"
                          : "border-line bg-surface hover:border-brand-300",
                        a.acknowledged && "opacity-75",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2.5 shrink-0 rounded-full", sev.dot)} />
                          <Badge tone={sev.tone}>{sev.label}</Badge>
                          <Badge tone="neutral">{TYPE_META[a.type].label}</Badge>
                        </div>
                        {a.acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700">
                            <Check className="size-3.5" /> Selesai
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-muted">{fmtRelative(a.detectedAt)}</span>
                        )}
                      </div>

                      <h3 className="mt-2.5 text-[14px] font-bold text-ink">{a.title}</h3>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{a.description}</p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5 text-[11.5px] text-muted">
                        <span>{machine ? `${machine.name} (${machine.location})` : "Seluruh Fasilitas"}</span>
                        <span className="num font-semibold text-ink">{a.occurrences}× kejadian</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Inspector */}
              {activeAlert && (
                <Card className="sticky top-20 border-brand-300 lg:col-span-7 animate-fade-in">
                  <CardHeader
                    icon={<ShieldAlert />}
                    title={activeAlert.title}
                    subtitle={`ID Peringatan: ${activeAlert.id} · Terdeteksi ${fmtDateTime(activeAlert.detectedAt)} WIB`}
                    actions={
                      <Badge tone={SEVERITY_META[activeAlert.severity].tone}>
                        Prioritas {SEVERITY_META[activeAlert.severity].label}
                      </Badge>
                    }
                  />
                  <CardBody className="space-y-5">
                    <div className="rounded-xl border border-line bg-canvas p-4">
                      <p className="text-[12px] font-bold uppercase tracking-wider text-muted">
                        Rincian Anomali Terdeteksi
                      </p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{activeAlert.description}</p>
                      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
                        <div>
                          <p className="text-[11px] text-muted">Kategori Aturan</p>
                          <p className="mt-0.5 text-[13px] font-bold text-ink">
                            {TYPE_META[activeAlert.type].label}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted">Titik Ukur / Mesin</p>
                          <p className="mt-0.5 text-[13px] font-bold text-ink">
                            {activeAlert.machineId
                              ? (mById.get(activeAlert.machineId)?.name ?? activeAlert.machineId)
                              : "Level Fasilitas"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted">Frekuensi Kejadian</p>
                          <p className="num mt-0.5 text-[13px] font-bold text-ink">
                            {activeAlert.occurrences} interval
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommended SOP Steps */}
                    <div>
                      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                        <Wrench className="size-4 text-brand-600" aria-hidden />
                        Langkah Tindak Lanjut & Mitigasi yang Disarankan
                      </h3>
                      <ol className="mt-3 space-y-2">
                        {TYPE_META[activeAlert.type].sop.map((step, idx) => (
                          <li
                            key={step}
                            className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-[13px]"
                          >
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[11.5px] font-bold text-brand-700">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed text-ink">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardBody>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-3 bg-canvas/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {activeAlert.acknowledged ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleReopen(activeAlert.id)}
                        >
                          <RotateCcw className="size-4" aria-hidden />
                          Buka Kembali Peringatan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleAcknowledge([activeAlert.id])}
                        >
                          <Check className="size-4" aria-hidden />
                          Tandai Sudah Ditangani
                        </Button>
                      )}
                      {activeAlert.machineId && (
                        <Link
                          href="/app/machines?dim=overview"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-canvas"
                        >
                          Inspeksi Mesin <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </div>
                    <span className="text-[12px] text-muted">
                      Ambang deteksi: {TYPE_META[activeAlert.type].threshold}
                    </span>
                  </CardFooter>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 2: ANOMALY CATEGORY BREAKDOWN                            */}
      {/* ================================================================== */}
      {dim === "category" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader
              icon={<Layers />}
              title="Distribusi Peringatan Berdasarkan Jenis Anomali"
              subtitle="Klik salah satu kartu kategori di bawah untuk memfilter daftar peringatan secara langsung"
            />
            <CardBody className="space-y-5">
              <HorizontalBarChart
                ariaLabel="Grafik jumlah peringatan per kategori"
                unit="count"
                data={categoryStats.map((c) => ({
                  name: c.label,
                  value: c.totalOccurrences,
                  color: c.color,
                  note: `${c.totalAlerts} peringatan (${c.openCount} aktif)`,
                }))}
              />

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {categoryStats.map((c) => (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => {
                      setTypeFilter(c.type);
                      setStatusFilter("all");
                      selectDimension("active");
                    }}
                    className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-400 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold text-ink group-hover:text-brand-700">{c.label}</span>
                        <Badge tone={c.openCount > 0 ? "warning" : "success"}>
                          {c.openCount} aktif / {c.totalAlerts} total
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{c.desc}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
                      <span className="num font-semibold text-ink">{c.totalOccurrences}× interval terdeteksi</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                        Buka filter <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 3: DETECTION RULES & THRESHOLDS                          */}
      {/* ================================================================== */}
      {dim === "rules" && (
        <Card className="animate-fade-in">
          <CardHeader
            icon={<SlidersHorizontal />}
            title="Aturan Deteksi Otomatis & Ambang Batas Operasional"
            subtitle="Mesin aturan (Rule Engine) EcoSME mengevaluasi setiap pembacaan interval 1-jam secara transparan"
          />
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryStats.map((rule) => (
                <div key={rule.type} className="rounded-2xl border border-line bg-canvas/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[14px] font-bold text-ink">{rule.label}</h3>
                      <p className="mt-0.5 font-mono text-[12px] font-semibold text-brand-700">
                        Parameter: {rule.threshold}
                      </p>
                    </div>
                    <Badge tone={rule.openCount === 0 ? "success" : "warning"}>
                      {rule.openCount === 0 ? "Patuh" : `${rule.openCount} temuan`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{rule.desc}</p>
                  <div className="mt-3 border-t border-line pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Prosedur Standar:</p>
                    <p className="mt-0.5 text-[12px] text-ink">{rule.sop[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
