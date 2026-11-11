"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  LayoutGrid,
  MapPin,
  Sparkles,
  Table2,
} from "lucide-react";
import type { DeviceStatus, MachineCategory, Provenance } from "@/lib/domain/types";
import { cn, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct, fmtRelative } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Progress, StatusDot } from "@/components/ui/feedback";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { MACHINE_COLORS } from "@/components/charts/format";
import { DataTable, type Column } from "@/components/data/data-table";

export type MachinesDimensionKey = "overview" | "comparison" | "schedule" | "telemetry";

export interface MachineDetailItem {
  id: string;
  name: string;
  category: MachineCategory;
  categoryLabel: string;
  location: string;
  ratedPowerKw: number;
  scheduleStart: number;
  scheduleEnd: number;
  scheduleDays: string;
  deviceId: string;
  deviceSerial: string;
  deviceStatus: DeviceStatus;
  deviceLastSeen: string;
  deviceSignalDbm: number;
  kwh: number;
  costIdr: number;
  sharePct: number;
  avgPowerKw: number;
  maxPowerKw: number;
  peakLoadPct: number;
  avgPowerFactor: number | null;
  avgVoltage: number | null;
  runHours: number;
  scheduledKwh: number;
  offScheduleKwh: number;
  offScheduleCostIdr: number;
  offScheduleSharePct: number;
  peakTariffKwh: number;
  peakTariffCostIdr: number;
  hourlyKw: number[]; // 24 hours (0..23)
}

const DIMENSIONS: {
  key: MachinesDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Cpu;
}[] = [
  {
    key: "overview",
    label: "Matriks & Detail Mesin",
    shortDesc: "Kartu interaktif & bedah mendalam per mesin",
    icon: LayoutGrid,
  },
  {
    key: "comparison",
    label: "Perbandingan Beban & Biaya",
    shortDesc: "Peringkat kWh, biaya, kapasitas & kurva tren",
    icon: BarChart3,
  },
  {
    key: "schedule",
    label: "Jadwal vs Jam Idle",
    shortDesc: "Audit konsumsi di luar jam operasional terjadwal",
    icon: Clock,
  },
  {
    key: "telemetry",
    label: "Tabel Spesifikasi & IoT",
    shortDesc: "Data teknis lengkap, faktor daya & status sensor",
    icon: Table2,
  },
];

