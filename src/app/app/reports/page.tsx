import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BadgeCheck,
  DatabaseZap,
  Factory,
  FileSpreadsheet,
  FileText,
  Handshake,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getGreenScore,
  getIkmContext,
  getSavings,
  loadWindow,
  resolveAnyRange,
} from "@/lib/services/ikm";
import { getReadiness } from "@/lib/services/platform";
import { breakdownByMachine, computeTotals, dailyIntensity } from "@/lib/calc/energy";
import { store } from "@/lib/store/platform-store";
import { fmtDateTime, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { MascotAvatar } from "@/components/brand/logo";
import {
  ReportsDimensionsView,
  type ExportDailyRow,
  type ExportMachineRow,
  type ReportsDimensionKey,
} from "@/app/app/reports/reports-dimensions";

export const metadata: Metadata = { title: "Laporan" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, savings, green, readiness] = await Promise.all([
    getIkmContext(),
    getSavings(),
    getGreenScore(),
    getReadiness(),
  ]);

  const initialDim: ReportsDimensionKey =
    sp.dim === "preview" || sp.dim === "export" || sp.dim === "history"
      ? sp.dim
      : "packages";

  const range30d = resolveAnyRange(ctx, { range: "30d" });
  const w = await loadWindow(ctx, range30d);
  const totals = computeTotals(w.readings, ctx.tariff);
  const ef = ctx.tariff.emissionFactorKgPerKwh;

  const breakdown = breakdownByMachine(w.readings, ctx.machines, ctx.tariff);
  const machineRows: ExportMachineRow[] = breakdown.map((b) => ({
    machineId: b.machineId,
    name: b.name,
    kwh: b.kwh,
    costIdr: b.costIdr,
    emissionKg: Math.round(b.kwh * ef * 10) / 10,
    sharePct: b.share * 100,
    avgPf: b.avgPowerFactor,
    runHours: b.runHours,
  }));

  const dailyRows: ExportDailyRow[] = dailyIntensity(w.readings, w.production).map((d) => ({
    date: d.date,
    kwh: d.kwh,
    units: d.units,
    intensity: d.intensity,
    emissionKg: Math.round(d.kwh * ef * 10) / 10,
  }));

  const completenessPct = green.current.inputs.completeness * 100;
  const verifiedPeriodsCount = savings.periods.filter((p) => p.status === "verified").length;
  const auditLogs = store().audit;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Pusat Laporan & Ekspor Data"
        description={
          <>
            Unduh bundel laporan resmi berstandar IPMVP Opsi C, ringkasan eksekutif kesiapan pembiayaan hijau, dan dataset CSV mentah. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={
          <ButtonLink href="/app/financing" variant="secondary" size="sm">
            <Handshake className="size-4" aria-hidden />
            Ke Kesiapan Pembiayaan
          </ButtonLink>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Seluruh laporan PDF (siap cetak) dan berkas CSV di bawah ini dihasilkan secara dinamis dari dataset demonstrasi usaha Anda.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama pusat laporan dan ekspor" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Bundel Laporan Resmi"
          value="4"
          unit="paket standar"
          provenance="verified"
          icon={<FileText />}
          footnote="Dossier Bank, M&V IPMVP, ESG Scope 2 & Audit IoT"
        />
        <KpiCard
          label="Periode M&V Terverifikasi"
          value={`${verifiedPeriodsCount}`}
          unit={`dari ${savings.periods.length} periode`}
          provenance={verifiedPeriodsCount > 0 ? "verified" : "estimated"}
          icon={<BadgeCheck />}
          footnote={
            savings.verified
              ? `Total hemat terverifikasi ${fmtIdrCompact(savings.verified.idr)}`
              : "Menunggu verifikasi periode pertama"
          }
        />
        <KpiCard
          label="Integritas Data 30 Hari"
          value={fmtPct(completenessPct, 1)}
          unit="lengkap"
          provenance="simulated"
          icon={<DatabaseZap />}
          footnote={`${fmtNumber(totals.kwh, 0)} kWh tercatat di ${machineRows.length} mesin`}
        />
        <KpiCard
          label="Status Dossier Bank"
          value={`${readiness.pct}%`}
          unit={`Skor ${green.current.result.total} (${green.current.result.grade})`}
          provenance="verified"
          icon={<FileSpreadsheet />}
          accent
          footnote="Siap diunduh atau dibagikan ke Bank Mitra"
        />
      </section>

      <Suspense fallback={null}>
        <ReportsDimensionsView
          initialDim={initialDim}
          business={ctx.business}
          tariff={ctx.tariff}
          green={green.current.result}
          readinessPct={readiness.pct}
          completenessPct={completenessPct}
          totalKwh30d={totals.kwh}
          totalCostIdr30d={totals.costIdr}
          totalEmissionKg30d={totals.emissionKg}
          measureName={savings.measure?.name ?? "Optimasi Kompresor & Faktor Daya"}
          baseline={savings.baseline}
          periods={savings.periods}
          machineRows={machineRows}
          dailyRows={dailyRows}
          auditLogs={auditLogs}
        />
      </Suspense>
    </>
  );
}
