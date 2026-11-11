import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getAlerts, getGreenScore, getIkmContext } from "@/lib/services/ikm";
import { getReadiness } from "@/lib/services/platform";

export default async function IkmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ikm");
  const [ctx, alerts, green, readiness, jar] = await Promise.all([
    getIkmContext(),
    getAlerts(),
    getGreenScore(),
    getReadiness(),
    cookies(),
  ]);
  const notifications = alerts.open.slice(0, 6).map((a) => ({
    id: a.id,
    title: a.title,
    severity: a.severity,
    detectedAt: a.detectedAt,
    href: `/app/alerts?focus=${encodeURIComponent(a.id)}`,
  }));
  const onlineDevices = ctx.devices.filter((d) => d.status === "online").length;
  return (
    <AppShell
      portal="ikm"
      user={{ name: session.name, email: session.email, org: ctx.business.name }}
      notifications={notifications}
      initialCollapsed={jar.get("ecosme_sidebar")?.value === "collapsed"}
      demoMode={ctx.mode === "demo"}
      sidebarData={{
        greenScore: green.current.result.total,
        greenGrade: green.current.result.grade,
        readinessPct: readiness.pct,
        devicesOnline: onlineDevices,
        devicesTotal: ctx.devices.length,
        completenessPct: Math.round(green.current.inputs.completeness * 1000) / 10,
        baseTariffIdr: ctx.tariff.baseRateIdrPerKwh,
        peakMultiplier: ctx.tariff.peakMultiplier,
        monthlyKwh: Math.round(green.current.totals.kwh),
      }}
    >
      {children}
    </AppShell>
  );
}
