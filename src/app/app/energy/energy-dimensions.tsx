"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CircleDollarSign,
  Clock,
  Gauge,
  Layers,
  Sparkles,
  Sun,
  Sunset,
  Table2,
  Zap,
} from "lucide-react";
import type { Provenance } from "@/lib/domain/types";
import { TARIFF_NOTE } from "@/lib/config";
import { cn, fmtDateTime, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/feedback";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { MACHINE_COLORS, VIZ, type ChartUnit } from "@/components/charts/format";
import { DataTable, type Column } from "@/components/data/data-table";

export type EnergyDimensionKey = "consumption" | "tariff" | "quality" | "intervals";

export interface EnergyTrendPoint {
  t: string;
  kwh: number;
  prevKwh: number | null;
  costIdr: number;
  peakCostIdr: number;
  offPeakCostIdr: number;
  peakKwh: number;
  offPeakKwh: number;
  kw: number;
  pf: number | null;
  voltage: number | null;
  current: number | null;
  frequency: number | null;
  [machineId: string]: string | number | null;
}

export interface HourlyProfilePoint {
  hourLabel: string;
  hour: number;
  avgKwh: number;
  avgKw: number;
  avgPf: number | null;
  zone: "wbp" | "work" | "idle";
}

export interface IntervalRow {
  id: string;
  timestamp: string;
  machineId: string;
  machineName: string;
  deviceId: string;
  kwh: number;
  kw: number | null;
  voltage: number | null;
  current: number | null;
  pf: number | null;
  frequency: number | null;
  costIdr: number;
  zone: "WBP" | "LWBP";
  quality: "ok" | "out_of_range" | "interpolated";
}

export interface MachineQualitySummary {
  machineId: string;
  name: string;
  ratedKw: number;
  kwh: number;
  costIdr: number;
  sharePct: number;
  avgPf: number | null;
  minPf: number | null;
  avgVoltage: number | null;
  maxKw: number;
  peakLoadPct: number;
  outOfRangeCount: number;
}

const DIMENSIONS: {
  key: EnergyDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Zap;
}[] = [
  {
    key: "consumption",
    label: "Tren & Profil 24 Jam",
    shortDesc: "Kurva kWh, komposisi mesin & beban per jam",
    icon: Zap,
  },
  {
    key: "tariff",
    label: "Biaya & Tarif WBP/LWBP",
    shortDesc: "Distribusi biaya & simulasi geser beban puncak",
    icon: CircleDollarSign,
  },
  {
    key: "quality",
    label: "Kualitas Daya (PF, V, A)",
    shortDesc: "Faktor daya cos φ, tegangan, arus & frekuensi",
    icon: Gauge,
  },
  {
    key: "intervals",
    label: "Log Interval Sensor",
    shortDesc: "Tabel pembacaan per jam & audit kualitas",
    icon: Table2,
  },
];

export function EnergyDimensionsView({
  initialDim,
  rangeLabel,
  granularity,
  provenance,
  totals,
  tariff,
  machines,
  trend,
  hourlyProfile,
  machineSummaries,
  intervalRows,
}: {
  initialDim: EnergyDimensionKey;
  rangeLabel: string;
  granularity: "hour" | "day";
  provenance: Provenance;
  totals: {
    kwh: number;
    costIdr: number;
    peakKwh: number;
    offPeakKwh: number;
    peakCostIdr: number;
    offPeakCostIdr: number;
    peakShare: number;
    avgPowerFactor: number | null;
    maxDemandKw: number;
    hasPrev: boolean;
  };
  tariff: {
    tariffGroup: string;
    baseRateIdrPerKwh: number;
    peakMultiplier: number;
    peakStartHour: number;
    peakEndHour: number;
  };
  machines: { id: string; name: string }[];
  trend: EnergyTrendPoint[];
  hourlyProfile: HourlyProfilePoint[];
  machineSummaries: MachineQualitySummary[];
  intervalRows: IntervalRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlDim = searchParams.get("dim") as EnergyDimensionKey | null;

  const [dim, setDim] = useState<EnergyDimensionKey>(
    urlDim && DIMENSIONS.some((d) => d.key === urlDim) ? urlDim : initialDim,
  );
  const [chartMode, setChartMode] = useState<"compare" | "stacked">("compare");
  const [elecParam, setElecParam] = useState<"pf" | "voltage" | "current" | "kw" | "frequency">("pf");
  const [shiftPct, setShiftPct] = useState<number>(35);

  const [prevUrlDim, setPrevUrlDim] = useState(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (urlDim && DIMENSIONS.some((d) => d.key === urlDim)) {
      setDim(urlDim);
    }
  }

  function selectDimension(next: EnergyDimensionKey) {
    setDim(next);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("dim", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  // Peak shifting simulation calculations
  const shiftedKwh = (totals.peakKwh * shiftPct) / 100;
  const rateDiff = tariff.baseRateIdrPerKwh * (tariff.peakMultiplier - 1);
  const periodSavingsIdr = Math.round(shiftedKwh * rateDiff);

  // Electrical parameter chart config
  const paramMeta: Record<
    typeof elecParam,
    { label: string; unit: ChartUnit; color: string; ref?: { y: number; label: string; color: string }; domain?: [number | "auto", number | "auto"] }
  > = {
    pf: {
      label: "Faktor Daya (cos φ)",
      unit: "pf",
      color: VIZ.blue,
      ref: { y: 0.85, label: "Batas minimum PLN (0,85)", color: VIZ.amber },
      domain: [0.65, 1],
    },
    voltage: {
      label: "Tegangan Rata-Rata (V)",
      unit: "v",
      color: VIZ.violet,
      ref: { y: 380, label: "Nominal 380 V", color: VIZ.green },
      domain: [340, 420],
    },
    current: {
      label: "Arus Beban (A)",
      unit: "a",
      color: VIZ.amber,
    },
    kw: {
      label: "Daya Aktif Rata-Rata (kW)",
      unit: "kw",
      color: VIZ.green,
    },
    frequency: {
      label: "Frekuensi Jaringan (Hz)",
      unit: "hz",
      color: VIZ.navy,
      ref: { y: 50, label: "Nominal 50 Hz", color: VIZ.green },
      domain: [49, 51],
    },
  };

  const columns: Column<IntervalRow>[] = [
    {
      key: "timestamp",
      header: "Waktu (WIB)",
      sortable: true,
      render: (r) => <span className="num font-medium text-ink">{fmtDateTime(r.timestamp)}</span>,
    },
    {
      key: "machineName",
      header: "Mesin & Sensor",
      sortable: true,
      render: (r) => (
        <div>
          <span className="block font-medium text-ink">{r.machineName}</span>
          <span className="text-[11.5px] text-muted">{r.deviceId}</span>
        </div>
      ),
    },
    {
      key: "zone",
      header: "Zona Tarif",
      sortable: true,
      render: (r) => (
        <Badge tone={r.zone === "WBP" ? "warning" : "neutral"}>
          {r.zone === "WBP" ? "WBP (Puncak)" : "LWBP (Normal)"}
        </Badge>
      ),
    },
    {
      key: "kwh",
      header: "Energi (kWh)",
      align: "right",
      sortable: true,
      render: (r) => <span className="num font-semibold">{fmtNumber(r.kwh, 2)}</span>,
    },
    {
      key: "kw",
      header: "Daya (kW)",
      align: "right",
      sortable: true,
      hideOnMobile: true,
      render: (r) => <span className="num">{r.kw !== null ? fmtNumber(r.kw, 1) : "–"}</span>,
    },
    {
      key: "pf",
      header: "PF (cos φ)",
      align: "right",
      sortable: true,
      render: (r) => {
        if (r.pf === null) return "–";
        const low = r.pf < 0.85;
        return (
          <span className={cn("num font-medium", low ? "text-warning-700 font-bold" : "text-ink")}>
            {fmtNumber(r.pf, 2)}
          </span>
        );
      },
    },
    {
      key: "voltage",
      header: "Tegangan (V)",
      align: "right",
      sortable: true,
      hideOnMobile: true,
      render: (r) => <span className="num">{r.voltage !== null ? fmtNumber(r.voltage, 0) : "–"}</span>,
    },
    {
      key: "costIdr",
      header: "Est. Biaya",
      align: "right",
      sortable: true,
      render: (r) => <span className="num">{fmtIdr(r.costIdr)}</span>,
    },
    {
      key: "quality",
      header: "Kualitas",
      sortable: true,
      render: (r) => (
        <Badge tone={r.quality === "ok" ? "success" : r.quality === "out_of_range" ? "danger" : "warning"}>
          {r.quality === "ok" ? "Valid" : r.quality === "out_of_range" ? "Di luar rentang" : "Interpolasi"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Interactive Dimension Selector Cards */}
      <div
        role="tablist"
        aria-label="Dimensi Monitoring Energi"
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
      {/* DIMENSION 1: CONSUMPTION & 24-HOUR LOAD PROFILE                    */}
      {/* ================================================================== */}
      {dim === "consumption" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Tren Konsumsi Energi"
                subtitle={`${granularity === "hour" ? "Per jam" : "Per hari"} · garis putus-putus = periode sebelumnya`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5 text-[12px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setChartMode("compare")}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition",
                          chartMode === "compare" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                        )}
                      >
                        vs Periode Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMode("stacked")}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition",
                          chartMode === "stacked" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                        )}
                      >
                        Komposisi per Mesin
                      </button>
                    </div>
                    <ProvenanceBadge kind={provenance} />
                  </div>
                }
              />
              <CardBody>
                {chartMode === "compare" ? (
                  <TimeSeriesChart
                    ariaLabel="Tren konsumsi energi dibanding periode sebelumnya"
                    data={trend}
                    unit="kwh"
                    granularity={granularity}
                    series={[
                      { key: "kwh", label: "Periode ini", color: VIZ.green, type: "area" },
                      ...(totals.hasPrev
                        ? [
                            {
                              key: "prevKwh",
                              label: "Periode sebelumnya",
                              color: VIZ.gray,
                              type: "line" as const,
                              dashed: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : (
                  <TimeSeriesChart
                    ariaLabel="Komposisi konsumsi energi per mesin"
                    data={trend}
                    unit="kwh"
                    granularity={granularity}
                    showTotal
                    series={machines.map((m, i) => ({
                      key: m.id,
                      label: m.name,
                      color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                      type: "bar" as const,
                      stackId: "machines",
                    }))}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Energi per Mesin" subtitle={rangeLabel} actions={<ProvenanceBadge kind={provenance} />} />
              <CardBody>
                <DonutChart
                  ariaLabel="Distribusi energi per mesin"
                  data={machineSummaries.map((m, i) => ({
                    name: m.name,
                    value: m.kwh,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                  }))}
                  unit="kwh"
                  centerValue={fmtNumber(totals.kwh)}
                  centerLabel="kWh total"
                  height={180}
                />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                icon={<Clock />}
                title="Profil Beban Harian Rata-Rata (00.00–23.00 WIB)"
                subtitle={`Pola daya rata-rata per jam · Jendela WBP ${tariff.peakStartHour}.00–${tariff.peakEndHour}.00 WIB`}
                actions={<ProvenanceBadge kind={provenance} />}
              />
              <CardBody>
                <div className="grid grid-cols-12 gap-1.5 sm:grid-cols-24 items-end h-48 pt-6 pb-2 px-1 border-b border-line">
                  {hourlyProfile.map((hp) => {
                    const maxKw = Math.max(...hourlyProfile.map((x) => x.avgKw), 1);
                    const pct = Math.max(6, Math.round((hp.avgKw / maxKw) * 100));
                    return (
                      <div key={hp.hour} className="group relative flex h-full flex-col items-center justify-end">
                        <div
                          style={{ height: `${pct}%` }}
                          className={cn(
                            "w-full rounded-t-md transition-all group-hover:opacity-85",
                            hp.zone === "wbp"
                              ? "bg-warning"
                              : hp.zone === "work"
                                ? "bg-brand-500"
                                : "bg-navy/35",
                          )}
                        />
                        <span className="num mt-1.5 text-[9.5px] text-muted">
                          {String(hp.hour).padStart(2, "0")}
                        </span>
                        <div className="pointer-events-none absolute -top-8 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[10.5px] font-semibold text-white shadow group-hover:block">
                          {String(hp.hour).padStart(2, "0")}.00: {fmtNumber(hp.avgKw, 1)} kW
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-brand-500" /> Jam Kerja LWBP (07.00–17.00)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-warning" /> Beban Puncak WBP ({tariff.peakStartHour}.00–{tariff.peakEndHour}.00)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-navy/35" /> Malam / Idle (22.00–07.00)
                    </span>
                  </div>
                  <span className="num font-semibold text-ink">
                    Beban puncak fasilitas: {fmtNumber(totals.maxDemandKw, 1)} kW
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={<Layers />}
                title="Peringkat Konsumsi Mesin"
                subtitle={rangeLabel}
                actions={<ProvenanceBadge kind={provenance} />}
              />
              <CardBody>
                <HorizontalBarChart
                  ariaLabel="Peringkat konsumsi energi per mesin"
                  unit="kwh"
                  data={machineSummaries.map((m, i) => ({
                    name: m.name,
                    value: m.kwh,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                    note: `${fmtPct(m.sharePct)} dari total (${fmtIdrCompact(m.costIdr)})`,
                  }))}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 2: TARIFF & COST STRUCTURE (WBP vs LWBP)                 */}
      {/* ================================================================== */}
      {dim === "tariff" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                icon={<CircleDollarSign />}
                title="Rincian Estimasi Biaya Listrik (LWBP vs WBP)"
                subtitle={`Golongan tarif ${tariff.tariffGroup} · LWBP Rp${fmtNumber(tariff.baseRateIdrPerKwh)}/kWh · WBP Rp${fmtNumber(Math.round(tariff.baseRateIdrPerKwh * tariff.peakMultiplier))}/kWh (×${tariff.peakMultiplier})`}
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody>
                <TimeSeriesChart
                  ariaLabel="Grafik estimasi biaya listrik LWBP vs WBP"
                  data={trend}
                  unit="idr"
                  granularity={granularity}
                  height={300}
                  showTotal
                  series={[
                    { key: "offPeakCostIdr", label: "Biaya LWBP (Normal)", color: VIZ.navy, type: "bar", stackId: "cost" },
                    { key: "peakCostIdr", label: "Biaya WBP (Puncak)", color: VIZ.amber, type: "bar", stackId: "cost" },
                  ]}
                />
              </CardBody>
              <CardFooter>{TARIFF_NOTE}</CardFooter>
            </Card>

            <Card>
              <CardHeader
                icon={<Sunset />}
                title="Proporsi Energi & Biaya WBP"
                subtitle={`${tariff.peakStartHour}.00–${tariff.peakEndHour}.00 WIB`}
                actions={<ProvenanceBadge kind="estimated" />}
              />
              <CardBody className="space-y-4">
                <DonutChart
                  ariaLabel="Proporsi biaya listrik LWBP dan WBP"
                  unit="idr"
                  height={175}
                  centerValue={fmtIdrCompact(totals.costIdr)}
                  centerLabel="Total estimasi"
                  data={[
                    { name: "LWBP (Normal)", value: totals.offPeakCostIdr, color: VIZ.navy },
                    { name: "WBP (Puncak)", value: totals.peakCostIdr, color: VIZ.amber },
                  ]}
                />
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
                      <Sun className="size-3.5 text-navy" /> Energi LWBP
                    </p>
                    <p className="num mt-1 text-[15px] font-bold text-ink">{fmtNumber(totals.offPeakKwh)} kWh</p>
                    <p className="num text-[11.5px] text-muted">{fmtIdrCompact(totals.offPeakCostIdr)}</p>
                  </div>
                  <div className="rounded-xl bg-warning-50/70 p-3 ring-1 ring-warning/20">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-warning-700">
                      <Sunset className="size-3.5 text-warning" /> Energi WBP
                    </p>
                    <p className="num mt-1 text-[15px] font-bold text-warning-700">{fmtNumber(totals.peakKwh)} kWh</p>
                    <p className="num text-[11.5px] text-warning-700">{fmtIdrCompact(totals.peakCostIdr)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Interactive Peak Shifting Simulator */}
          <Card className="border-brand-200 bg-gradient-to-br from-brand-50/60 via-white to-white">
            <CardHeader
              icon={<Sparkles />}
              title="Simulator Interaktif Penggeseran Beban Puncak (Peak Load Shifting)"
              subtitle="Simulasikan potensi penghematan biaya jika sebagian aktivitas produksi pada jam WBP digeser ke jam kerja LWBP"
              actions={<Badge tone="brand">Simulasi Interaktif</Badge>}
            />
            <CardBody>
              <div className="grid items-center gap-6 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <label htmlFor="peak-shift-slider" className="text-[13.5px] font-semibold text-ink">
                      Persentase beban WBP yang digeser ke jam LWBP:
                    </label>
                    <span className="num rounded-lg bg-forest px-2.5 py-1 text-[13px] font-bold text-white">
                      {shiftPct}% ({fmtNumber(shiftedKwh, 0)} kWh)
                    </span>
                  </div>
                  <input
                    id="peak-shift-slider"
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={shiftPct}
                    onChange={(e) => setShiftPct(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-brand-200 accent-forest"
                  />
                  <div className="flex justify-between text-[11.5px] text-muted">
                    <span>5% (Konservatif)</span>
                    <span>40% (Oven & Pemanas)</span>
                    <span>80% (Agresif)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:col-span-5">
                  <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
                    <p className="text-[12px] text-muted">Estimasi Hemat (Periode Ini)</p>
                    <p className="num mt-1 text-xl font-extrabold text-brand-700">{fmtIdr(periodSavingsIdr)}</p>
                    <p className="mt-1 text-[11px] text-muted">Selisih tarif Rp{fmtNumber(rateDiff)}/kWh</p>
                  </div>
                  <div className="rounded-xl border border-forest bg-forest p-4 text-white shadow-xs">
                    <p className="text-[12px] text-white/75">Proyeksi Hemat Tahunan</p>
                    <p className="num mt-1 text-xl font-extrabold text-brand-300">
                      {fmtIdrCompact(periodSavingsIdr * 12)}
                      <span className="text-[12px] font-normal text-white/70">/thn</span>
                    </p>
                    <p className="mt-1 text-[11px] text-brand-200">Tanpa mengurangi output produksi</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 3: POWER QUALITY & ELECTRICAL PARAMETERS                 */}
      {/* ================================================================== */}
      {dim === "quality" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader
              icon={<Gauge />}
              title={`Tren Parameter Kelistrikan: ${paramMeta[elecParam].label}`}
              subtitle="Pilih parameter kelistrikan 3-fase untuk memeriksa stabilitas suplai dan efisiensi daya reaktif"
              actions={
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { k: "pf", l: "Power Factor (cos φ)" },
                      { k: "voltage", l: "Tegangan (V)" },
                      { k: "current", l: "Arus (A)" },
                      { k: "kw", l: "Daya Aktif (kW)" },
                      { k: "frequency", l: "Frekuensi (Hz)" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.k}
                      type="button"
                      onClick={() => setElecParam(p.k)}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                        elecParam === p.k
                          ? "bg-forest text-white shadow-xs"
                          : "bg-canvas text-muted hover:bg-brand-50 hover:text-ink",
                      )}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody>
              <TimeSeriesChart
                ariaLabel={`Grafik ${paramMeta[elecParam].label}`}
                data={trend}
                unit={paramMeta[elecParam].unit}
                granularity={granularity}
                height={300}
                yDomain={paramMeta[elecParam].domain}
                referenceLines={paramMeta[elecParam].ref ? [paramMeta[elecParam].ref!] : []}
                series={[
                  {
                    key: elecParam,
                    label: paramMeta[elecParam].label,
                    color: paramMeta[elecParam].color,
                    type: elecParam === "kw" || elecParam === "current" ? "area" : "line",
                  },
                ]}
              />
            </CardBody>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Rata-rata Faktor Daya fasilitas:{" "}
                <strong className="num text-ink">
                  {totals.avgPowerFactor !== null ? fmtNumber(totals.avgPowerFactor, 2) : "–"}
                </strong>{" "}
                (ambang bebas denda kVARh PLN ≥ 0,85)
              </span>
              <ProvenanceBadge kind={provenance} />
            </CardFooter>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machineSummaries.map((m) => {
              const pfLow = m.avgPf !== null && m.avgPf < 0.85;
              return (
                <Card key={m.machineId} className={cn(pfLow && "border-warning/40")}>
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-bold text-ink">{m.name}</h3>
                        <p className="text-[12px] text-muted">Kapasitas pengenal {m.ratedKw} kW</p>
                      </div>
                      <Badge tone={pfLow ? "warning" : "success"}>
                        {pfLow ? "PF Perlu Koreksi" : "Kualitas Optimal"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas p-2.5 text-center">
                      <div>
                        <p className="text-[10.5px] text-muted">PF Rata-rata</p>
                        <p className={cn("num mt-0.5 text-[14px] font-bold", pfLow ? "text-warning-700" : "text-ink")}>
                          {m.avgPf !== null ? fmtNumber(m.avgPf, 2) : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-muted">Tegangan</p>
                        <p className="num mt-0.5 text-[14px] font-bold text-ink">
                          {m.avgVoltage !== null ? `${fmtNumber(m.avgVoltage, 0)} V` : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-muted">Puncak Beban</p>
                        <p className="num mt-0.5 text-[14px] font-bold text-ink">{fmtPct(m.peakLoadPct)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11.5px] text-muted">
                        <span>Utilisasi Daya Puncak vs Rated</span>
                        <span className="num font-medium text-ink">
                          {fmtNumber(m.maxKw, 1)} / {m.ratedKw} kW
                        </span>
                      </div>
                      <Progress
                        value={m.peakLoadPct}
                        tone={m.peakLoadPct > 92 ? "danger" : m.peakLoadPct > 80 ? "warning" : "brand"}
                        className="mt-1.5"
                        label={`Beban puncak ${m.name}`}
                      />
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 4: INTERVAL READINGS TABLE                               */}
      {/* ================================================================== */}
      {dim === "intervals" && (
        <Card className="animate-fade-in">
          <CardHeader
            icon={<Table2 />}
            title="Log Pembacaan Sensor Interval Per Jam"
            subtitle={`Menampilkan ${intervalRows.length} interval terbaru pada rentang ${rangeLabel}`}
            actions={<ProvenanceBadge kind={provenance} />}
          />
          <DataTable
            rows={intervalRows}
            columns={columns}
            getRowId={(r) => r.id}
            caption="Tabel pembacaan interval energi per mesin"
            searchPlaceholder="Cari mesin, perangkat, atau zona..."
            searchText={(r) => `${r.machineName} ${r.deviceId} ${r.zone}`}
            filters={[
              {
                key: "zone",
                label: "Zona Tarif",
                options: [
                  { value: "WBP", label: "WBP (Beban Puncak)" },
                  { value: "LWBP", label: "LWBP (Normal)" },
                ],
                match: (r, v) => r.zone === v,
              },
              {
                key: "quality",
                label: "Status Kualitas",
                options: [
                  { value: "ok", label: "Valid (OK)" },
                  { value: "out_of_range", label: "Di luar rentang" },
                ],
                match: (r, v) => r.quality === v,
              },
            ]}
            pageSize={12}
          />
        </Card>
      )}
    </div>
  );
}
