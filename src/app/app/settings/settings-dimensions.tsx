"use client";

import { useActionState, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BellRing,
  Building2,
  CheckCircle2,
  Cpu,
  Lock,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import type {
  AuditLog,
  Business,
  Machine,
  PlatformUser,
  TariffSettings,
} from "@/lib/domain/types";
import type { ConsentState } from "@/lib/store/platform-store";
import { saveTariffSettings } from "@/app/actions/platform";
import type { FormState } from "@/app/actions/auth";
import { cn, fmtDateTime, fmtIdr, fmtNumber, fmtPct, fmtRelative } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { DataTable, type Column } from "@/components/data/data-table";

export type SettingsDimensionKey =
  | "profile"
  | "tariff"
  | "targets"
  | "governance";

const DIMENSIONS: {
  key: SettingsDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Settings;
}[] = [
  {
    key: "profile",
    label: "Profil Usaha & Fasilitas",
    shortDesc: "Identitas IKM, kapasitas daya kontrak, unit produk & daftar mesin",
    icon: Building2,
  },
  {
    key: "tariff",
    label: "Tarif Listrik & Faktor Emisi",
    shortDesc: "Parameter tarif LWBP/WBP PLN & faktor emisi CO₂e jaringan",
    icon: Zap,
  },
  {
    key: "targets",
    label: "Target Efisiensi & Notifikasi",
    shortDesc: "Ambang peringatan beban puncak, faktor daya & kanal notifikasi",
    icon: BellRing,
  },
  {
    key: "governance",
    label: "Keamanan, Privasi & Audit",
    shortDesc: "Akses pengguna organisasi, izin berbagi data & log konfigurasi",
    icon: ShieldCheck,
  },
];

const initialFormState: FormState = { ok: false };

export function SettingsDimensionsView({
  initialDim,
  business,
  machines,
  tariff,
  consent,
  teamUsers,
  auditLogs,
  currentUserEmail,
}: {
  initialDim: SettingsDimensionKey;
  business: Business;
  machines: Machine[];
  tariff: TariffSettings;
  consent: ConsentState;
  teamUsers: PlatformUser[];
  auditLogs: AuditLog[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as SettingsDimensionKey | null;
  const [activeDim, setActiveDim] = useState<SettingsDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<SettingsDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "profile" ||
        urlDim === "tariff" ||
        urlDim === "targets" ||
        urlDim === "governance")
    ) {
      setActiveDim(urlDim);
    }
  }

  // Profile local demo state
  const [bizName, setBizName] = useState(business.name);
  const [bizSector, setBizSector] = useState(business.sector);
  const [bizCity, setBizCity] = useState(business.city);
  const [bizUnit, setBizUnit] = useState(business.productUnit);
  const [bizEmployees, setBizEmployees] = useState(String(business.employees));
  const [bizKva, setBizKva] = useState(String(business.contractedPowerKva));
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  // Tariff form state (server action)
  const [tariffState, tariffAction, tariffPending] = useActionState(
    saveTariffSettings,
    initialFormState,
  );
  const [tGroup, setTGroup] = useState(tariff.tariffGroup);
  const [tBaseRate, setTBaseRate] = useState(String(tariff.baseRateIdrPerKwh));
  const [tPeakMult, setTPeakMult] = useState(String(tariff.peakMultiplier));
  const [tPeakStart, setTPeakStart] = useState(String(tariff.peakStartHour));
  const [tPeakEnd, setTPeakEnd] = useState(String(tariff.peakEndHour));
  const [tEmission, setTEmission] = useState(String(tariff.emissionFactorKgPerKwh));

  // Targets & Notification thresholds state
  const [targetIntensityCutPct, setTargetIntensityCutPct] = useState(15);
  const [minPfThreshold, setMinPfThreshold] = useState(0.85);
  const [maxOverloadPct, setMaxOverloadPct] = useState(90);
  const [maxWbpSharePct, setMaxWbpSharePct] = useState(22);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyOffline, setNotifyOffline] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);
  const [targetSavedMsg, setTargetSavedMsg] = useState<string | null>(null);

  function selectDimension(dim: SettingsDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "profile") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const previewLwbpRate = Number(tBaseRate) || tariff.baseRateIdrPerKwh;
  const previewWbpRate = Math.round(
    previewLwbpRate * (Number(tPeakMult) || tariff.peakMultiplier),
  );

  const machineColumns: Column<Machine>[] = [
    {
      key: "id",
      header: "ID & Nama Mesin",
      render: (m) => (
        <div>
          <div className="font-semibold text-ink">{m.name}</div>
          <div className="font-mono text-xs text-ink-muted">
            {m.id} · Sensor: {m.deviceId}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (m) => <Badge tone="neutral">{m.category.toUpperCase()}</Badge>,
    },
    {
      key: "ratedPowerKw",
      header: "Daya Nameplate",
      align: "right",
      sortValue: (m) => m.ratedPowerKw,
      render: (m) => (
        <span className="font-mono font-semibold text-ink">
          {fmtNumber(m.ratedPowerKw, 1)} kW
        </span>
      ),
    },
    {
      key: "location",
      header: "Area Pabrik",
      render: (m) => <span className="text-xs text-ink">{m.location}</span>,
    },
    {
      key: "schedule",
      header: "Jadwal Operasional",
      render: (m) => (
        <span className="font-mono text-xs text-ink-muted">
          {String(m.schedule.start).padStart(2, "0")}:00–
          {String(m.schedule.end).padStart(2, "0")}:00 WIB ({m.schedule.days})
        </span>
      ),
    },
  ];

  const userColumns: Column<PlatformUser>[] = [
    {
      key: "name",
      header: "Nama Pengguna",
      render: (u) => (
        <div>
          <div className="font-semibold text-ink">
            {u.name}{" "}
            {u.email === currentUserEmail && (
              <Badge tone="brand">Sesi Anda</Badge>
            )}
          </div>
          <div className="text-xs text-ink-muted">{u.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran Akses",
      render: (u) => <Badge tone="neutral">{u.role.toUpperCase()}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge tone={u.status === "active" ? "success" : "warning"}>
          {u.status === "active" ? "Aktif" : u.status}
        </Badge>
      ),
    },
    {
      key: "lastActive",
      header: "Aktivitas Terakhir",
      render: (u) => (
        <span className="text-xs text-ink-muted">{fmtRelative(u.lastActive)}</span>
      ),
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    {
      key: "at",
      header: "Waktu (WIB)",
      render: (l) => (
        <span className="font-mono text-xs text-ink-muted">{fmtDateTime(l.at)}</span>
      ),
    },
    {
      key: "actor",
      header: "Pelaku",
      render: (l) => <span className="font-medium text-ink">{l.actor}</span>,
    },
    {
      key: "action",
      header: "Tindakan Konfigurasi",
      render: (l) => <span className="text-ink">{l.action}</span>,
    },
    {
      key: "target",
      header: "Target",
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
      <section aria-label="Dimensi pengaturan sistem dan parameter">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi Konfigurasi</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk mengelola profil fasilitas usaha, asumsi tarif &amp; faktor emisi, ambang batas peringatan, atau keamanan &amp; audit:
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Golongan aktif: <strong className="text-ink">{tariff.tariffGroup} (Rp{fmtNumber(tariff.baseRateIdrPerKwh, 0)}/kWh)</strong>
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
      {/* DIMENSION 1: PROFIL USAHA & FASILITAS                            */}
      {/* ================================================================ */}
      {activeDim === "profile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Identitas Badan Usaha & Spesifikasi Fasilitas Produksi"
              subtitle="Data ini tercantum otomatis pada header dashboard dan seluruh laporan M&V"
              icon={<Building2 className="size-4" />}
            />
            <CardBody>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProfileSavedMsg(
                    `Profil fasilitas "${bizName}" (${bizCity}) telah diperbarui untuk sesi ini.`,
                  );
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Nama Perusahaan / IKM" htmlFor="prof-name">
                    <Input
                      id="prof-name"
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                    />
                  </Field>
                  <Field label="Sub-Sektor Industri Manufaktur" htmlFor="prof-sector">
                    <Input
                      id="prof-sector"
                      value={bizSector}
                      onChange={(e) => setBizSector(e.target.value)}
                    />
                  </Field>
                  <Field label="Kota / Kabupaten Lokasi Pabrik" htmlFor="prof-city">
                    <Input
                      id="prof-city"
                      value={bizCity}
                      onChange={(e) => setBizCity(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Satuan Output Produksi (untuk Intensitas)"
                    htmlFor="prof-unit"
                    hint="Digunakan sebagai pembagi kWh/unit pada regresi M&V"
                  >
                    <Input
                      id="prof-unit"
                      value={bizUnit}
                      onChange={(e) => setBizUnit(e.target.value)}
                    />
                  </Field>
                  <Field label="Jumlah Tenaga Kerja Aktif" htmlFor="prof-emp">
                    <Input
                      id="prof-emp"
                      type="number"
                      min={1}
                      value={bizEmployees}
                      onChange={(e) => setBizEmployees(e.target.value)}
                    />
                  </Field>
                  <Field label="Daya Kontrak PLN Terpasang (kVA)" htmlFor="prof-kva">
                    <Input
                      id="prof-kva"
                      type="number"
                      min={10}
                      value={bizKva}
                      onChange={(e) => setBizKva(e.target.value)}
                    />
                  </Field>
                </div>

                {profileSavedMsg && (
                  <Callout tone="brand" icon={<CheckCircle2 />}>
                    {profileSavedMsg}
                  </Callout>
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm">
                    <Save className="size-4" aria-hidden />
                    Simpan Profil Usaha
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Daftar Mesin Produksi & Jadwal Operasional Standar"
              subtitle="Konsumsi energi di luar jam jadwal standar akan memicu peringatan beban luar jam kerja"
              icon={<Cpu className="size-4" />}
            />
            <CardBody className="p-0">
              <DataTable
                rows={machines}
                columns={machineColumns}
                getRowId={(m) => m.id}
                caption="Tabel spesifikasi mesin dan jadwal kerja"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: TARIF LISTRIK & FAKTOR EMISI                        */}
      {/* ================================================================ */}
      {activeDim === "tariff" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              title="Konfigurasi Tarif Listrik PLN & Faktor Emisi Grid"
              subtitle="Perubahan pada formulir ini akan menghitung ulang seluruh estimasi biaya (Rp) dan emisi (kg CO₂e) di seluruh halaman"
              icon={<Zap className="size-4" />}
            />
            <CardBody>
              <form action={tariffAction} className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                  <span className="text-xs font-semibold text-brand-950">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTGroup("I-3/TM");
                      setTBaseRate("1115");
                      setTPeakMult("1.5");
                      setTPeakStart("17");
                      setTPeakEnd("22");
                      setTEmission("0.82");
                    }}
                    className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-900 hover:bg-brand-100"
                  >
                    Standar PLN I-3/TM (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTGroup("I-2/TR");
                      setTBaseRate("1075");
                      setTPeakMult("1.4");
                      setTPeakStart("18");
                      setTPeakEnd("22");
                      setTEmission("0.82");
                    }}
                    className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-900 hover:bg-brand-100"
                  >
                    Industri Kecil I-2/TR (Rp1.075)
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Golongan Tarif PLN"
                    htmlFor="t-group"
                    error={tariffState.fieldErrors?.tariffGroup}
                  >
                    <Input
                      id="t-group"
                      name="tariffGroup"
                      value={tGroup}
                      onChange={(e) => setTGroup(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Tarif Dasar Luar Puncak / LWBP (Rp/kWh)"
                    htmlFor="t-base"
                    error={tariffState.fieldErrors?.baseRateIdrPerKwh}
                  >
                    <Input
                      id="t-base"
                      name="baseRateIdrPerKwh"
                      type="number"
                      min={100}
                      max={10000}
                      step={5}
                      value={tBaseRate}
                      onChange={(e) => setTBaseRate(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Faktor Pengali Beban Puncak (WBP Multiplier)"
                    htmlFor="t-mult"
                    hint="Misal 1.5 berarti tarif WBP = 1,5 × tarif LWBP"
                    error={tariffState.fieldErrors?.peakMultiplier}
                  >
                    <Input
                      id="t-mult"
                      name="peakMultiplier"
                      type="number"
                      step="0.05"
                      min="1"
                      max="3"
                      value={tPeakMult}
                      onChange={(e) => setTPeakMult(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Faktor Emisi Jaringan (kg CO₂e / kWh)"
                    htmlFor="t-ef"
                    hint="Grid Jamali (Jawa-Madura-Bali) rata-rata 0,82 kg/kWh"
                    error={tariffState.fieldErrors?.emissionFactorKgPerKwh}
                  >
                    <Input
                      id="t-ef"
                      name="emissionFactorKgPerKwh"
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1.5"
                      value={tEmission}
                      onChange={(e) => setTEmission(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Jam Mulai WBP (0–23 WIB)"
                    htmlFor="t-start"
                    error={tariffState.fieldErrors?.peakStartHour}
                  >
                    <Input
                      id="t-start"
                      name="peakStartHour"
                      type="number"
                      min={0}
                      max={23}
                      value={tPeakStart}
                      onChange={(e) => setTPeakStart(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Jam Selesai WBP (1–24 WIB)"
                    htmlFor="t-end"
                    error={tariffState.fieldErrors?.peakEndHour}
                  >
                    <Input
                      id="t-end"
                      name="peakEndHour"
                      type="number"
                      min={1}
                      max={24}
                      value={tPeakEnd}
                      onChange={(e) => setTPeakEnd(e.target.value)}
                      required
                    />
                  </Field>
                </div>

                {tariffState.message && (
                  <Callout tone={tariffState.ok ? "brand" : "danger"}>
                    {tariffState.message}
                  </Callout>
                )}

                <Button type="submit" variant="primary" disabled={tariffPending}>
                  <Save className="size-4" aria-hidden />
                  {tariffPending
                    ? "Menyimpan & Menghitung Ulang…"
                    : "Simpan Parameter Tarif & Emisi"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title="Pratinjau Skema Tarif Aktif"
              subtitle="Ringkasan asumsi finansial & karbon yang sedang digunakan"
              actions={<ProvenanceBadge kind="estimated" />}
            />
            <CardBody className="space-y-4 text-xs">
              <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                <div className="text-ink-muted">Tarif Jam Normal / LWBP</div>
                <div className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
                  {fmtIdr(previewLwbpRate)}{" "}
                  <span className="text-xs font-normal text-ink-muted">/ kWh</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="text-amber-900">
                  Tarif Jam Beban Puncak / WBP ({tPeakStart}.00–{tPeakEnd}.00 WIB)
                </div>
                <div className="mt-1 font-display text-2xl font-semibold text-amber-950 tabular-nums">
                  {fmtIdr(previewWbpRate)}{" "}
                  <span className="text-xs font-normal text-amber-900">/ kWh</span>
                </div>
                <div className="mt-1 text-amber-800">
                  Pengali {tPeakMult}× terhadap tarif dasar LWBP
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="text-emerald-900">Faktor Konversi Emisi GRK Scope 2</div>
                <div className="mt-1 font-display text-2xl font-semibold text-emerald-950 tabular-nums">
                  {tEmission} kg CO₂e{" "}
                  <span className="text-xs font-normal text-emerald-900">/ kWh</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: TARGET EFISIENSI & NOTIFIKASI                       */}
      {/* ================================================================ */}
      {activeDim === "targets" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              title="Ambang Batas Deteksi Anomali & Target Tahunan"
              subtitle="Sesuaikan sensitivitas aturan peringatan dan sasaran penghematan tahunan"
              icon={<SlidersHorizontal className="size-4" />}
            />
            <CardBody className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="tg-int" className="text-ink">
                    Target Penurunan Intensitas Energi Tahunan (vs Baseline)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    -{targetIntensityCutPct}%
                  </span>
                </div>
                <input
                  id="tg-int"
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={targetIntensityCutPct}
                  onChange={(e) => setTargetIntensityCutPct(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="tg-pf" className="text-ink">
                    Ambang Peringatan Faktor Daya Minimum (PF)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    cos φ &lt; {fmtNumber(minPfThreshold, 2)}
                  </span>
                </div>
                <input
                  id="tg-pf"
                  type="range"
                  min={0.75}
                  max={0.92}
                  step={0.01}
                  value={minPfThreshold}
                  onChange={(e) => setMinPfThreshold(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="tg-ov" className="text-ink">
                    Ambang Peringatan Beban Lebih Mesin (% Daya Nameplate)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    &gt; {maxOverloadPct}%
                  </span>
                </div>
                <input
                  id="tg-ov"
                  type="range"
                  min={80}
                  max={110}
                  step={5}
                  value={maxOverloadPct}
                  onChange={(e) => setMaxOverloadPct(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="tg-wbp" className="text-ink">
                    Batas Maksimum Porsi Konsumsi Jam Puncak (WBP)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {fmtPct(maxWbpSharePct, 0)}
                  </span>
                </div>
                <input
                  id="tg-wbp"
                  type="range"
                  min={10}
                  max={35}
                  step={1}
                  value={maxWbpSharePct}
                  onChange={(e) => setMaxWbpSharePct(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              {targetSavedMsg && (
                <Callout tone="brand" icon={<CheckCircle2 />}>
                  {targetSavedMsg}
                </Callout>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTargetIntensityCutPct(15);
                    setMinPfThreshold(0.85);
                    setMaxOverloadPct(90);
                    setMaxWbpSharePct(22);
                    setTargetSavedMsg(null);
                  }}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset Default
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setTargetSavedMsg(
                      "Preferensi target efisiensi dan ambang batas peringatan berhasil disimpan.",
                    )
                  }
                >
                  <Save className="size-4" aria-hidden />
                  Simpan Target &amp; Ambang Batas
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title="Kanal Notifikasi Operasional"
              subtitle="Pengaturan pengiriman peringatan bagi tim teknisi pabrik"
              icon={<BellRing className="size-4" />}
            />
            <CardBody className="space-y-3 text-xs">
              {[
                {
                  id: "n-email",
                  title: "Peringatan Anomali Kritis via Email",
                  desc: "Kirim email instan saat terdeteksi beban berlebih atau PF turun di bawah ambang.",
                  checked: notifyEmail,
                  toggle: () => setNotifyEmail(!notifyEmail),
                },
                {
                  id: "n-offline",
                  title: "Notifikasi Sensor IoT Offline (≥ 2 Jam)",
                  desc: "Beritahu teknisi apabila smart meter tidak mengirim paket data selama 2 jam.",
                  checked: notifyOffline,
                  toggle: () => setNotifyOffline(!notifyOffline),
                },
                {
                  id: "n-digest",
                  title: "Ringkasan Eksekutif Mingguan (Setiap Senin 08.00 WIB)",
                  desc: "Rekap konsumsi kWh mingguan, estimasi biaya, dan perkembangan Green Score.",
                  checked: notifyWeeklyDigest,
                  toggle: () => setNotifyWeeklyDigest(!notifyWeeklyDigest),
                },
              ].map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 p-3.5"
                >
                  <div>
                    <div className="font-semibold text-ink">{item.title}</div>
                    <p className="mt-0.5 text-ink-muted">{item.desc}</p>
                  </div>
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    className="mt-1 size-4 accent-brand-700"
                  />
                </label>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: KEAMANAN, PRIVASI & AUDIT                           */}
      {/* ================================================================ */}
      {activeDim === "governance" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader
                title="Daftar Pengguna & Hak Akses Organisasi"
                subtitle={`Akun yang terhubung ke organisasi ${business.name}`}
                actions={<Badge tone="brand">{teamUsers.length} Pengguna</Badge>}
              />
              <CardBody className="p-0">
                <DataTable
                  rows={teamUsers}
                  columns={userColumns}
                  getRowId={(u) => u.id}
                  caption="Tabel pengguna organisasi IKM"
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Arsitektur Keamanan & Privasi Data"
                subtitle="Status enkripsi sesi dan izin akses pihak ketiga"
                icon={<Lock className="size-4" />}
              />
              <CardBody className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Otentikasi Sesi</span>
                  <Badge tone="success">Cookie HttpOnly · HMAC-SHA256</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Status Berbagi Data Bank Mitra</span>
                  <Badge tone={consent.granted ? "brand" : "neutral"}>
                    {consent.granted ? `Diizinkan (${consent.partner})` : "Tidak Dibagikan"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/40 p-3">
                  <span className="text-ink-muted">Lingkungan Penyimpanan</span>
                  <span className="font-mono font-semibold text-ink">
                    DEMO (Deterministic Seed)
                  </span>
                </div>
                <p className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 leading-relaxed text-brand-950">
                  <Sparkles className="mr-1 inline size-3.5 text-brand-700" aria-hidden />
                  Seluruh perubahan tarif, persetujuan berbagi data, dan pengajuan pembiayaan dicatat secara otomatis pada tabel jejak audit di bawah ini.
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Log Audit Konfigurasi & Keamanan Sistem"
              subtitle="Riwayat aktivitas tingkat organisasi dan sistem"
            />
            <CardBody className="p-0">
              <DataTable
                rows={auditLogs}
                columns={auditColumns}
                getRowId={(l) => l.id}
                caption="Tabel log audit keamanan dan konfigurasi"
              />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
