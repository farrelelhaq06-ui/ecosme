import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, Siren } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAlerts, getIkmContext, measuredProvenance } from "@/lib/services/ikm";
import { fmtDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
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
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" aria-hidden /> Deteksi Anomali Berbasis Aturan (7 Hari Terakhir)
          </span>
        }
        title="Peringatan & Tindak Lanjut Operasional"
        description={
          <>
            Pemantauan otomatis beban lebih, faktor daya rendah, konsumsi di luar jam operasional, dan konektivitas sensor s.d.{" "}
            <strong className="font-semibold text-ink">{fmtDateTime(alertsData.window.to)} WIB</strong>.
          </>
        }
      />

      {/* Top KPI Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
