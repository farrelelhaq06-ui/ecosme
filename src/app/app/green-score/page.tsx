import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Award,
  Factory,
  Gauge,
  Handshake,
  Sparkles,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getGreenScore, getIkmContext } from "@/lib/services/ikm";
import { gradeLabel } from "@/lib/calc/green-score";
import { GREEN_SCORE_DISCLAIMER } from "@/lib/config";
import { fmtDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { MascotAvatar } from "@/components/brand/logo";
import {
  GreenScoreDimensionsView,
  type GreenScoreDimensionKey,
} from "@/app/app/green-score/green-score-dimensions";

export const metadata: Metadata = { title: "Green Score" };

export default async function GreenScorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, g] = await Promise.all([getIkmContext(), getGreenScore()]);

  const initialDim: GreenScoreDimensionKey =
    sp.dim === "history" || sp.dim === "simulator" || sp.dim === "methodology"
      ? sp.dim
      : "breakdown";

  const res = g.current.result;
  const inputs = g.current.inputs;
  const sortedComps = [...res.components].sort((a, b) => b.score - a.score);
  const bestComp = sortedComps[0];
  const weakestComp = sortedComps[sortedComps.length - 1];
  const weightSum = res.components.reduce((s, c) => s + c.weight, 0) || 1;
  const potentialGainPts = weakestComp
    ? Math.round(((100 - weakestComp.score) * weakestComp.weight) / weightSum)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="EcoSME Green Score"
        description={
          <>
            Indikator kesiapan teknis dan efisiensi energi berbasis 5 komponen terukur untuk{" "}
            <strong className="font-semibold text-ink">{res.periodLabel}</strong>. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={
          <ButtonLink href="/app/financing" variant="primary" size="sm">
            <Handshake className="size-4" aria-hidden />
            Cek Kesiapan Pembiayaan
          </ButtonLink>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> {GREEN_SCORE_DISCLAIMER}
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama EcoSME Green Score" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="EcoSME Green Score"
          value={`${res.total}`}
          unit={`/ 100 · ${res.grade}`}
          provenance="estimated"
          icon={<Gauge />}
          footnote={`${gradeLabel(res.grade)} · evaluasi ${res.periodLabel}`}
        />
        <KpiCard
          label="Komponen Terkuat"
          value={bestComp ? `${bestComp.score}` : "—"}
          unit="/ 100"
          provenance="estimated"
          icon={<Award />}
          footnote={
            bestComp
              ? `${bestComp.label} (${bestComp.rawValue})`
              : "Data komponen belum tersedia"
          }
        />
        <KpiCard
          label="Potensi Kenaikan Terbesar"
          value={`+${potentialGainPts}`}
          unit="poin"
          provenance="estimated"
          icon={<Sparkles />}
          footnote={
            weakestComp
              ? `Dari ${weakestComp.label} (skor saat ini ${weakestComp.score}/100)`
              : "Optimasi komponen"
          }
        />
        <KpiCard
          label="Target Peringkat A"
          value={res.total >= 80 ? "Tercapai" : `+${80 - res.total} poin`}
          unit={res.total >= 80 ? "Tier 1" : "menuju 80"}
          provenance="verified"
          icon={<Handshake />}
          accent
          footnote={
            res.total >= 65
              ? "Sudah melampaui ambang minimum bank mitra (≥ 65 poin)"
              : "Tingkatkan skor ke ≥ 65 untuk syarat pembiayaan hijau"
          }
        />
      </section>

      <Suspense fallback={null}>
        <GreenScoreDimensionsView
          initialDim={initialDim}
          result={res}
          weights={ctx.weights}
          history={g.history}
          initialInputs={{
            intensityImprovementPct: Math.max(0, inputs.intensityImprovementPct ?? 0),
            verifiedSavingsPct: Math.max(0, inputs.verifiedSavingsPct ?? 0),
            completenessPct: Math.max(85, inputs.completeness * 100),
            peakSharePct: Math.min(40, Math.max(10, inputs.peakShare * 100)),
            avgPowerFactor: Math.min(0.98, Math.max(0.75, inputs.avgPowerFactor ?? 0.85)),
          }}
          sectorName={ctx.business.sector}
        />
      </Suspense>
    </>
  );
}
