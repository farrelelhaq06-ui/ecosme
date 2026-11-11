import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/data";
import { getApplications } from "@/lib/services/platform";

export default async function BankLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("bank");
  const [apps, jar] = await Promise.all([getApplications(), cookies()]);
  const notifications = apps
    .filter((a) => a.status === "submitted" || a.status === "info_requested")
    .map((a) => ({
      id: a.id,
      title: a.status === "submitted" ? `Pengajuan baru: ${a.businessName}` : `Menunggu info tambahan: ${a.businessName}`,
      severity: a.status === "submitted" ? ("info" as const) : ("warning" as const),
      detectedAt: a.submittedAt,
      href: `/bank/pipeline/${a.id}`,
    }));
  const avgScore = apps.length ? Math.round(apps.reduce((s, a) => s + a.greenScore, 0) / apps.length) : 73;
  const avgReadiness = apps.length ? Math.round(apps.reduce((s, a) => s + a.readinessPct, 0) / apps.length) : 85;
  return (
    <AppShell
      portal="bank"
      user={{ name: session.name, email: session.email, org: session.org }}
      notifications={notifications}
      initialCollapsed={jar.get("ecosme_sidebar")?.value === "collapsed"}
      demoMode={isDemoMode()}
      sidebarData={{
        pipelineCount: apps.length,
        greenScore: avgScore,
        greenGrade: avgScore >= 80 ? "A" : avgScore >= 65 ? "B" : "C",
        readinessPct: avgReadiness,
      }}
    >
      {children}
    </AppShell>
  );
}
