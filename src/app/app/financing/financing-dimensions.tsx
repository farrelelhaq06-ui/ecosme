"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileUp,
  Handshake,
  Landmark,
  Lock,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { FinancingApplication } from "@/lib/domain/types";
import type { ReadinessItem } from "@/lib/services/platform";
import type { ConsentState } from "@/lib/store/platform-store";
import { setConsent, setLegalDoc, submitApplication } from "@/app/actions/platform";
import type { FormState } from "@/app/actions/auth";
import { cn, fmtDateTime, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct, fmtRelative } from "@/lib/utils";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Callout, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { VIZ } from "@/components/charts/format";
import { ScoreRing } from "@/components/data/score-ring";
import { DataTable, type Column } from "@/components/data/data-table";

export type FinancingDimensionKey =
  | "checklist"
  | "documents"
  | "applications"
  | "simulator";

const DIMENSIONS: {
  key: FinancingDimensionKey;
  label: string;
  shortDesc: string;
  icon: typeof Handshake;
}[] = [
  {
    key: "checklist",
    label: "Checklist & Skor Kesiapan",
    shortDesc: "9 indikator kesiapan teknis M&V, kualitas data & legalitas",
    icon: ClipboardCheck,
  },
  {
    key: "documents",
    label: "Dokumen Legal & Persetujuan",
    shortDesc: "Unggah NIB, NPWP, laporan keuangan & izin berbagi data",
    icon: ShieldCheck,
  },
  {
    key: "applications",
    label: "Pengajuan & Status Mitra",
    shortDesc: "Kirim paket data ke bank mitra & pantau status review",
    icon: Landmark,
  },
  {
    key: "simulator",
    label: "Simulator Kredit Hijau",
    shortDesc: "Simulasi cicilan bunga preferensial vs penghematan listrik",
    icon: Calculator,
  },
];

const STATUS_LABEL: Record<FinancingApplication["status"], string> = {
  submitted: "Baru diajukan",
  under_review: "Dalam peninjauan",
  info_requested: "Perlu info tambahan",
  approved_in_principle: "Disetujui prinsip",
  declined: "Tidak dilanjutkan",
};

const STATUS_TONE: Record<
  FinancingApplication["status"],
  "info" | "warning" | "brand" | "danger" | "neutral"
> = {
  submitted: "info",
  under_review: "neutral",
  info_requested: "warning",
  approved_in_principle: "brand",
  declined: "danger",
};

const DOC_META: {
  kind: "nib" | "npwp" | "financials";
  title: string;
  desc: string;
  sampleFile: string;
}[] = [
  {
    kind: "nib",
    title: "Nomor Induk Berusaha (NIB) Berbasis Risiko",
    desc: "Dokumen OSS RBA aktif yang mencantumkan KBLI industri manufaktur/fabrikasi.",
    sampleFile: "NIB_CV_Maju_Logam_Presisi_2026.pdf",
  },
  {
    kind: "npwp",
    title: "NPWP Badan Usaha & Konfirmasi Status Wajib Pajak",
    desc: "Kartu NPWP Badan atas nama perusahaan dan bukti lapor SPT Tahunan terakhir.",
    sampleFile: "NPWP_Badan_CV_Maju_Logam.pdf",
  },
  {
    kind: "financials",
    title: "Rekap Laporan Keuangan & Tagihan PLN 12 Bulan",
    desc: "Neraca/laba-rugi sederhana 12 bulan terakhir beserta rekap tagihan listrik bulanan.",
    sampleFile: "LapKeu_12Bulan_CV_Maju_Logam.pdf",
  },
];

const initialFormState: FormState = { ok: false };