export function MachinesDimensionsView({
  initialDim,
  rangeLabel,
  granularity,
  provenance,
  totalKwh,
  totalCostIdr,
  machines,
  trend,
}: {
  initialDim: MachinesDimensionKey;
  rangeLabel: string;
  granularity: "hour" | "day";
  provenance: Provenance;
  totalKwh: number;
  totalCostIdr: number;
  machines: MachineDetailItem[];
  trend: Record<string, string | number | null>[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlDim = searchParams.get("dim") as MachinesDimensionKey | null;

  const [dim, setDim] = useState<MachinesDimensionKey>(
    urlDim && DIMENSIONS.some((d) => d.key === urlDim) ? urlDim : initialDim,
  );
  const [selectedId, setSelectedId] = useState<string>(machines[0]?.id ?? "");
  const [compareMetric, setCompareMetric] = useState<"kwh" | "costIdr" | "peakLoadPct" | "runHours">("kwh");

  const [prevUrlDim, setPrevUrlDim] = useState(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (urlDim && DIMENSIONS.some((d) => d.key === urlDim)) {
      setDim(urlDim);
    }
  }

  function selectDimension(next: MachinesDimensionKey) {
    setDim(next);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("dim", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const activeMachine = machines.find((m) => m.id === selectedId) ?? machines[0];
  const activeColor = MACHINE_COLORS[Math.max(0, machines.findIndex((m) => m.id === activeMachine?.id)) % MACHINE_COLORS.length];

  const columns: Column<MachineDetailItem>[] = [
    {
      key: "name",
      header: "Mesin & Lokasi",
      sortable: true,
      render: (m) => (
        <div>
          <span className="block font-semibold text-ink">{m.name}</span>
          <span className="text-[11.5px] text-muted">
            {m.categoryLabel} · {m.location}
          </span>
        </div>
      ),
    },
    {
      key: "ratedPowerKw",
      header: "Kapasitas",
      align: "right",
      sortable: true,
      render: (m) => <span className="num">{fmtNumber(m.ratedPowerKw, 1)} kW</span>,
    },
    {
      key: "kwh",
      header: "Konsumsi (kWh)",
      align: "right",
      sortable: true,
      render: (m) => (
        <div>
          <span className="num block font-semibold">{fmtNumber(m.kwh)}</span>
          <span className="num text-[11px] text-muted">{fmtPct(m.sharePct)} total</span>
        </div>
      ),
    },
    {
      key: "costIdr",
      header: "Est. Biaya",
      align: "right",
      sortable: true,
      render: (m) => <span className="num font-medium">{fmtIdrCompact(m.costIdr)}</span>,
    },
    {
      key: "peakLoadPct",
      header: "Beban Puncak",
      align: "right",
      sortable: true,
      render: (m) => (
        <Badge tone={m.peakLoadPct > 92 ? "danger" : m.peakLoadPct > 80 ? "warning" : "brand"}>
          {fmtPct(m.peakLoadPct)}
        </Badge>
      ),
    },
    {
      key: "avgPowerFactor",
      header: "PF (cos φ)",
      align: "right",
      sortable: true,
      render: (m) => (
        <span
          className={cn(
            "num font-medium",
            m.avgPowerFactor !== null && m.avgPowerFactor < 0.85 ? "text-warning-700 font-bold" : "text-ink",
          )}
        >
          {m.avgPowerFactor !== null ? fmtNumber(m.avgPowerFactor, 2) : "–"}
        </span>
      ),
    },
    {
      key: "runHours",
      header: "Jam Nyala",
      align: "right",
      sortable: true,
      hideOnMobile: true,
      render: (m) => <span className="num">{fmtNumber(m.runHours)} jam</span>,
    },
    {
      key: "deviceStatus",
      header: "Sensor IoT",
      sortable: true,
      render: (m) => (
        <div className="flex items-center gap-2">
          <StatusDot status={m.deviceStatus} />
          <span className="text-[12px] font-medium">{m.deviceId}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Interactive Dimension Selector Bar */}
      <div
        role="tablist"
        aria-label="Dimensi Analisis Mesin"
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
      {/* DIMENSION 1: MACHINE MATRIX & INTERACTIVE INSPECTOR                */}
      {/* ================================================================== */}
      {dim === "overview" && (
        <div className="space-y-4 animate-fade-in">
          {/* Top 2/3 + 1/3 Chart Row matching Overview Page Dimensions */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Tren Konsumsi Energi per Mesin"
                subtitle={`${granularity === "hour" ? "Per jam" : "Per hari"} · pilih kartu mesin di bawah untuk bedah detail`}
                actions={<ProvenanceBadge kind={provenance} />}
              />
              <CardBody>
                <TimeSeriesChart
                  ariaLabel="Grafik tren konsumsi energi seluruh mesin"
                  data={trend}
                  unit="kwh"
                  granularity={granularity}
                  series={machines.map((m, i) => ({
                    key: m.id,
                    label: m.name,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                    type: "line",
                  }))}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Energi per Mesin" subtitle={rangeLabel} actions={<ProvenanceBadge kind={provenance} />} />
              <CardBody>
                <DonutChart
                  ariaLabel="Distribusi energi per mesin"
                  data={machines.map((m, i) => ({
                    name: m.name,
                    value: m.kwh,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                  }))}
                  unit="kwh"
                  centerValue={fmtNumber(totalKwh)}
                  centerLabel="kWh total"
                  height={180}
                />
              </CardBody>
            </Card>
          </div>

          {/* Interactive Machine Cards Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((m, idx) => {
              const isSelected = m.id === activeMachine?.id;
              const color = MACHINE_COLORS[idx % MACHINE_COLORS.length];
              const pfLow = m.avgPowerFactor !== null && m.avgPowerFactor < 0.85;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-brand-500 bg-brand-50/35 shadow-[var(--shadow-pop)] ring-2 ring-brand-500/25"
                      : "border-line bg-surface hover:border-brand-300 hover:shadow-md",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-xs"
                          style={{ background: color }}
                        >
                          <Cpu className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-bold text-ink">{m.name}</h3>
                          <p className="flex items-center gap-1 text-[11.5px] text-muted">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">{m.location}</span>
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line">
                        <StatusDot status={m.deviceStatus} />
                        {m.deviceId}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/90 p-2.5 ring-1 ring-line">
                      <div>
                        <p className="text-[10.5px] text-muted">Konsumsi</p>
                        <p className="num mt-0.5 text-[13.5px] font-bold text-ink">{fmtNumber(m.kwh)} kWh</p>
                        <p className="num text-[10px] font-semibold text-brand-700">{fmtPct(m.sharePct)} total</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-muted">Est. Biaya</p>
                        <p className="num mt-0.5 text-[13.5px] font-bold text-ink">{fmtIdrCompact(m.costIdr)}</p>
                        <p className="num text-[10px] text-muted">{m.runHours} jam aktif</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-muted">Faktor Daya</p>
                        <p className={cn("num mt-0.5 text-[13.5px] font-bold", pfLow ? "text-warning-700" : "text-ink")}>
                          {m.avgPowerFactor !== null ? fmtNumber(m.avgPowerFactor, 2) : "–"}
                        </p>
                        <p className="text-[10px] text-muted">{pfLow ? "< 0,85 PLN" : "Optimal"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2 border-t border-line/70">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-muted">Beban Puncak vs Kapasitas ({m.ratedPowerKw} kW)</span>
                      <span className="num font-bold text-ink">{fmtPct(m.peakLoadPct)}</span>
                    </div>
                    <Progress
                      value={m.peakLoadPct}
                      tone={m.peakLoadPct > 92 ? "danger" : m.peakLoadPct > 80 ? "warning" : "brand"}
                      className="mt-1.5"
                      label={`Beban puncak ${m.name}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Selected Machine Deep-Dive Inspector */}
          {activeMachine && (
            <Card key={activeMachine.id} className="border-brand-300 animate-fade-in">
              <CardHeader
                icon={<Sparkles />}
                title={`Bedah Dimensi Mesin: ${activeMachine.name}`}
                subtitle={`${activeMachine.categoryLabel} · Lokasi: ${activeMachine.location} · Jadwal: ${String(activeMachine.scheduleStart).padStart(2, "0")}.00–${String(activeMachine.scheduleEnd).padStart(2, "0")}.00 WIB (${activeMachine.scheduleDays})`}
                actions={
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">Mesin Terpilih</Badge>
                    <ProvenanceBadge kind={provenance} />
                  </div>
                }
              />
              <CardBody className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] text-muted">Daya Rata-Rata / Puncak</p>
                    <p className="num mt-1 text-[15px] font-bold text-ink">
                      {fmtNumber(activeMachine.avgPowerKw, 1)} / {fmtNumber(activeMachine.maxPowerKw, 1)} kW
                    </p>
                    <p className="text-[11px] text-muted">Kapasitas rated {activeMachine.ratedPowerKw} kW</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] text-muted">Konsumsi Jam Puncak WBP</p>
                    <p className="num mt-1 text-[15px] font-bold text-warning-700">
                      {fmtNumber(activeMachine.peakTariffKwh)} kWh
                    </p>
                    <p className="num text-[11px] text-muted">≈ {fmtIdrCompact(activeMachine.peakTariffCostIdr)}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] text-muted">Konsumsi Luar Jadwal</p>
                    <p className="num mt-1 text-[15px] font-bold text-ink">
                      {fmtNumber(activeMachine.offScheduleKwh)} kWh
                    </p>
                    <p className="num text-[11px] text-muted">
                      {fmtPct(activeMachine.offScheduleSharePct)} dari total mesin
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] text-muted">Tegangan & PF Rata-rata</p>
                    <p className="num mt-1 text-[15px] font-bold text-ink">
                      {activeMachine.avgVoltage ?? 380} V · PF{" "}
                      {activeMachine.avgPowerFactor !== null ? fmtNumber(activeMachine.avgPowerFactor, 2) : "–"}
                    </p>
                    <p className="text-[11px] text-muted">3-Fase Industrial</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] text-muted">Perangkat IoT Terhubung</p>
                    <p className="num mt-1 text-[14px] font-bold text-ink">{activeMachine.deviceSerial}</p>
                    <p className="text-[11px] text-muted">
                      Sinyal {activeMachine.deviceSignalDbm} dBm · {fmtRelative(activeMachine.deviceLastSeen)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="xl:col-span-2 rounded-xl border border-line p-4">
                    <p className="text-[13px] font-semibold text-ink">
                      Tren Konsumsi {activeMachine.name} ({rangeLabel})
                    </p>
                    <p className="mb-2 text-[11.5px] text-muted">
                      Klik kartu mesin lain di atas untuk mengganti grafik secara instan
                    </p>
                    <TimeSeriesChart
                      ariaLabel={`Grafik tren konsumsi ${activeMachine.name}`}
                      data={trend}
                      unit="kwh"
                      granularity={granularity}
                      height={240}
                      showLegend={false}
                      series={[
                        {
                          key: activeMachine.id,
                          label: activeMachine.name,
                          color: activeColor,
                          type: "area",
                        },
                      ]}
                    />
                  </div>

                  <div className="rounded-xl border border-line p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">Pola Beban 24 Jam vs Jadwal Kerja</p>
                      <p className="text-[11.5px] text-muted">
                        Hijau = dalam jadwal ({String(activeMachine.scheduleStart).padStart(2, "0")}.00–
                        {String(activeMachine.scheduleEnd).padStart(2, "0")}.00) · Oranye = luar jadwal
                      </p>
                      <div className="mt-4 grid grid-cols-24 items-end gap-1 h-36 pt-4 border-b border-line">
                        {activeMachine.hourlyKw.map((kw, h) => {
                          const maxH = Math.max(...activeMachine.hourlyKw, 0.5);
                          const pct = Math.max(6, Math.round((kw / maxH) * 100));
                          const inSchedule = h >= activeMachine.scheduleStart && h < activeMachine.scheduleEnd;
                          return (
                            <div key={h} className="group relative flex h-full flex-col items-center justify-end">
                              <div
                                style={{ height: `${pct}%` }}
                                className={cn(
                                  "w-full rounded-t-sm transition-all",
                                  inSchedule ? "bg-brand-500" : kw > 0.1 * activeMachine.ratedPowerKw ? "bg-warning" : "bg-gray-300",
                                )}
                              />
                              {h % 4 === 0 && (
                                <span className="num mt-1 text-[9px] text-muted">{String(h).padStart(2, "0")}</span>
                              )}
                              <div className="pointer-events-none absolute -top-7 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-navy px-1.5 py-0.5 text-[10px] font-semibold text-white shadow group-hover:block">
                                {String(h).padStart(2, "0")}.00: {fmtNumber(kw, 1)} kW
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-3 text-[11.5px] text-muted">
                      Biaya operasi di luar jadwal:{" "}
                      <strong className="num text-ink">{fmtIdr(activeMachine.offScheduleCostIdr)}</strong>
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 2: MULTI-MACHINE COMPARISON                              */}
      {/* ================================================================== */}
      {dim === "comparison" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                icon={<BarChart3 />}
                title="Perbandingan Kinerja Antar Mesin"
                subtitle="Bandingkan mesin berdasarkan dimensi konsumsi, biaya, beban puncak, atau jam nyala"
                actions={
                  <div className="inline-flex flex-wrap rounded-lg border border-line bg-canvas p-0.5 text-[12px] font-semibold">
                    {[
                      { k: "kwh" as const, l: "Energi (kWh)" },
                      { k: "costIdr" as const, l: "Biaya (Rp)" },
                      { k: "peakLoadPct" as const, l: "Beban Puncak (%)" },
                      { k: "runHours" as const, l: "Jam Nyala" },
                    ].map((m) => (
                      <button
                        key={m.k}
                        type="button"
                        onClick={() => setCompareMetric(m.k)}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition",
                          compareMetric === m.k ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                        )}
                      >
                        {m.l}
                      </button>
                    ))}
                  </div>
                }
              />
              <CardBody>
                <HorizontalBarChart
                  ariaLabel="Grafik perbandingan antar mesin"
                  unit={
                    compareMetric === "kwh"
                      ? "kwh"
                      : compareMetric === "costIdr"
                        ? "idr"
                        : compareMetric === "peakLoadPct"
                          ? "pct"
                          : "count"
                  }
                  data={machines.map((m, i) => ({
                    name: m.name,
                    value: m[compareMetric],
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                    note: `Rated ${m.ratedPowerKw} kW · ${m.location}`,
                  }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={<Cpu />}
                title="Distribusi Porsi Energi"
                subtitle={rangeLabel}
                actions={<ProvenanceBadge kind={provenance} />}
              />
              <CardBody>
                <DonutChart
                  ariaLabel="Donut porsi energi per mesin"
                  unit="kwh"
                  height={200}
                  centerValue={fmtNumber(totalKwh)}
                  centerLabel="kWh total"
                  data={machines.map((m, i) => ({
                    name: m.name,
                    value: m.kwh,
                    color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                  }))}
                />
              </CardBody>
              <CardFooter>
                Total estimasi biaya seluruh mesin: <strong className="num text-ink">{fmtIdr(totalCostIdr)}</strong>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader
              icon={<Activity />}
              title="Kurva Tren Konsumsi Seluruh Mesin"
              subtitle="Perbandingan dinamis konsumsi antar mesin dari waktu ke waktu"
              actions={<ProvenanceBadge kind={provenance} />}
            />
            <CardBody>
              <TimeSeriesChart
                ariaLabel="Grafik tren seluruh mesin"
                data={trend}
                unit="kwh"
                granularity={granularity}
                height={300}
                series={machines.map((m, i) => ({
                  key: m.id,
                  label: m.name,
                  color: MACHINE_COLORS[i % MACHINE_COLORS.length],
                  type: "line",
                }))}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 3: SCHEDULE vs OFF-HOURS WASTE AUDIT                     */}
      {/* ================================================================== */}
      {dim === "schedule" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader
              icon={<Clock />}
              title="Audit Konsumsi Energi: Dalam Jadwal vs Luar Jam Operasional (Idle/Lembur)"
              subtitle="Mengidentifikasi mesin yang tetap mengonsumsi listrik di luar jam operasional terjadwal"
              actions={<ProvenanceBadge kind="estimated" />}
            />
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {machines.map((m) => {
                  const highWaste = m.offScheduleSharePct > 15;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-2xl border p-4",
                        highWaste ? "border-warning/40 bg-warning-50/30" : "border-line bg-surface",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[14px] font-bold text-ink">{m.name}</h3>
                          <p className="text-[12px] text-muted">
                            Jadwal: {String(m.scheduleStart).padStart(2, "0")}.00–
                            {String(m.scheduleEnd).padStart(2, "0")}.00 WIB ({m.scheduleDays})
                          </p>
                        </div>
                        <Badge tone={highWaste ? "warning" : "success"}>
                          {fmtPct(m.offScheduleSharePct)} Luar Jadwal
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-[12px]">
                          <span className="text-muted">Dalam Jadwal Kerja</span>
                          <span className="num font-semibold text-ink">{fmtNumber(m.scheduledKwh)} kWh</span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                          <span className="text-muted">Luar Jam Jadwal (Idle/Lembur)</span>
                          <span className="num font-bold text-warning-700">{fmtNumber(m.offScheduleKwh)} kWh</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 flex">
                          <div
                            className="h-full bg-brand-500"
                            style={{ width: `${Math.max(0, 100 - m.offScheduleSharePct)}%` }}
                          />
                          <div className="h-full bg-warning" style={{ width: `${m.offScheduleSharePct}%` }} />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-[12px]">
                        <span className="text-muted">Est. biaya luar jadwal:</span>
                        <span className="num font-bold text-ink">{fmtIdr(m.offScheduleCostIdr)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIMENSION 4: TELEMETRY & SPECIFICATION TABLE                       */}
      {/* ================================================================== */}
      {dim === "telemetry" && (
        <Card className="animate-fade-in">
          <CardHeader
            icon={<Table2 />}
            title="Tabel Spesifikasi Teknis & Telemetri Mesin"
            subtitle={`Ringkasan metrik operasional untuk ${machines.length} mesin pada periode ${rangeLabel}`}
            actions={<ProvenanceBadge kind={provenance} />}
          />
          <DataTable
            rows={machines}
            columns={columns}
            getRowId={(m) => m.id}
            caption="Tabel telemetri dan kinerja per mesin"
            searchPlaceholder="Cari nama mesin, lokasi, atau ID sensor..."
            searchText={(m) => `${m.name} ${m.location} ${m.deviceId} ${m.categoryLabel}`}
            pageSize={10}
          />
        </Card>
      )}
    </div>
  );
}
