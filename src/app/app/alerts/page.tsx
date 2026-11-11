import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Factory, ShieldAlert, Siren } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAlerts, getIkmContext, measuredProvenance } from "@/lib/services/ikm";
import { RANGE_OPTIONS } from "@/lib/time";
import { fmtDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RangeSelect } from "@/components/filters/filters";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { MascotAvatar } from "@/components/brand/logo";
import {
  AlertsDimensionsView,
  type AlertsDimensionKey,
} from "@/app/app/alerts/alerts-dimensions";

export const metadata: Metadata = { title: "Peringatan" };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, alertsData] = await Promise.all([getIkmContext(), getAlerts()]);
  const prov = measuredProvenance(ctx);

  const initialDim: AlertsDimensionKey =
    sp.dim === "category" || sp.dim === "rules" ? sp.dim : "active";

  const criticalOpen = alertsData.open.filter((a) => a.severity === "critical").length;
  const warningOpen = alertsData.open.filter((a) => a.severity === "warning").length;
  const ackedCount = alertsData.all.filter((a) => a.acknowledged).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Peringatan"
        description={
          <>
            Deteksi anomali beban, faktor daya rendah, dan status perangkat untuk{" "}
            <strong className="font-semibold text-ink">7 hari terakhir</strong>. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={<RangeSelect value="7d" options={RANGE_OPTIONS} />}
      />

      {ctx.mode === "demo" && (
        <Callout tone="info" icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />} className="mb-6">
          <strong>Lingkungan DEMO.</strong> Seluruh pembacaan energi pada dashboard ini adalah data simulasi untuk usaha fiktif dan bukan pembacaan sensor nyata.
          Biaya dan emisi merupakan estimasi berdasarkan asumsi yang dapat diubah di Pengaturan.
        </Callout>
      )}

      {/* Top KPI Summary */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Peringatan Aktif"
          icon={<Siren />}
          value={alertsData.open.length}
          unit="terbuka"
          provenance={prov}
          footnote={`Dari total ${alertsData.all.length} terdeteksi (7 hari)`}
        />
        <KpiCard
          label="Prioritas Kritis"
          icon={<ShieldAlert />}
          value={criticalOpen}
          unit="kritis"
          provenance={prov}
          footnote={criticalOpen > 0 ? "Memerlukan pemeriksaan segera" : "Tidak ada anomali kritis"}
        />
        <KpiCard
          label="Level Peringatan"
          icon={<AlertTriangle />}
          value={warningOpen}
          unit="peringatan"
          provenance={prov}
          footnote="Efisiensi & jadwal operasional"
        />
        <KpiCard
          accent
          label="Sudah Ditangani"
          icon={<CheckCircle2 />}
          value={ackedCount}
          unit="selesai"
          provenance={prov}
          footnote="Tercatat pada log audit fasilitas"
        />
      </div>

      <Suspense fallback={null}>
        <AlertsDimensionsView
          initialDim={initialDim}
          focusId={sp.focus}
          alerts={alertsData.all}
          machines={ctx.machines.map((m) => ({
            id: m.id,
            name: m.name,
            location: m.location,
          }))}
        />
      </Suspense>
    </>
  );
}