export function FinancingDimensionsView({
  initialDim,
  readinessPct,
  items,
  consent,
  legalDocs,
  myApplications,
  greenScore,
  greenGrade,
  monthlyVerifiedSavingsIdr,
}: {
  initialDim: FinancingDimensionKey;
  readinessPct: number;
  items: ReadinessItem[];
  consent: ConsentState;
  legalDocs: { nib: string | null; npwp: string | null; financials: string | null };
  myApplications: FinancingApplication[];
  greenScore: number;
  greenGrade: string;
  monthlyVerifiedSavingsIdr: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDim = searchParams.get("dim") as FinancingDimensionKey | null;
  const [activeDim, setActiveDim] = useState<FinancingDimensionKey>(urlDim || initialDim);
  const [prevUrlDim, setPrevUrlDim] = useState<FinancingDimensionKey | null>(urlDim);
  if (urlDim !== prevUrlDim) {
    setPrevUrlDim(urlDim);
    if (
      urlDim &&
      (urlDim === "checklist" ||
        urlDim === "documents" ||
        urlDim === "applications" ||
        urlDim === "simulator")
    ) {
      setActiveDim(urlDim);
    }
  }

  // Checklist filter
  const [checkFilter, setCheckFilter] = useState<"all" | "done" | "pending">("all");

  // Pending transitions for server actions
  const [isPending, startTransition] = useTransition();

  // Application form state
  const [formState, formAction, formPending] = useActionState(
    submitApplication,
    initialFormState,
  );
  const [projectInput, setProjectInput] = useState(
    "Kapasitor bank otomatis 60 kVAr & VSD kompresor",
  );
  const [requestedInput, setRequestedInput] = useState("145000000");

  // Green Loan Simulator state
  const [loanPrincipalIdr, setLoanPrincipalIdr] = useState<number>(145_000_000);
  const [tenorMonths, setTenorMonths] = useState<number>(36);
  const [greenRatePct, setGreenRatePct] = useState<number>(7.5);
  const [simMonthlySavingsIdr, setSimMonthlySavingsIdr] = useState<number>(
    monthlyVerifiedSavingsIdr > 0 ? monthlyVerifiedSavingsIdr : 3_200_000,
  );

  function selectDimension(dim: FinancingDimensionKey) {
    setActiveDim(dim);
    const params = new URLSearchParams(searchParams.toString());
    if (dim === "checklist") params.delete("dim");
    else params.set("dim", dim);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const doneCount = items.filter((i) => i.done).length;
  const filteredItems = items.filter((i) => {
    if (checkFilter === "done") return i.done;
    if (checkFilter === "pending") return !i.done;
    return true;
  });

  // Annuity monthly installment helper
  function calcMonthlyInstallment(principal: number, annualRatePct: number, months: number) {
    const r = annualRatePct / 100 / 12;
    if (r <= 0) return principal / Math.max(1, months);
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  }

  const regularRatePct = 11.25;
  const greenInstallmentIdr = Math.round(
    calcMonthlyInstallment(loanPrincipalIdr, greenRatePct, tenorMonths),
  );
  const regularInstallmentIdr = Math.round(
    calcMonthlyInstallment(loanPrincipalIdr, regularRatePct, tenorMonths),
  );
  const totalInterestSavedIdr = Math.max(
    0,
    (regularInstallmentIdr - greenInstallmentIdr) * tenorMonths,
  );
  const selfFundingRatioPct =
    greenInstallmentIdr > 0 ? (simMonthlySavingsIdr / greenInstallmentIdr) * 100 : 0;
  const netMonthlyOutflowIdr = Math.max(0, greenInstallmentIdr - simMonthlySavingsIdr);

  const appColumns: Column<FinancingApplication>[] = [
    {
      key: "id",
      header: "ID & Waktu Pengajuan",
      render: (a) => (
        <div>
          <div className="font-mono text-xs font-semibold text-ink">{a.id}</div>
          <div className="text-xs text-ink-muted">{fmtRelative(a.submittedAt)}</div>
        </div>
      ),
    },
    {
      key: "project",
      header: "Proyek Efisiensi Energi",
      render: (a) => (
        <div>
          <div className="font-medium text-ink">{a.project}</div>
          <div className="text-xs text-ink-muted">Mitra: {a.partner}</div>
        </div>
      ),
    },
    {
      key: "requestedIdr",
      header: "Nilai Pengajuan",
      align: "right",
      sortValue: (a) => a.requestedIdr,
      render: (a) => (
        <span className="font-semibold text-ink tabular-nums">
          {fmtIdr(a.requestedIdr)}
        </span>
      ),
    },
    {
      key: "metrics",
      header: "Metrik Terlampir",
      render: (a) => (
        <div className="text-xs text-ink-muted">
          Green Score <strong className="text-ink">{a.greenScore}</strong> · Kesiapan{" "}
          <strong className="text-ink">{a.readinessPct}%</strong>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Bank Mitra",
      render: (a) => (
        <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
      ),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Multi-Dimensional Selector Bar */}
      <section aria-label="Dimensi kesiapan pembiayaan hijau">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="brand">Multi-Dimensi Green Financing</Badge>
            <span className="text-xs text-ink-muted">
              Pilih dimensi untuk memeriksa checklist kesiapan, dokumen legal &amp; persetujuan, pengajuan ke mitra, atau simulasi cicilan:
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            Kelengkapan syarat: <strong className="text-ink">{doneCount} dari {items.length} item ({readinessPct}%)</strong>
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
      {/* DIMENSION 1: CHECKLIST & SKOR KESIAPAN                           */}
      {/* ================================================================ */}
      {activeDim === "checklist" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader
              title="Checklist Kesiapan Pembiayaan Hijau (9 Kriteria)"
              subtitle="Kriteria teknis energi, verifikasi M&V, dan dokumen administrasi yang dievaluasi oleh bank mitra"
              actions={
                <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
                  {(
                    [
                      { k: "all", l: `Semua (${items.length})` },
                      { k: "done", l: `Selesai (${doneCount})` },
                      { k: "pending", l: `Belum (${items.length - doneCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.k}
                      type="button"
                      onClick={() => setCheckFilter(tab.k)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition-colors",
                        checkFilter === tab.k
                          ? "bg-surface-raised text-ink shadow-2xs"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {tab.l}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody className="divide-y divide-border-subtle">
              {filteredItems.map((item) => {
                const isDocOrConsent =
                  item.key === "nib" ||
                  item.key === "npwp" ||
                  item.key === "financials" ||
                  item.key === "consent";
                return (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      {item.done ? (
                        <CheckCircle2
                          className="mt-0.5 size-5 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                      ) : (
                        <Clock
                          className="mt-0.5 size-5 shrink-0 text-amber-600"
                          aria-hidden
                        />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{item.label}</span>
                          <Badge tone={item.done ? "success" : "warning"}>
                            {item.done ? "Terpenuhi" : "Perlu dilengkapi"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
                      </div>
                    </div>

                    <div>
                      {isDocOrConsent ? (
                        <Button
                          type="button"
                          variant={item.done ? "ghost" : "secondary"}
                          size="sm"
                          onClick={() => selectDimension("documents")}
                        >
                          {item.done ? "Kelola Dokumen →" : "Lengkapi Sekarang →"}
                        </Button>
                      ) : (
                        <Link
                          href={item.href}
                          className="text-xs font-semibold text-brand-800 hover:underline"
                        >
                          Lihat Bukti Data →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <div className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader
                title="Indeks Kesiapan Berkas"
                subtitle="Kesiapan paket data untuk ditinjau analis kredit"
                actions={<Badge tone="brand">{readinessPct}% Siap</Badge>}
              />
              <CardBody className="flex flex-col items-center text-center">
                <ScoreRing value={readinessPct} size={144} />
                <div className="mt-3 font-display text-base font-semibold text-ink">
                  {readinessPct >= 85
                    ? "Siap Penuh untuk Pengajuan Cepat"
                    : readinessPct >= 70
                      ? "Layak Diajukan (Lengkapi sisa dokumen)"
                      : "Perlu Melengkapi Dokumen Administrasi"}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Unggah NPWP dan laporan keuangan sederhana pada tab{" "}
                  <strong>Dokumen Legal &amp; Persetujuan</strong> untuk menaikkan kesiapan menjadi{" "}
                  <strong>100%</strong>.
                </p>
                <div className="mt-4 flex w-full flex-col gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => selectDimension("documents")}
                  >
                    <FileUp className="size-4" aria-hidden />
                    Lengkapi Dokumen Legal (100%)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => selectDimension("applications")}
                  >
                    <Send className="size-4" aria-hidden />
                    Ajukan Paket Data ke Bank Mitra
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 2: DOKUMEN LEGAL & PERSETUJUAN (CONSENT)               */}
      {/* ================================================================ */}
      {activeDim === "documents" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              title="Brankas Dokumen Legalitas & Keuangan (Demo)"
              subtitle="Dalam mode demo, sistem hanya mencatat nama berkas tanpa mengunggah dokumen rahasia ke server publik"
              icon={<FileCheck2 className="size-4" />}
            />
            <CardBody className="divide-y divide-border-subtle">
              {DOC_META.map((doc) => {
                const currentFile = legalDocs[doc.kind];
                return (
                  <div
                    key={doc.kind}
                    className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-ink">{doc.title}</h4>
                        {currentFile ? (
                          <Badge tone="success">Tercatat: {currentFile}</Badge>
                        ) : (
                          <Badge tone="warning">Belum diunggah</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{doc.desc}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {currentFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await setLegalDoc(doc.kind, null);
                            })
                          }
                        >
                          <Trash2 className="size-3.5 text-danger" aria-hidden />
                          Hapus
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await setLegalDoc(doc.kind, doc.sampleFile);
                            })
                          }
                        >
                          <FileUp className="size-3.5" aria-hidden />
                          Lampirkan Berkas Contoh
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
            <CardFooter className="text-xs text-ink-muted">
              Seluruh perubahan dokumen langsung memperbarui persentase kesiapan pada sidebar.
            </CardFooter>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title="Persetujuan Berbagi Data (Data Consent)"
              subtitle={`Kendali penuh akses data untuk ${consent.partner}`}
              icon={<Lock className="size-4" />}
              actions={
                <Badge tone={consent.granted ? "success" : "danger"}>
                  {consent.granted ? "Akses Diizinkan" : "Akses Dicabut"}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5 text-xs">
                <div className="font-semibold text-ink">Cakupan data yang dibagikan ke mitra:</div>
                <ul className="mt-2 space-y-1.5 text-ink-muted">
                  {consent.scope.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                {consent.grantedAt && (
                  <p className="mt-3 border-t border-border-subtle pt-2 text-[11px] text-ink-muted">
                    Persetujuan aktif sejak: <strong>{fmtDateTime(consent.grantedAt)} WIB</strong>
                  </p>
                )}
              </div>

              <Callout tone={consent.granted ? "brand" : "warning"}>
                {consent.granted
                  ? "Analis Bank Mitra (Demo) saat ini dapat melihat profil kesiapan dan metrik M&V terverifikasi usaha Anda di Portal Bank."
                  : "Anda telah mencabut akses. Profil usaha Anda disembunyikan dari antrean Portal Bank Mitra."}
              </Callout>

              <Button
                type="button"
                variant={consent.granted ? "danger" : "primary"}
                size="sm"
                className="w-full"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await setConsent(!consent.granted);
                  })
                }
              >
                {consent.granted
                  ? "Cabut Persetujuan Berbagi Data"
                  : "Berikan Persetujuan Berbagi Data"}
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 3: PENGAJUAN & STATUS MITRA                            */}
      {/* ================================================================ */}
      {activeDim === "applications" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader
              title="Kirim Pengajuan Pembiayaan Efisiensi"
              subtitle="Paket data teknis M&V dan Green Score akan dilampirkan otomatis"
              icon={<Send className="size-4" />}
            />
            <CardBody>
              <form action={formAction} className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectInput("Kapasitor bank otomatis 60 kVAr & VSD kompresor");
                      setRequestedInput("145000000");
                    }}
                    className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink hover:border-brand-300"
                  >
                    Preset: Kapasitor &amp; VSD (Rp145 jt)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectInput("Instalasi PLTS Atap On-Grid 25 kWp");
                      setRequestedInput("285000000");
                    }}
                    className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink hover:border-brand-300"
                  >
                    Preset: PLTS Atap 25 kWp (Rp285 jt)
                  </button>
                </div>

                <Field
                  label="Nama Proyek Konservasi Energi / Dekarbonisasi"
                  htmlFor="fin-project"
                  error={formState.fieldErrors?.project}
                >
                  <Input
                    id="fin-project"
                    name="project"
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    placeholder="Contoh: Retrofit inverter kompresor & perbaikan insulasi oven"
                    required
                  />
                </Field>

                <Field
                  label="Nilai Pembiayaan yang Diajukan (Rp)"
                  htmlFor="fin-amount"
                  hint={`Format angka, misal 145000000 (${fmtIdr(Number(requestedInput) || 0)})`}
                  error={formState.fieldErrors?.requestedIdr}
                >
                  <Input
                    id="fin-amount"
                    name="requestedIdr"
                    type="number"
                    min={10_000_000}
                    max={5_000_000_000}
                    step={5_000_000}
                    value={requestedInput}
                    onChange={(e) => setRequestedInput(e.target.value)}
                    required
                  />
                </Field>

                {formState.message && (
                  <Callout tone={formState.ok ? "brand" : "danger"}>
                    {formState.message}
                  </Callout>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={formPending || !consent.granted}
                >
                  <Send className="size-4" aria-hidden />
                  {formPending ? "Mengirim Paket Data…" : "Kirim Paket Data ke Bank Mitra"}
                </Button>
                {!consent.granted && (
                  <p className="text-center text-xs text-danger">
                    Aktifkan persetujuan berbagi data pada tab Dokumen terlebih dahulu.
                  </p>
                )}
              </form>
            </CardBody>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader
              title="Status Pengajuan Pembiayaan Anda"
              subtitle="Terhubung langsung dengan antrean tinjauan di Portal Bank Mitra"
              actions={<Badge tone="brand">{myApplications.length} Pengajuan</Badge>}
            />
            <CardBody className="p-0">
              <DataTable
                rows={myApplications}
                columns={appColumns}
                getRowId={(a) => a.id}
                caption="Daftar pengajuan pembiayaan hijau usaha Anda"
                emptyTitle="Belum ada pengajuan pembiayaan."
              />
            </CardBody>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <span>
                Ingin melihat tampilan dari sisi analis bank? Gunakan pemilih portal di kiri atas untuk beralih ke <strong>Portal Bank Mitra</strong>.
              </span>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* DIMENSION 4: SIMULATOR KREDIT HIJAU                              */}
      {/* ================================================================ */}
      {activeDim === "simulator" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader
              title="Parameter Pinjaman Capex Hijau"
              subtitle="Bandingkan cicilan bulanan terhadap penghematan tagihan listrik"
              icon={<SlidersHorizontal className="size-4" />}
            />
            <CardBody className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="loan-amt" className="text-ink">
                    Plafon Pinjaman Proyek (CAPEX)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {fmtIdr(loanPrincipalIdr)}
                  </span>
                </div>
                <input
                  id="loan-amt"
                  type="range"
                  min={50_000_000}
                  max={800_000_000}
                  step={15_000_000}
                  value={loanPrincipalIdr}
                  onChange={(e) => setLoanPrincipalIdr(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="loan-tenor" className="text-ink">
                    Tenor Pembiayaan
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {tenorMonths} bulan ({fmtNumber(tenorMonths / 12, 1)} thn)
                  </span>
                </div>
                <input
                  id="loan-tenor"
                  type="range"
                  min={12}
                  max={60}
                  step={6}
                  value={tenorMonths}
                  onChange={(e) => setTenorMonths(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="loan-rate" className="text-ink">
                    Suku Bunga Preferensial Hijau (% p.a.)
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {fmtPct(greenRatePct, 1)} p.a. (vs Reguler 11,3%)
                  </span>
                </div>
                <input
                  id="loan-rate"
                  type="range"
                  min={6.0}
                  max={11.0}
                  step={0.25}
                  value={greenRatePct}
                  onChange={(e) => setGreenRatePct(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <label htmlFor="loan-sav" className="text-ink">
                    Estimasi Penghematan Listrik / Bulan
                  </label>
                  <span className="font-mono font-semibold text-brand-800">
                    {fmtIdr(simMonthlySavingsIdr)}/bln
                  </span>
                </div>
                <input
                  id="loan-sav"
                  type="range"
                  min={1_000_000}
                  max={15_000_000}
                  step={250_000}
                  value={simMonthlySavingsIdr}
                  onChange={(e) => setSimMonthlySavingsIdr(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-700"
                />
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader
              title="Analisis Kemampuan Bayar dari Penghematan Energi (Self-Funding)"
              subtitle={`Skor Anda (${greenScore} · Grade ${greenGrade}) memenuhi syarat skema bunga preferensial`}
              actions={<ProvenanceBadge kind="estimated" />}
            />
            <CardBody className="space-y-5">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                  <div className="text-xs font-medium text-brand-900">
                    Cicilan Kredit Hijau / Bulan
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-brand-950 tabular-nums">
                    {fmtIdrCompact(greenInstallmentIdr)}
                  </div>
                  <div className="mt-1 text-[11px] text-brand-800">
                    {fmtIdr(greenInstallmentIdr)} / bln
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="text-xs font-medium text-emerald-900">
                    Rasio Tertutup Penghematan
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-emerald-950 tabular-nums">
                    {fmtPct(selfFundingRatioPct, 0)}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-800">
                    {selfFundingRatioPct >= 100
                      ? "100% cicilan tertutup hemat listrik!"
                      : `Sisa beban kas: ${fmtIdrCompact(netMonthlyOutflowIdr)}/bln`}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                  <div className="text-xs font-medium text-ink-muted">
                    Hemat Beban Bunga Total
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-ink tabular-nums">
                    {fmtIdrCompact(totalInterestSavedIdr)}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-muted">
                    Selama {tenorMonths} bulan vs kredit reguler
                  </div>
                </div>
              </div>

              <HorizontalBarChart
                ariaLabel="Perbandingan cicilan bulanan dengan penghematan listrik"
                unit="idr"
                height={190}
                data={[
                  {
                    name: "Cicilan Kredit Reguler / bln",
                    value: regularInstallmentIdr,
                    color: VIZ.gray,
                  },
                  {
                    name: "Cicilan Kredit Hijau / bln",
                    value: greenInstallmentIdr,
                    color: VIZ.navy,
                  },
                  {
                    name: "Penghematan Listrik / bln",
                    value: simMonthlySavingsIdr,
                    color: VIZ.green,
                  },
                ]}
              />

              <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5 text-xs text-ink-muted">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>Cakupan Penghematan Energi terhadap Cicilan (Energy Savings Coverage)</span>
                  <span>{fmtPct(Math.min(100, selfFundingRatioPct), 0)}</span>
                </div>
                <div className="mt-2">
                  <Progress
                    value={Math.min(100, selfFundingRatioPct)}
                    tone="brand"
                    label="Rasio penghematan energi terhadap cicilan"
                  />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="size-3.5 text-brand-700" aria-hidden />
                  Simulasi ini bersifat indikatif; persetujuan kredit, suku bunga, dan agunan ditetapkan oleh bank mitra.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
