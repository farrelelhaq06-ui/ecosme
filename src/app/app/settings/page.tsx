import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Building2,
  Factory,
  Leaf,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getIkmContext } from "@/lib/services/ikm";
import { store } from "@/lib/store/platform-store";
import { fmtDateTime, fmtIdr, fmtNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { MascotAvatar } from "@/components/brand/logo";
import {
  SettingsDimensionsView,
  type SettingsDimensionKey,
} from "@/app/app/settings/settings-dimensions";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireRole("ikm");
  const sp = await searchParams;
  const ctx = await getIkmContext();

  const initialDim: SettingsDimensionKey =
    sp.dim === "tariff" || sp.dim === "targets" || sp.dim === "governance"
      ? sp.dim
      : "profile";

  const s = store();
  const teamUsers = s.users.filter((u) => u.organization === ctx.business.name);
  const wbpRateIdr = Math.round(ctx.tariff.baseRateIdrPerKwh * ctx.tariff.peakMultiplier);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Pengaturan & Parameter Sistem"
        description={
          <>
            Kelola profil fasilitas produksi, asumsi tarif listrik PLN (LWBP/WBP), faktor emisi grid, serta tata kelola privasi data. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Perubahan tarif listrik atau faktor emisi yang Anda simpan pada tab <strong>Tarif Listrik &amp; Faktor Emisi</strong> akan langsung diterapkan ke seluruh kalkulasi biaya dan emisi di seluruh halaman dashboard.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama konfigurasi dan parameter" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Daya Kontrak & Golongan"
          value={`${fmtNumber(ctx.business.contractedPowerKva, 0)} kVA`}
          unit={ctx.tariff.tariffGroup}
          provenance="verified"
          icon={<Building2 />}
          footnote={`${ctx.machines.length} mesin produksi · ${ctx.business.employees} tenaga kerja`}
        />
        <KpiCard
          label="Tarif Dasar & WBP"
          value={fmtIdr(ctx.tariff.baseRateIdrPerKwh)}
          unit="/ kWh"
          provenance="estimated"
          icon={<Zap />}
          footnote={`WBP ${fmtIdr(wbpRateIdr)}/kWh (${ctx.tariff.peakMultiplier}× · ${ctx.tariff.peakStartHour}.00–${ctx.tariff.peakEndHour}.00 WIB)`}
        />
        <KpiCard
          label="Faktor Emisi Grid"
          value={fmtNumber(ctx.tariff.emissionFactorKgPerKwh, 2)}
          unit="kg CO₂e / kWh"
          provenance="estimated"
          icon={<Leaf />}
          footnote="Interkoneksi PLN Jawa-Madura-Bali (Scope 2)"
        />
        <KpiCard
          label="Tata Kelola & Privasi"
          value={s.consent.granted ? "Consent Aktif" : "Privat"}
          unit={`${teamUsers.length} akun tim`}
          provenance="verified"
          icon={<ShieldCheck />}
          accent
          footnote={
            s.consent.granted
              ? `Berbagi data aktif ke ${s.consent.partner}`
              : "Data tidak dibagikan ke pihak eksternal"
          }
        />
      </section>

      <Suspense fallback={null}>
        <SettingsDimensionsView
          initialDim={initialDim}
          business={ctx.business}
          machines={ctx.machines}
          tariff={ctx.tariff}
          consent={s.consent}
          teamUsers={teamUsers}
          auditLogs={s.audit}
          currentUserEmail={session.email}
        />
      </Suspense>
    </>
  );
}
