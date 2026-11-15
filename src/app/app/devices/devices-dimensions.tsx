"use client";

import { useActionState, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  DatabaseZap,
  PlusCircle,
  RefreshCw,
  Router,
  Signal,
  Sparkles,
  Trash2,
  Wifi,
  Wrench,
} from "lucide-react";
import type { Device } from "@/lib/domain/types";
import type { PairedDevice } from "@/lib/store/platform-store";
import { deviceStatusLabel } from "@/lib/calc/quality";
import { pairDevice, removePairedDevice } from "@/app/actions/platform";
import type { FormState } from "@/app/actions/auth";
import { cn, fmtDate, fmtDateTime, fmtNumber, fmtPct, fmtRelative } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Callout, EmptyState, Progress, StatusDot } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { VIZ } from "@/components/charts/format";
import { DataTable, type Column } from "@/components/data/data-table";

export type DevicesDimensionKey =
  | "fleet"
  | "quality"
  | "pairing"
  | "diagnostics";

export interface EnrichedDeviceRow {
  id: string;
  serial: string;
  model: string;
  machineId: string | null;
  machineName: string;
  location: string;
  ratedPowerKw: number;
  firmware: string;
  status: Device["status"];
  lastSeen: string;
  signalDbm: number;
  installedAt: string;
  expectedIntervals: number;
  receivedIntervals: number;
  completenessPct: number;
  outOfRangeCount: number;
  gapCount: number;
}

export interface TelemetryGapRow {
  id: string;
  deviceId: string;
  machineName: string;
  from: string;
  to: string;
  hours: number;
}

const DIMENSIONS: {
  key: DevicesDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Router;
}[] = [
  {
    key: "fleet",
    label: "Status Sensor & Konektivitas",
    shortDesc: "Kondisi real-time 6 smart meter, sinyal & waktu kirim terakhir",
    icon: Router,
  },
  {
    key: "quality",
    label: "Kelengkapan Data & Celah",
    shortDesc: "Audit interval per jam, data hilang (gap) & pembacaan anomali",
    icon: DatabaseZap,
  },
  {
    key: "pairing",
    label: "Registrasi & Pairing Sensor",
    shortDesc: "Daftarkan serial perangkat IoT baru & panduan instalasi CT",
    icon: PlusCircle,
  },
  {
    key: "diagnostics",
    label: "Diagnostik Sinyal & Firmware",
    shortDesc: "Uji ping gateway, kekuatan sinyal RSSI (dBm) & versi firmware",
    icon: Signal,
  },
];

const initialFormState: FormState = { ok: false };

