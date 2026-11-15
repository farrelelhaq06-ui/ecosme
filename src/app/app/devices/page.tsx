import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DatabaseZap,
  Factory,
  Radio,
  Router,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getIkmContext, loadWindow, resolveAnyRange } from "@/lib/services/ikm";
import { assessQuality } from "@/lib/calc/quality";
import { store } from "@/lib/store/platform-store";
import { fmtDateTime, fmtNumber, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/data/kpi-card";
import { Callout } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { MascotAvatar } from "@/components/brand/logo";
import {
  DevicesDimensionsView,
  type DevicesDimensionKey,
  type EnrichedDeviceRow,
  type TelemetryGapRow,
} from "@/app/app/devices/devices-dimensions";

export const metadata: Metadata = { title: "Perangkat IoT" };

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ikm");
  const sp = await searchParams;
  const ctx = await getIkmContext();

  const initialDim: DevicesDimensionKey =
    sp.dim === "quality" || sp.dim === "pairing" || sp.dim === "diagnostics"
      ? sp.dim
      : "fleet";

  const range30d = resolveAnyRange(ctx, { range: "30d" });
  const w = await loadWindow(ctx, range30d);
  const quality = assessQuality(w.readings, ctx.machines, range30d.from, range30d.to);

  const enrichedDevices: EnrichedDeviceRow[] = ctx.devices.map((d) => {
    const m = ctx.machines.find((x) => x.id === d.machineId);
    const pq = quality.perDevice.find((x) => x.deviceId === d.id || x.machineId === d.machineId);
    return {
      id: d.id,
      serial: d.serial,
      model: d.model,
      machineId: d.machineId,
      machineName: m?.name ?? "Panel belum ditetapkan",
      location: m?.location ?? "Area produksi",
      ratedPowerKw: m?.ratedPowerKw ?? 0,
      firmware: d.firmware,
      status: d.status,
      lastSeen: d.lastSeen,
      signalDbm: d.signalDbm,
      installedAt: d.installedAt,
      expectedIntervals: pq?.expected ?? 720,
      receivedIntervals: pq?.received ?? 720,
      completenessPct: (pq?.completeness ?? 1) * 100,
      outOfRangeCount: pq?.outOfRange ?? 0,
      gapCount: pq?.gaps.length ?? 0,
    };
  });

  const gaps: TelemetryGapRow[] = quality.perDevice.flatMap((pq, idx) => {
    const m = ctx.machines.find((x) => x.id === pq.machineId);
    return pq.gaps.map((g, gIdx) => ({
      id: `GAP-${pq.deviceId}-${idx}-${gIdx}`,
      deviceId: pq.deviceId,
      machineName: m?.name ?? pq.machineId,
      from: g.from,
      to: g.to,
      hours: g.hours,
    }));
  });

  const onlineCount = ctx.devices.filter((d) => d.status === "online").length;
  const degradedCount = ctx.devices.filter((d) => d.status === "degraded").length;
  const offlineCount = ctx.devices.filter((d) => d.status === "offline").length;
  const pairedDevices = store().pairedDevices;
  const overallCompletenessPct = quality.completeness * 100;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title="Perangkat IoT & Kualitas Data"
        description={
          <>
            Pemantauan konektivitas <em>smart energy meter</em>, audit kelengkapan interval per jam, serta pendaftaran perangkat baru. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={
          <ButtonLink href="/app/alerts" variant="secondary" size="sm">
            <Siren className="size-4" aria-hidden />
            Lihat Peringatan Sensor
          </ButtonLink>
        }
      />

      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Keenam perangkat di bawah ini merepresentasikan simulasi meter energi 3-fasa yang terpasang pada tiap mesin produksi, termasuk simulasi 1 sensor <em>offline</em> dan 1 sensor bersinyal lemah untuk mendemonstrasikan audit kualitas data.
        </Callout>
      )}

      {/* 4 Core KPI Cards — matching Overview & Monitoring dimensions */}
      <section aria-label="KPI utama perangkat IoT dan kualitas data" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Status Armada Sensor"
          value={`${onlineCount} / ${ctx.devices.length}`}
          unit="online"
          provenance="simulated"
          icon={<Router />}
          footnote={`${degradedCount} sinyal lemah · ${offlineCount} offline`}
        />
        <KpiCard
          label="Kelengkapan Data 30 Hari"
          value={fmtPct(overallCompletenessPct, 1)}
          unit="interval"
          provenance="simulated"
          icon={<DatabaseZap />}
          footnote={`${fmtNumber(quality.received, 0)} dari ${fmtNumber(quality.expected, 0)} paket per jam diterima`}
        />
        <KpiCard
          label="Celah Transmisi (≥ 2 Jam)"
          value={`${quality.gapCount}`}
          unit="kejadian"
          provenance="simulated"
          icon={<Radio />}
          footnote={`Durasi celah terpanjang: ${quality.longestGapHours} jam`}
        />
        <KpiCard
          label="Kualitas Telemetri M&V"
          value={
            quality.rating === "baik"
              ? "Sangat Baik"
              : quality.rating === "cukup"
                ? "Layak Audit"
                : "Perlu Perhatian"
          }
          provenance="verified"
          icon={<ShieldCheck />}
          accent
          footnote="Memenuhi ambang kelengkapan ≥ 95% untuk perhitungan Green Score"
        />
      </section>

      <Suspense fallback={null}>
        <DevicesDimensionsView
          initialDim={initialDim}
          devices={enrichedDevices}
          gaps={gaps}
          pairedDevices={pairedDevices}
          overallCompletenessPct={overallCompletenessPct}
          expectedTotal={quality.expected}
          receivedTotal={quality.received}
          outOfRangeTotal={quality.outOfRange}
          longestGapHours={quality.longestGapHours}
        />
      </Suspense>
    </>
  );
}
