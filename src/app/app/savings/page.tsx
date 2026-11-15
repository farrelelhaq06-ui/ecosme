import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BadgeCheck,
  Bolt,
  Factory,
  FileText,
  GitCompareArrows,
  Leaf,
  PiggyBank,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getIkmContext, getSavings } from "@/lib/services/ikm";
import { fmtDate, fmtDateTime, fmtIdrCompact, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { MascotAvatar } from "@/components/brand/logo";
import {
  SavingsDimensionsView,
  type SavingsDimensionKey,
} from "@/app/app/savings/savings-dimensions";

export const metadata: Metadata = { title: "Penghematan (M&V)" };

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const [ctx, s] = await Promise.all([getIkmContext(), getSavings()]);

  const initialDim: SavingsDimensionKey =
    sp.dim === "baseline" || sp.dim === "measures" || sp.dim === "simulator"
      ? sp.dim
      : "verification";

  const effectiveRateIdr =
    ctx.tariff.baseRateIdrPerKwh * (1 + 0.22 * (ctx.tariff.peakMultiplier - 1));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Penghematan (M&V)"
        description={
          <>
            Pengukuran &amp; Verifikasi penghematan energi berbasis regresi produksi harian (IPMVP Opsi C). Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/app/reports" variant="secondary" size="sm">
              <FileText className="size-4" aria-hidden />
              Ekspor Paket M&amp;V
            </ButtonLink>
          </div>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Penghematan energi dihitung dari selisih antara konsumsi aktual terhadap model regresi baseline terstandar pada kondisi volume produksi periode pelaporan. Hanya periode yang telah ditinjau yang berstatus <strong>Terverifikasi</strong>.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama penghematan M&V" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Penghematan Terverifikasi"
          value={s.verified ? fmtIdrCompact(s.verified.idr) : "Rp0"}
          provenance={s.verified ? "verified" : "estimated"}
          icon={<PiggyBank />}
          footnote={
            s.verified
              ? `${fmtNumber(s.verified.kwh, 0)} kWh (${fmtPct(s.verified.pct, 1)}) · ${s.verified.periods} periode M&V s.d. ${fmtDate(s.verified.lastPeriodEnd)}`
              : "Menunggu verifikasi periode pertama"
          }
        />
        <KpiCard
          label="Total Penghematan Terhitung"
          value={s.calculated ? fmtIdrCompact(s.calculated.idr) : "Rp0"}
          provenance="estimated"
          icon={<Bolt />}
          footnote={
            s.calculated
              ? `${fmtNumber(s.calculated.kwh, 0)} kWh terhindarkan · ${s.calculated.periods} periode tutup buku`
              : "Belum ada periode selesai"
          }
        />
        <KpiCard
          label="Emisi CO₂e Terhindarkan"
          value={
            s.calculated
              ? `${fmtNumber(s.calculated.emissionKg / 1000, 2)} tCO₂e`
              : "0 tCO₂e"
          }
          provenance="estimated"
          icon={<Leaf />}
          footnote={`${fmtNumber(s.calculated?.emissionKg ?? 0, 0)} kg CO₂e · faktor grid ${fmtNumber(ctx.tariff.emissionFactorKgPerKwh, 2)} kg/kWh`}
        />
        <KpiCard
          label="Kualitas Model Baseline"
          value={s.baseline ? `R² ${fmtNumber(s.baseline.r2, 2)}` : "—"}
          unit={s.baseline ? `CV ${fmtPct(s.baseline.cvRmsePct, 1)}` : undefined}
          provenance="verified"
          icon={s.adequacy?.ok ? <BadgeCheck /> : <GitCompareArrows />}
          accent
          footnote={
            s.adequacy
              ? s.adequacy.ok
                ? `Memenuhi ambang IPMVP (${s.baseline?.days ?? 0} hari baseline)`
                : "Perlu peninjauan regresi baseline"
              : "Model baseline belum tersedia"
          }
        />
      </section>

      <Suspense fallback={null}>
        <SavingsDimensionsView
          initialDim={initialDim}
          measure={s.measure}
          planned={s.planned}
          baseline={s.baseline}
          adequacy={s.adequacy}
          periods={s.periods}
          daily={s.daily}
          verified={s.verified}
          calculated={s.calculated}
          machines={ctx.machines.map((m) => ({ id: m.id, name: m.name }))}
          tariffRateIdr={Math.round(effectiveRateIdr)}
          emissionFactor={ctx.tariff.emissionFactorKgPerKwh}
          productUnit={ctx.business.productUnit}
        />
      </Suspense>
    </>
  );
}