export function DevicesDimensionsView({
  initialDim,
  devices,
  gaps,
  pairedDevices,
  overallCompletenessPct,
  expectedTotal,
  receivedTotal,
  outOfRangeTotal,
  longestGapHours,
}: {
  initialDim: DevicesDimensionKey;
  devices: EnrichedDeviceRow[];
  gaps: TelemetryGapRow[];
  pairedDevices: PairedDevice[];
  overallCompletenessPct: number;
  expectedTotal: number;
  receivedTotal: number;
  outOfRangeTotal: number;
  longestGapHours: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as DevicesDimensionKey | null;
  const [activeDim, setActiveDim] = useState<DevicesDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<DevicesDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "fleet" ||
        urlDim === "quality" ||
        urlDim === "pairing" ||
        urlDim === "diagnostics")
    ) {
      setActiveDim(urlDim);
    }
  }

  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "degraded" | "offline">(
    "all",
  );

  // Pairing form state
  const [formState, formAction, formPending] = useActionState(
    pairDevice,
    initialFormState,
  );
  const [serialInput, setSerialInput] = useState("ESM-MTR-4829104");
  const [machineNameInput, setMachineNameInput] = useState("Mesin Bubut CNC #2");
  const [ratedKwInput, setRatedKwInput] = useState("15");
  const [isPending, startTransition] = useTransition();

  // Simulated Ping Diagnostics state
  const [pingResult, setPingResult] = useState<string | null>(null);

  function selectDimension(dim: DevicesDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "fleet") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filteredDevices = devices.filter((d) =>
    statusFilter === "all" ? true : d.status === statusFilter,
  );

  function generateSampleSerial() {
    const suffix = Math.floor(1000000 + Math.random() * 9000000);
    setSerialInput(`ESM-MTR-${suffix}`);
  }

  function runGatewayDiagnostic() {
    const online = devices.filter((d) => d.status === "online").length;
    setPingResult(
      `Diagnostik selesai: ${online}/${devices.length} perangkat merespons ping (< 42 ms). 1 perangkat (DEV-1005) perlu pemeriksaan catu daya lokal.`,
    );
  }

  const deviceColumns: Column<EnrichedDeviceRow>[] = [
    {
      key: "id",
      header: "Perangkat & Serial",
      render: (d) => (
        <div>
          <div className="flex items-center gap-2 font-semibold text-ink">
            <StatusDot status={d.status} />
            <span>{d.id}</span>
            <span className="font-mono text-xs text-ink-muted">({d.serial})</span>
          </div>
          <div className="text-xs text-ink-muted">
            {d.model} · FW v{d.firmware}
          </div>
        </div>
      ),
    },
    {
      key: "machine",
      header: "Mesin Terhubung",
      render: (d) => (
        <div>
          <div className="font-medium text-ink">{d.machineName}</div>
          <div className="text-xs text-ink-muted">
            {d.location} · {fmtNumber(d.ratedPowerKw, 1)} kW
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <Badge
          tone={
            d.status === "online"
              ? "success"
              : d.status === "degraded"
                ? "warning"
                : "danger"
          }
        >
          {deviceStatusLabel(d)}
        </Badge>
      ),
    },
    {
      key: "signal",
      header: "Sinyal (RSSI)",
      align: "right",
      sortValue: (d) => d.signalDbm,
      render: (d) => (
        <span className="font-mono text-xs font-medium text-ink">
          {d.signalDbm} dBm
        </span>
      ),
    },
    {
      key: "completeness",
      header: "Kelengkapan 30H",
      align: "right",
      sortValue: (d) => d.completenessPct,
      render: (d) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            d.completenessPct >= 97
              ? "text-emerald-800"
              : d.completenessPct >= 90
                ? "text-amber-800"
                : "text-danger",
          )}
        >
          {fmtPct(d.completenessPct, 1)}
        </span>
      ),
    },
    {
      key: "lastSeen",
      header: "Transmisi Terakhir",
      render: (d) => (
        <span className="text-xs text-ink-muted">{fmtRelative(d.lastSeen)}</span>
      ),
    },
  ];

  const gapColumns: Column<TelemetryGapRow>[] = [
    {
      key: "device",
      header: "Perangkat & Mesin",
      render: (g) => (
        <div>
          <div className="font-medium text-ink">{g.machineName}</div>
          <div className="font-mono text-xs text-ink-muted">{g.deviceId}</div>
        </div>
      ),
    },
    {
      key: "from",
      header: "Waktu Mulai Celah",
      sortValue: (g) => g.from,
      render: (g) => <span className="text-xs text-ink">{fmtDateTime(g.from)} WIB</span>,
    },
    {
      key: "to",
      header: "Waktu Pulih",
      render: (g) => <span className="text-xs text-ink">{fmtDateTime(g.to)} WIB</span>,
    },
    {
      key: "hours",
      header: "Durasi Hilang",
      align: "right",
      sortValue: (g) => g.hours,
      render: (g) => (
        <Badge tone={g.hours >= 6 ? "danger" : "warning"}>{g.hours} jam</Badge>
      ),
    },
    {
      key: "note",
      header: "Keterangan Audit M&V",
      render: (g) => (
        <span className="text-xs text-ink-muted">
          {g.hours >= 6
            ? "Gangguan Wi-Fi area belakang; interval tidak diinterpolasi"
            : "Jeda transmisi singkat; otomatis tersinkronisasi dari buffer"}
        </span>
      ),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Multi-Dimensional Selector Bar */}
      <section aria-label="Dimensi manajemen perangkat IoT dan kualitas data">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi Telemetri IoT</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk memantau status sensor, kelengkapan data &amp; celah waktu, registrasi perangkat baru, atau diagnostik sinyal:
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Kelengkapan agregat 30 hari:{" "}
            <strong className="text-ink">{fmtPct(overallCompletenessPct, 1)}</strong>
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
      {/* DIMENSION 1: STATUS SENSOR & KONEKTIVITAS                        */}
      {/* ================================================================ */}
      {activeDim === "fleet" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
              {(
                [
                  { k: "all", l: `Semua (${devices.length})` },
                  {
                    k: "online",
                    l: `Online (${devices.filter((d) => d.status === "online").length})`,
                  },
                  {
                    k: "degraded",
                    l: `Sinyal Lemah (${devices.filter((d) => d.status === "degraded").length})`,
                  },
                  {
                    k: "offline",
                    l: `Offline (${devices.filter((d) => d.status === "offline").length})`,
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setStatusFilter(t.k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    statusFilter === t.k
                      ? "bg-surface-raised text-ink shadow-2xs"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => selectDimension("pairing")}
            >
              <PlusCircle className="size-4" aria-hidden />
              Daftarkan Perangkat Baru
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDevices.map((d) => (
              <Card key={d.id} className="flex flex-col justify-between">
                <CardHeader
                  title={
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={d.status} />
                      {d.machineName}
                    </span>
                  }
                  subtitle={`${d.id} · ${d.serial} · ${d.location}`}
                  actions={
                    <Badge
                      tone={
                        d.status === "online"
                          ? "success"
                          : d.status === "degraded"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {deviceStatusLabel(d)}
                    </Badge>
                  }
                />
                <CardBody className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-muted/40 p-3">
                    <div>
                      <div className="text-[11px] text-ink-muted">Model &amp; Firmware</div>
                      <div className="mt-0.5 font-semibold text-ink">
                        {d.model} (v{d.firmware})
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-muted">Sinyal RSSI</div>
                      <div className="mt-0.5 font-mono font-semibold text-ink">
                        {d.signalDbm} dBm
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-muted">Kelengkapan Data</div>
                      <div className="mt-0.5 font-semibold text-emerald-800">
                        {fmtPct(d.completenessPct, 1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-muted">Paket Diterima</div>
                      <div className="mt-0.5 font-mono text-ink">
                        {fmtNumber(d.receivedIntervals, 0)}/{fmtNumber(d.expectedIntervals, 0)} jam
                      </div>
                    </div>
                  </div>
                </CardBody>
                <CardFooter className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Terakhir terlihat: {fmtRelative(d.lastSeen)}</span>
                  <span>Instalasi: {fmtDate(d.installedAt)}</span>
                </CardFooter>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Tabel Inventaris Perangkat IoT Terpasang"
              subtitle="Seluruh meter energi 3-fasa yang terhubung ke mesin produksi"
            />
            <CardBody className="p-0">
              <DataTable
                rows={filteredDevices}
                columns={deviceColumns}
                getRowId={(d) => d.id}
                caption="Tabel daftar perangkat IoT dan status konektivitas"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: KELENGKAPAN DATA & CELAH                            */}
      {/* ================================================================ */}
      {activeDim === "quality" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader
                title="Kelengkapan Interval Per Jam per Perangkat (30 Hari)"
                subtitle="Ambang batas skor penuh kualitas data M&V adalah ≥ 95%"
                actions={<ProvenanceBadge kind="simulated" />}
              />
              <CardBody>
                <HorizontalBarChart
                  data={devices.map((d) => ({
                    name: `${d.id} · ${d.machineName}`,
                    value: Math.round(d.completenessPct * 10) / 10,
                    color:
                      d.completenessPct >= 97
                        ? VIZ.green
                        : d.completenessPct >= 90
                          ? VIZ.amber
                          : VIZ.red,
                  }))}
                  unit="pct"
                  height={250}
                  ariaLabel="Perbandingan persentase kelengkapan data per perangkat"
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Ringkasan Integritas Telemetri"
                subtitle="Statistik audit kualitas data 30 hari terakhir"
              />
              <CardBody className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Interval Diterima / Diharapkan</span>
                  <span className="font-mono font-semibold text-ink">
                    {fmtNumber(receivedTotal, 0)} / {fmtNumber(expectedTotal, 0)} interval
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Pembacaan Di Luar Rentang (Out-of-Range)</span>
                  <Badge tone={outOfRangeTotal > 0 ? "warning" : "success"}>
                    {outOfRangeTotal} interval ditandai
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Celah Transmisi Terpanjang</span>
                  <span className="font-semibold text-ink">{longestGapHours} jam berturut-turut</span>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-brand-950">
                  <strong className="font-semibold">Kebijakan Tanpa Manipulasi Data:</strong>{" "}
                  Interval yang hilang akibat sensor offline dibiarkan kosong dan tercatat pada log celah di bawah agar perhitungan M&amp;V tetap jujur dan dapat diaudit.
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Log Celah Transmisi Data (≥ 2 Jam Berturut-turut)"
              subtitle="Daftar jeda penerimaan data sensor selama 30 hari terakhir"
              actions={<Badge tone="warning">{gaps.length} Celah Tercatat</Badge>}
            />
            <CardBody className="p-0">
              <DataTable
                rows={gaps}
                columns={gapColumns}
                getRowId={(g) => g.id}
                caption="Tabel log celah transmisi data sensor IoT"
                emptyTitle="Tidak ada celah transmisi data (100% kontinu)."
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: REGISTRASI & PAIRING SENSOR                         */}
      {/* ================================================================ */}
      {activeDim === "pairing" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader
              title="Daftarkan Perangkat Smart Meter Baru"
              subtitle="Masukkan kode serial pada stiker perangkat EcoSME Meter"
              icon={<PlusCircle className="size-4" />}
            />
            <CardBody>
              <form action={formAction} className="space-y-4">
                <Field
                  label="Nomor Serial Perangkat (Format: ESM-XXX-1234567)"
                  htmlFor="dev-serial"
                  error={formState.fieldErrors?.serial}
                  hint={
                    <button
                      type="button"
                      onClick={generateSampleSerial}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      Hasilkan contoh serial valid otomatis →
                    </button>
                  }
                >
                  <Input
                    id="dev-serial"
                    name="serial"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                    placeholder="ESM-MTR-4829104"
                    required
                  />
                </Field>

                <Field
                  label="Nama Mesin / Panel Listrik yang Dipantau"
                  htmlFor="dev-machine"
                  error={formState.fieldErrors?.machineName}
                >
                  <Input
                    id="dev-machine"
                    name="machineName"
                    value={machineNameInput}
                    onChange={(e) => setMachineNameInput(e.target.value)}
                    placeholder="Contoh: Kompresor Udara Cadangan"
                    required
                  />
                </Field>

                <Field
                  label="Daya Terpasang / Nameplate Mesin (kW)"
                  htmlFor="dev-kw"
                  error={formState.fieldErrors?.ratedPowerKw}
                >
                  <Input
                    id="dev-kw"
                    name="ratedPowerKw"
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="2000"
                    value={ratedKwInput}
                    onChange={(e) => setRatedKwInput(e.target.value)}
                    required
                  />
                </Field>

                {formState.message && (
                  <Callout tone={formState.ok ? "brand" : "danger"}>
                    {formState.message}
                  </Callout>
                )}

                <Button type="submit" variant="primary" className="w-full" disabled={formPending}>
                  <PlusCircle className="size-4" aria-hidden />
                  {formPending ? "Mendaftarkan Perangkat…" : "Pasangkan Perangkat Baru"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="space-y-6 lg:col-span-7">
            <Card>
              <CardHeader
                title="Antrean Perangkat Baru Terdaftar (Menunggu Data Pertama)"
                subtitle="Perangkat yang baru dipasangkan melalui formulir di samping"
                actions={<Badge tone="brand">{pairedDevices.length} Terdaftar</Badge>}
              />
              <CardBody>
                {pairedDevices.length === 0 ? (
                  <EmptyState
                    title="Belum ada perangkat baru dalam antrean pairing"
                    description="Gunakan formulir di sebelah kiri untuk mempraktikkan pendaftaran sensor baru pada mode demo."
                  />
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {pairedDevices.map((pd) => (
                      <div
                        key={pd.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-ink">
                              {pd.serial}
                            </span>
                            <Badge tone="info">Menunggu paket pertama</Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-ink-muted">
                            Mesin: <strong className="text-ink">{pd.machineName}</strong> (
                            {pd.ratedPowerKw} kW) · Didaftarkan {fmtRelative(pd.pairedAt)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await removePairedDevice(pd.id);
                            })
                          }
                        >
                          <Trash2 className="size-3.5 text-danger" aria-hidden />
                          Batalkan
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Panduan Instalasi Non-Intrusif (Split-Core CT Clamp)"
                subtitle="Pemasangan sekitar 20 menit per panel tanpa memotong kabel daya mesin"
                icon={<Wrench className="size-4" />}
              />
              <CardBody className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                  <div className="font-semibold text-ink">1. Jepit CT Clamp R-S-T</div>
                  <p className="mt-1 text-ink-muted">
                    Jepitkan sensor arus <em>split-core</em> pada kabel fasa di dalam panel MCB mesin sesuai arah panah beban.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                  <div className="font-semibold text-ink">2. Koneksi Wi-Fi / LTE</div>
                  <p className="mt-1 text-ink-muted">
                    Hubungkan gateway ke jaringan Wi-Fi pabrik atau kartu M2M seluler; buffer lokal menyimpan data hingga 14 hari.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                  <div className="font-semibold text-ink">3. Verifikasi Otomatis</div>
                  <p className="mt-1 text-ink-muted">
                    Begitu paket JSON pertama diterima, status berubah menjadi <strong>Online</strong> dan kurva beban langsung aktif.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: DIAGNOSTIK SINYAL & FIRMWARE                        */}
      {/* ================================================================ */}
      {activeDim === "diagnostics" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Diagnostik Jaringan Gateway & Pembaruan Firmware (OTA)"
              subtitle="Periksa kualitas sinyal nirkabel (RSSI) dan keseragaman versi firmware sensor"
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={runGatewayDiagnostic}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Uji Ping Seluruh Sensor
                </Button>
              }
            />
            <CardBody className="space-y-4">
              {pingResult && (
                <Callout tone="brand" icon={<CheckCircle2 />}>
                  {pingResult}
                </Callout>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {devices.map((d) => {
                  // Convert -90..-45 dBm to 0..100% quality
                  const signalQualityPct = Math.max(
                    5,
                    Math.min(100, Math.round(((d.signalDbm + 95) / 50) * 100)),
                  );
                  return (
                    <div
                      key={d.id}
                      className="rounded-xl border border-border bg-surface-muted/30 p-4 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{d.id}</span>
                        <Badge tone={d.firmware === "1.4.2" ? "success" : "warning"}>
                          FW v{d.firmware} {d.firmware === "1.4.2" ? "(Terbaru)" : "(Update tersedia)"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-ink-muted">{d.machineName}</div>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 text-ink-muted">
                          <Wifi className="size-3.5" aria-hidden />
                          Kekuatan Sinyal ({d.signalDbm} dBm)
                        </span>
                        <span className="font-mono font-semibold text-ink">
                          {signalQualityPct}%
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress
                          value={signalQualityPct}
                          tone={
                            signalQualityPct >= 65
                              ? "brand"
                              : signalQualityPct >= 40
                                ? "warning"
                                : "danger"
                          }
                          label={`Kualitas sinyal ${d.id}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
            <CardFooter className="flex items-center gap-2 text-xs text-ink-muted">
              <Sparkles className="size-3.5 text-brand-700" aria-hidden />
              <span>
                Rekomendasi teknis: Tambahkan repeater Wi-Fi industri di dekat <strong>Area Utilitas Belakang</strong> untuk memperkuat sinyal perangkat <code>DEV-1005</code> dan <code>DEV-1006</code>.
              </span>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
