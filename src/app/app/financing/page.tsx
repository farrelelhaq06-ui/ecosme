import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ClipboardCheck,
  Factory,
  FileText,
  Gauge,
  Landmark,
  PiggyBank,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getGreenScore, getIkmContext, getSavings } from "@/lib/services/ikm";
import { getReadiness, STATUS_LABEL } from "@/lib/services/platform";
import { store } from "@/lib/store/platform-store";
import { fmtDateTime, fmtIdrCompact } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { MascotAvatar } from "@/components/brand/logo";
import {
  FinancingDimensionsView,
  type FinancingDimensionKey,
} from "@/app/app/financing/financing-dimensions";

export const metadata: Metadata = { title: "Kesiapan Pembiayaan" };

export default async function FinancingReadinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, readiness, green, savings] = await Promise.all([
    getIkmContext(),
    getReadiness(),
    getGreenScore(),
    getSavings(),
  ]);

  const initialDim: FinancingDimensionKey =
    sp.dim === "documents" || sp.dim === "applications" || sp.dim === "simulator"
      ? sp.dim
      : "checklist";

  const s = store();
  const monthlyVerifiedIdr = savings.verified
    ? Math.round(savings.verified.idr / Math.max(1, savings.verified.periods))
    : 0;

  const myApplications = s.applications
    .filter((a) => a.businessId === ctx.business.id)
    .map((a) => ({
      ...a,
      greenScore: green.current.result.total,
      readinessPct: readiness.pct,
      verifiedSavingsIdr: monthlyVerifiedIdr || null,
    }));

  const latestApp = myApplications[0] ?? null;
  const doneCount = readiness.items.filter((i) => i.done).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Kesiapan Pembiayaan Hijau"
        description={
          <>
            Persiapan paket data teknis M&amp;V, dokumen legalitas, dan persetujuan berbagi data untuk pengajuan pembiayaan efisiensi energi ke lembaga keuangan mitra. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={
          <ButtonLink href="/app/reports" variant="secondary" size="sm">
            <FileText className="size-4" aria-hidden />
            Unduh Paket Laporan Bank
          </ButtonLink>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> EcoSME bukan lembaga keuangan dan tidak menyalurkan kredit. Modul ini mengemas metrik efisiensi terverifikasi agar IKM siap mengajukan pembiayaan ke bank mitra dengan proses <em>due diligence</em> yang lebih cepat.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama kesiapan pembiayaan hijau" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Indeks Kesiapan Berkas"
          value={`${readiness.pct}%`}
          unit={`${doneCount}/${readiness.items.length} syarat`}
          provenance="estimated"
          icon={<ClipboardCheck />}
          footnote={
            readiness.pct >= 80
              ? "Memenuhi syarat pengajuan ke bank mitra"
              : "Lengkapi dokumen legal untuk mencapai 100%"
          }
        />
        <KpiCard
          label="EcoSME Green Score"
          value={`${green.current.result.total}`}
          unit={`/ 100 · ${green.current.result.grade}`}
          provenance="estimated"
          icon={<Gauge />}
          footnote="Ambang minimum bank mitra ≥ 65 poin (Grade B)"
        />
        <KpiCard
          label="Kapasitas Hemat Terverifikasi"
          value={monthlyVerifiedIdr > 0 ? fmtIdrCompact(monthlyVerifiedIdr) : "Rp0"}
          unit="/ bulan"
          provenance={savings.verified ? "verified" : "estimated"}
          icon={<PiggyBank />}
          footnote="Arus kas penghematan listrik untuk menutup cicilan"
        />
        <KpiCard
          label="Status Pengajuan Mitra"
          value={latestApp ? STATUS_LABEL[latestApp.status] : "Belum Diajukan"}
          provenance="verified"
          icon={<Landmark />}
          accent
          footnote={
            latestApp
              ? `${latestApp.id} · ${fmtIdrCompact(latestApp.requestedIdr)} ke ${latestApp.partner}`
              : "Siap dikirim ke Bank Mitra (Demo)"
          }
        />
      </section>

      <Suspense fallback={null}>
        <FinancingDimensionsView
          initialDim={initialDim}
          readinessPct={readiness.pct}
          items={readiness.items}
          consent={readiness.consent}
          legalDocs={readiness.legalDocs}
          myApplications={myApplications}
          greenScore={green.current.result.total}
          greenGrade={green.current.result.grade}
          monthlyVerifiedSavingsIdr={monthlyVerifiedIdr}
        />
      </Suspense>
    </>
  );
}
