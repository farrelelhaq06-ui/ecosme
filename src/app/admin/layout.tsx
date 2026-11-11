import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/data";
import { store } from "@/lib/store/platform-store";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");
  const jar = await cookies();
  const notifications = store()
    .fleet.filter((d) => d.status !== "online" || d.completeness < 0.9)
    .map((d) => ({
      id: d.id,
      title: d.status === "offline" ? `Perangkat offline: ${d.id} (${d.organization})` : `Kualitas data rendah: ${d.id} (${d.organization})`,
      severity: d.status === "offline" ? ("critical" as const) : ("warning" as const),
      detectedAt: d.lastSeen,
      href: "/admin/devices",
    }));
  const s = store();
  const onlineFleet = s.fleet.filter((d) => d.status === "online").length;
  const avgCompleteness =
    s.fleet.length > 0 ? Math.round((s.fleet.reduce((acc, d) => acc + d.completeness, 0) / s.fleet.length) * 1000) / 10 : 98;
  return (
    <AppShell
      portal="admin"
      user={{ name: session.name, email: session.email, org: session.org }}
      notifications={notifications}
      initialCollapsed={jar.get("ecosme_sidebar")?.value === "collapsed"}
      demoMode={isDemoMode()}
      sidebarData={{
        devicesOnline: onlineFleet,
        devicesTotal: s.fleet.length,
        completenessPct: avgCompleteness,
        activeUsersCount: s.users.filter((u) => u.status === "active").length,
      }}
    >
      {children}
    </AppShell>
  );
}
