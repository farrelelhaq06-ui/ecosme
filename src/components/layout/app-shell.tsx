"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  FlaskConical,
  Gauge,
  Leaf,
  LogOut,
  Menu,
  Radio,
  Search,
  Sparkles,
  Sun,
  Sunset,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { demoLoginAction, logoutAction } from "@/app/actions/auth";
import { Logo, LogoMark } from "@/components/brand/logo";
import { NAV, PORTAL_META, SEGMENT_LABEL, type Portal } from "@/components/layout/nav";
import { cn, fmtIdrCompact, fmtNumber, fmtRelative } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
  org: string;
}

export interface ShellNotification {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  detectedAt: string;
  href: string;
}

export interface ShellBadge {
  text: string;
  tone?: "brand" | "warning" | "danger" | "info" | "neutral";
  pulse?: boolean;
}

export interface ShellSidebarData {
  badges?: Record<string, ShellBadge>;
  greenScore?: number;
  greenGrade?: string;
  readinessPct?: number;
  devicesOnline?: number;
  devicesTotal?: number;
  completenessPct?: number;
  baseTariffIdr?: number;
  peakMultiplier?: number;
  peakHoursLabel?: string;
  monthlyKwh?: number;
  pipelineCount?: number;
  approvedCount?: number;
  activeUsersCount?: number;
}

/** Close a popover on outside click or Escape. */
function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const BADGE_TONE_CLASSES: Record<NonNullable<ShellBadge["tone"]>, string> = {
  brand: "bg-brand-500/20 text-brand-200 ring-brand-400/30",
  warning: "bg-warning/20 text-amber-200 ring-warning/35",
  danger: "bg-danger/25 text-red-200 ring-danger/40",
  info: "bg-info/20 text-sky-200 ring-info/35",
  neutral: "bg-white/10 text-white/75 ring-white/15",
};

export function AppShell({
  portal,
  user,
  notifications,
  initialCollapsed,
  demoMode,
  sidebarData,
  children,
}: {
  portal: Portal;
  user: ShellUser;
  notifications: ShellNotification[];
  initialCollapsed: boolean;
  demoMode: boolean;
  sidebarData?: ShellSidebarData;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer on navigation (state-derived, no effect needed).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next);
    document.cookie = `ecosme_sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  function toggleCollapsed() {
    setSidebarCollapsed(!collapsed);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Lewati ke konten utama
      </a>

      {/* Mobile overlay */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-navy/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <Sidebar
        portal={portal}
        pathname={pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        demoMode={demoMode}
        notifications={notifications}
        sidebarData={sidebarData}
        onToggle={toggleCollapsed}
        onExpand={() => setSidebarCollapsed(false)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]")}>
        <Topbar
          portal={portal}
          pathname={pathname}
          user={user}
          notifications={notifications}
          demoMode={demoMode}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-line px-4 py-4 text-[12px] text-muted sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2">
            <span>© {new Date().getFullYear()} EcoSME · Smart Energy. Measurable Savings. Smarter Green Financing.</span>
            {demoMode && <span>Mode DEMO — seluruh data adalah simulasi dan bukan pembacaan sensor atau transaksi nyata.</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Sidebar({
  portal,
  pathname,
  collapsed,
  mobileOpen,
  demoMode,
  notifications,
  sidebarData,
  onToggle,
  onExpand,
  onCloseMobile,
}: {
  portal: Portal;
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  demoMode: boolean;
  notifications: ShellNotification[];
  sidebarData?: ShellSidebarData;
  onToggle: () => void;
  onExpand: () => void;
  onCloseMobile: () => void;
}) {
  const meta = PORTAL_META[portal];
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // Merge notifications into default badges if not explicitly supplied
  const badges = useMemo<Record<string, ShellBadge>>(() => {
    const base: Record<string, ShellBadge> = {};
    if (portal === "ikm") {
      if (notifications.length > 0) {
        const hasCritical = notifications.some((n) => n.severity === "critical");
        base["/app/alerts"] = {
          text: String(notifications.length),
          tone: hasCritical ? "danger" : "warning",
          pulse: hasCritical,
        };
      }
      base["/app/green-score"] = {
        text: `${sidebarData?.greenScore ?? 73} · ${sidebarData?.greenGrade ?? "B"}`,
        tone: "brand",
      };
      base["/app/financing"] = {
        text: `${sidebarData?.readinessPct ?? 89}%`,
        tone: "info",
      };
      base["/app/devices"] = {
        text: `${sidebarData?.devicesOnline ?? 4}/${sidebarData?.devicesTotal ?? 4}`,
        tone: "neutral",
      };
    } else if (portal === "bank") {
      if (sidebarData?.pipelineCount !== undefined) {
        base["/bank/pipeline"] = { text: String(sidebarData.pipelineCount), tone: "brand" };
      }
      if (notifications.length > 0) {
        base["/bank/applications"] = { text: String(notifications.length), tone: "info", pulse: true };
      }
    } else if (portal === "admin") {
      if (notifications.length > 0) {
        base["/admin/devices"] = { text: `${notifications.length} isu`, tone: "warning", pulse: true };
      }
      if (sidebarData?.completenessPct !== undefined) {
        base["/admin/data-quality"] = { text: `${sidebarData.completenessPct}%`, tone: "brand" };
      }
    }
    return { ...base, ...sidebarData?.badges };
  }, [portal, notifications, sidebarData]);

  // Keyboard shortcut Ctrl+K or Cmd+K to focus sidebar search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (collapsed) onExpand();
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed, onExpand]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    const groups = NAV[portal];
    if (!normalizedQuery) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedQuery) ||
            item.description?.toLowerCase().includes(normalizedQuery) ||
            item.keywords?.some((k) => k.toLowerCase().includes(normalizedQuery)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [portal, normalizedQuery]);

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside
      aria-label="Navigasi utama"
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-gradient-to-b from-forest via-forest to-forest-950 text-white shadow-2xl transition-[width,transform] duration-200",
        "w-[268px] lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        collapsed && "lg:w-[76px]",
      )}
    >
      {/* Subtle decorative ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-brand-400/10 to-transparent" />

      {/* Brand Header */}
      <div className={cn("relative flex h-16 items-center justify-between gap-2 border-b border-white/10 px-4", collapsed && "lg:justify-center lg:px-0")}>
        <span className={cn(collapsed && "lg:hidden")}>
          <Logo href={meta.home} inverted />
        </span>
        <Link
          href={meta.home}
          className={cn("hidden transition-transform hover:scale-105", collapsed && "lg:block")}
          aria-label="EcoSME — beranda portal"
        >
          <LogoMark />
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Interactive Portal Switcher */}
      <div className={cn("relative px-3.5 pt-3.5", collapsed && "lg:px-2.5")}>
        <PortalSwitcher portal={portal} collapsed={collapsed} demoMode={demoMode} />
      </div>

      {/* Interactive Quick Search / Menu Filter */}
      <div className={cn("relative px-3.5 pt-2.5", collapsed && "lg:px-2.5")}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => {
              onExpand();
              setTimeout(() => searchInputRef.current?.focus(), 80);
            }}
            title="Cari menu navigasi (Ctrl+K)"
            aria-label="Cari menu navigasi (Ctrl+K)"
            className="group relative flex w-full items-center justify-center rounded-xl bg-white/[0.05] py-2 text-white/65 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
          >
            <Search className="size-4 transition-transform group-hover:scale-110" aria-hidden />
          </button>
        ) : (
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-white/45" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari menu atau fitur..."
              aria-label="Cari menu di sidebar"
              className="w-full rounded-xl bg-white/[0.06] py-1.5 pl-8 pr-14 text-[12.5px] text-white placeholder:text-white/40 ring-1 ring-white/10 transition focus:bg-white/[0.1] focus:outline-none focus:ring-brand-400/60"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 rounded-md p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2 hidden rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/45 sm:inline-block">
                ⌘K
              </kbd>
            )}
          </div>
        )}
      </div>

      {/* Interactive Navigation Groups */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {filteredGroups.length === 0 ? (
          <div className="my-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <Compass className="mx-auto size-6 text-brand-300/70" aria-hidden />
            <p className="mt-2 text-[12.5px] font-medium text-white/80">Menu &ldquo;{query}&rdquo; tidak ditemukan</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 rounded-lg bg-brand-500/20 px-2.5 py-1 text-[11.5px] font-semibold text-brand-200 ring-1 ring-brand-400/30 hover:bg-brand-500/30"
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isGroupCollapsed = !normalizedQuery && !!collapsedGroups[group.label];
            const hasActiveChild = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

            return (
              <div key={group.label} className="mb-4 last:mb-1">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={!isGroupCollapsed}
                    className="group/hdr mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/45 group-hover/hdr:text-white/75">
                      {group.label}
                      {isGroupCollapsed && hasActiveChild && (
                        <span className="size-1.5 rounded-full bg-brand-400" title="Halaman aktif berada di grup ini" />
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-white/35 transition-transform duration-200 group-hover/hdr:text-white/70",
                        isGroupCollapsed && "-rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <div aria-hidden className="mx-auto my-2 h-px w-6 bg-white/10" />
                )}

                {(!isGroupCollapsed || collapsed) && (
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      const badge = badges[item.href];
                      const isHovered = hoveredHref === item.href;

                      return (
                        <li
                          key={item.href}
                          className="relative"
                          onMouseEnter={() => setHoveredHref(item.href)}
                          onMouseLeave={() => setHoveredHref((h) => (h === item.href ? null : h))}
                        >
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                              active
                                ? "bg-gradient-to-r from-brand-500/25 via-white/[0.12] to-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ring-1 ring-white/15"
                                : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                              collapsed && "lg:justify-center lg:px-0 lg:py-2.5",
                            )}
                          >
                            {active && (
                              <span
                                aria-hidden
                                className="absolute inset-y-1.5 left-0 w-[3.5px] rounded-r-full bg-brand-400 shadow-[0_0_10px_rgba(76,195,141,0.9)]"
                              />
                            )}

                            <span
                              className={cn(
                                "relative grid size-7 shrink-0 place-items-center rounded-lg transition-all duration-150",
                                active
                                  ? "bg-brand-400/20 text-brand-300"
                                  : "text-white/60 group-hover:scale-110 group-hover:bg-white/[0.06] group-hover:text-brand-200",
                              )}
                            >
                              <Icon className="size-[17px]" aria-hidden />
                              {collapsed && badge && (
                                <span
                                  aria-hidden
                                  className={cn(
                                    "absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-forest",
                                    badge.tone === "danger"
                                      ? "bg-danger"
                                      : badge.tone === "warning"
                                        ? "bg-warning"
                                        : "bg-brand-400",
                                  )}
                                />
                              )}
                            </span>

                            <span className={cn("min-w-0 flex-1", collapsed && "lg:sr-only")}>
                              <span className="block truncate leading-tight transition-transform duration-150 group-hover:translate-x-0.5">
                                {item.label}
                              </span>
                              {item.description && (active || normalizedQuery.length > 0) && (
                                <span className="mt-0.5 block truncate text-[11px] font-normal text-white/50">
                                  {item.description}
                                </span>
                              )}
                            </span>

                            {badge && !collapsed && (
                              <span
                                className={cn(
                                  "num inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
                                  BADGE_TONE_CLASSES[badge.tone ?? "neutral"],
                                )}
                              >
                                {badge.pulse && (
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "size-1.5 rounded-full animate-pulse",
                                      badge.tone === "danger" ? "bg-red-300" : "bg-amber-300",
                                    )}
                                  />
                                )}
                                {badge.text}
                              </span>
                            )}
                          </Link>

                          {/* Rich floating tooltip in collapsed desktop mode */}
                          {collapsed && isHovered && (
                            <div
                              role="tooltip"
                              className="pointer-events-none fixed left-[84px] z-[60] hidden w-56 -translate-y-9 animate-fade-in rounded-xl border border-white/15 bg-forest-950/95 p-3 text-white shadow-xl backdrop-blur-md lg:block"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-white">{item.label}</span>
                                {badge && (
                                  <span
                                    className={cn(
                                      "num rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                      BADGE_TONE_CLASSES[badge.tone ?? "neutral"],
                                    )}
                                  >
                                    {badge.text}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="mt-1 text-[11.5px] leading-snug text-white/65">{item.description}</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Interactive Eco-Pulse Live Widget */}
      <SidebarPulseWidget
        portal={portal}
        collapsed={collapsed}
        sidebarData={sidebarData}
        onExpandSidebar={onExpand}
      />

      {/* Collapse / Expand Footer Toggle */}
      <div className="hidden border-t border-white/10 p-2.5 lg:block">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12.5px] font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex items-center gap-2.5">
            {collapsed ? (
              <ChevronsRight className="size-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden />
            ) : (
              <ChevronsLeft className="size-[18px] transition-transform group-hover:-translate-x-0.5" aria-hidden />
            )}
            {!collapsed && <span>Ciutkan Sidebar</span>}
          </span>
          {!collapsed && (
            <span className="rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              Lebar
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

/**
 * Interactive Portal Switcher inside the Sidebar.
 * Lets users inspect or switch between IKM, Bank Partner, and Admin portals.
 */
function PortalSwitcher({
  portal,
  collapsed,
  demoMode,
}: {
  portal: Portal;
  collapsed: boolean;
  demoMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingPortal, setPendingPortal] = useState<Portal | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const meta = PORTAL_META[portal];
  const PortalIcon = meta.icon;

  function handleSelectPortal(target: Portal) {
    if (target === portal) {
      setOpen(false);
      return;
    }
    setPendingPortal(target);
    const fd = new FormData();
    fd.set("role", target);
    startTransition(() => {
      demoLoginAction(fd);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={collapsed ? `${meta.label} — Klik untuk ganti portal` : undefined}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl bg-white/[0.07] p-2.5 text-left ring-1 ring-white/12 transition hover:bg-white/[0.11] hover:ring-brand-400/40",
          collapsed && "lg:justify-center lg:p-2",
        )}
      >
        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400/30 to-brand-600/20 text-brand-300 ring-1 ring-brand-300/30">
          <PortalIcon className="size-4" aria-hidden />
          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success ring-2 ring-forest" />
        </span>
        <span className={cn("min-w-0 flex-1", collapsed && "lg:sr-only")}>
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-semibold text-white">{meta.label}</span>
          </span>
          <span className="block truncate text-[11px] text-brand-200/75">
            {demoMode ? "Klik untuk pindah portal" : meta.shortLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/50 transition-transform duration-200 group-hover:text-white",
            open && "rotate-180",
            collapsed && "lg:hidden",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-64 animate-rise overflow-hidden rounded-2xl border border-white/15 bg-forest-950/95 p-1.5 text-white shadow-2xl backdrop-blur-xl",
            collapsed ? "left-full top-0 ml-3 mt-0" : "left-0 right-0 w-full",
          )}
        >
          <div className="border-b border-white/10 px-2.5 py-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-brand-300">Pilih Lingkungan Portal</p>
            <p className="text-[11px] text-white/55">Beralih tampilan peran secara instan</p>
          </div>
          <ul role="listbox" className="mt-1 space-y-1">
            {(["ikm", "bank", "admin"] as Portal[]).map((p) => {
              const item = PORTAL_META[p];
              const Icon = item.icon;
              const isCurrent = p === portal;
              const isSwitching = isPending && pendingPortal === p;

              return (
                <li key={p}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    disabled={isPending}
                    onClick={() => handleSelectPortal(p)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition",
                      isCurrent
                        ? "bg-brand-500/20 text-white ring-1 ring-brand-400/40"
                        : "text-white/75 hover:bg-white/[0.08] hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                        isCurrent ? "bg-brand-400 text-forest-950" : "bg-white/10 text-brand-300",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate text-[12.5px] font-semibold">{item.label}</span>
                        {isCurrent && <Check className="size-3.5 shrink-0 text-brand-300" aria-hidden />}
                        {isSwitching && (
                          <span className="text-[10px] font-semibold text-brand-300 animate-pulse">Memuat...</span>
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-white/55">
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Interactive multi-tab Eco-Pulse widget inside the Sidebar.
 * Provides live IoT/Tariff status, Green Score & Readiness ring, and an interactive Savings Simulator.
 */
function SidebarPulseWidget({
  portal,
  collapsed,
  sidebarData,
  onExpandSidebar,
}: {
  portal: Portal;
  collapsed: boolean;
  sidebarData?: ShellSidebarData;
  onExpandSidebar: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<"status" | "score" | "sim">("status");
  const [tariffView, setTariffView] = useState<"lwbp" | "wbp">("lwbp");
  const [simPct, setSimPct] = useState(12);

  const greenScore = sidebarData?.greenScore ?? 73;
  const greenGrade = sidebarData?.greenGrade ?? "B";
  const readinessPct = sidebarData?.readinessPct ?? 89;
  const devicesOnline = sidebarData?.devicesOnline ?? 4;
  const devicesTotal = sidebarData?.devicesTotal ?? 4;
  const completenessPct = sidebarData?.completenessPct ?? 98.6;
  const baseTariff = sidebarData?.baseTariffIdr ?? 1445;
  const peakMultiplier = sidebarData?.peakMultiplier ?? 1.5;
  const peakTariff = Math.round(baseTariff * peakMultiplier);
  const monthlyKwh = sidebarData?.monthlyKwh ?? 15540;

  // Interactive savings calculation
  const estSavedKwh = Math.round((monthlyKwh * simPct) / 100);
  const estSavedIdr = Math.round(estSavedKwh * baseTariff * 1.12);
  const estSavedCo2Kg = Math.round(estSavedKwh * 0.78);

  if (collapsed) {
    return (
      <div className="hidden px-2.5 pb-2 lg:block">
        <button
          type="button"
          onClick={onExpandSidebar}
          title={`Eco-Pulse Live · Green Score ${greenScore} (${greenGrade}) · ${devicesOnline}/${devicesTotal} sensor online`}
          aria-label="Buka widget Eco-Pulse"
          className="group relative flex w-full flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-brand-500/20 to-white/[0.04] py-2.5 ring-1 ring-brand-400/30 transition hover:from-brand-500/30 hover:ring-brand-300/50"
        >
          <span className="relative flex size-6 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand-400/30 animate-ping" />
            <Activity className="relative size-4 text-brand-300" aria-hidden />
          </span>
          <span className="num text-[10px] font-bold text-brand-200">{greenScore}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2.5 overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.03] shadow-lg backdrop-blur-md">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={!minimized}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
          </span>
          <span className="text-[11.5px] font-bold tracking-wide text-white">Eco-Pulse Interaktif</span>
        </button>
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          aria-label={minimized ? "Tampilkan widget Eco-Pulse" : "Sembunyikan widget Eco-Pulse"}
          className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className={cn("size-3.5 transition-transform duration-200", minimized && "rotate-180")} />
        </button>
      </div>

      {!minimized && (
        <div className="p-2.5">
          {/* Interactive Tab Switcher */}
          <div role="tablist" aria-label="Mode Eco-Pulse" className="grid grid-cols-3 gap-1 rounded-xl bg-black/25 p-1">
            {[
              { id: "status" as const, label: "IoT & Tarif", icon: Radio },
              { id: "score" as const, label: "Skor", icon: Gauge },
              { id: "sim" as const, label: "Simulasi", icon: Sparkles },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold transition-all",
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-white/60 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: IoT & Tariff Interactive View */}
          {tab === "status" && (
            <div className="mt-2.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.05] px-2.5 py-2 ring-1 ring-white/10">
                <div className="flex items-center gap-2">
                  <Radio className="size-3.5 text-brand-300" aria-hidden />
                  <div>
                    <p className="text-[11px] font-semibold text-white">
                      {devicesOnline}/{devicesTotal} Sensor IoT Online
                    </p>
                    <p className="text-[10px] text-white/55">Kelengkapan data {completenessPct}%</p>
                  </div>
                </div>
                <Link
                  href={portal === "admin" ? "/admin/devices" : "/app/devices"}
                  className="rounded-lg bg-white/10 p-1 text-brand-200 hover:bg-white/20 hover:text-white"
                  title="Lihat perangkat IoT"
                >
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              {/* Interactive Tariff Zone Toggle (LWBP vs WBP) */}
              <div className="rounded-xl bg-white/[0.05] p-2 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-medium text-white/65">Cek Zona Tarif PLN</span>
                  <div className="inline-flex rounded-lg bg-black/30 p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setTariffView("lwbp")}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition",
                        tariffView === "lwbp" ? "bg-brand-500/80 text-white" : "text-white/55 hover:text-white",
                      )}
                    >
                      <Sun className="size-2.5" aria-hidden />
                      LWBP
                    </button>
                    <button
                      type="button"
                      onClick={() => setTariffView("wbp")}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition",
                        tariffView === "wbp" ? "bg-warning text-forest-950" : "text-white/55 hover:text-white",
                      )}
                    >
                      <Sunset className="size-2.5" aria-hidden />
                      WBP
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="num text-[14px] font-bold text-white">
                    Rp{fmtNumber(tariffView === "lwbp" ? baseTariff : peakTariff)}
                    <span className="text-[10.5px] font-normal text-white/55">/kWh</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase",
                      tariffView === "lwbp"
                        ? "bg-brand-500/20 text-brand-200"
                        : "bg-warning/25 text-amber-200",
                    )}
                  >
                    {tariffView === "lwbp" ? "22:00–17:00 WIB (1.0×)" : `17:00–22:00 WIB (${peakMultiplier}×)`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Green Score & Financing Readiness Interactive View */}
          {tab === "score" && (
            <div className="mt-2.5 space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-2.5 ring-1 ring-white/10">
                <div className="relative grid size-11 shrink-0 place-items-center">
                  <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#4cc38d"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={`${(greenScore / 100) * 94.2} 94.2`}
                    />
                  </svg>
                  <span className="num absolute text-[11px] font-extrabold text-white">{greenScore}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-white">Grade {greenGrade}</span>
                    <Link
                      href={portal === "admin" ? "/admin/green-score" : "/app/green-score"}
                      className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-brand-300 hover:underline"
                    >
                      Detail <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/60">Indikator efisiensi & M&V</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.05] p-2.5 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-white/75">Kesiapan Pembiayaan</span>
                  <span className="num font-bold text-brand-300">{readinessPct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-info transition-all duration-300"
                    style={{ width: `${readinessPct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/55">
                  <span>{readinessPct >= 80 ? "Siap dibagikan ke mitra bank" : "Lengkapi dokumen"}</span>
                  <Link
                    href={portal === "bank" ? "/bank/pipeline" : "/app/financing"}
                    className="font-semibold text-brand-200 hover:text-white"
                  >
                    Buka →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Quick Savings Simulator Interactive Slider */}
          {tab === "sim" && (
            <div className="mt-2.5 space-y-2 rounded-xl bg-white/[0.05] p-2.5 ring-1 ring-white/10 animate-fade-in">
              <div className="flex items-center justify-between">
                <label htmlFor="sidebar-sim-range" className="text-[11px] font-semibold text-white">
                  Target Efisiensi Energi
                </label>
                <span className="num rounded-md bg-brand-500/25 px-1.5 py-0.5 text-[11px] font-bold text-brand-200 ring-1 ring-brand-400/30">
                  {simPct}%
                </span>
              </div>
              <input
                id="sidebar-sim-range"
                type="range"
                min={5}
                max={25}
                step={1}
                value={simPct}
                onChange={(e) => setSimPct(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-brand-400"
              />
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="rounded-lg bg-black/25 p-2">
                  <p className="flex items-center gap-1 text-[9.5px] text-white/55">
                    <Zap className="size-2.5 text-brand-300" aria-hidden /> Est. Hemat/bln
                  </p>
                  <p className="num mt-0.5 text-[12px] font-bold text-brand-200">{fmtIdrCompact(estSavedIdr)}</p>
                </div>
                <div className="rounded-lg bg-black/25 p-2">
                  <p className="flex items-center gap-1 text-[9.5px] text-white/55">
                    <Leaf className="size-2.5 text-brand-300" aria-hidden /> Reduksi Emisi
                  </p>
                  <p className="num mt-0.5 text-[12px] font-bold text-white">-{fmtNumber(estSavedCo2Kg)} kg</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((p, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: SEGMENT_LABEL[p] ?? decodeURIComponent(p),
  }));
  // The portal root ("/app") has no page of its own; link it to the overview.
  if (crumbs[0]) crumbs[0].href = `${crumbs[0].href}/overview`;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href + i} className={cn("flex min-w-0 items-center gap-1", !last && "hidden sm:flex")}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-semibold text-ink">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate text-muted hover:text-ink">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Topbar({
  portal,
  pathname,
  user,
  notifications,
  demoMode,
  onOpenMobile,
}: {
  portal: Portal;
  pathname: string;
  user: ShellUser;
  notifications: ShellNotification[];
  demoMode: boolean;
  onOpenMobile: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobile}
          className="-ml-1 rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="size-5" />
        </button>
        <Breadcrumbs pathname={pathname} />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {demoMode && (
            <span
              title="Seluruh data pada lingkungan ini adalah simulasi demonstrasi."
              className="hidden items-center gap-1.5 rounded-full bg-info-50 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-info-700 ring-1 ring-inset ring-info/25 sm:inline-flex"
            >
              <FlaskConical className="size-3.5" aria-hidden />
              Demo
            </span>
          )}
          <NotificationMenu portal={portal} notifications={notifications} />
          <ProfileMenu user={user} portal={portal} />
        </div>
      </div>
    </header>
  );
}

function NotificationMenu({ portal, notifications }: { portal: Portal; notifications: ShellNotification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const critical = notifications.filter((n) => n.severity === "critical").length;
  const viewAll = portal === "ikm" ? "/app/alerts" : portal === "bank" ? "/bank/applications" : "/admin/data-quality";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifikasi (${notifications.length})`}
        className="relative rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"
      >
        <Bell className="size-5" />
        {notifications.length > 0 && (
          <span
            className={cn(
              "absolute right-1 top-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white",
              critical ? "bg-danger" : "bg-warning",
            )}
          >
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] animate-rise overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifikasi</p>
            <span className="text-[12px] text-muted">{notifications.length} aktif</span>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">Tidak ada notifikasi baru.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 border-b border-line/70 px-4 py-3 last:border-0 hover:bg-canvas"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.severity === "critical" ? "bg-danger" : n.severity === "warning" ? "bg-warning" : "bg-info",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[13px] font-medium text-ink">{n.title}</span>
                      <span className="text-[12px] text-muted">{fmtRelative(n.detectedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={viewAll}
            onClick={() => setOpen(false)}
            className="block border-t border-line bg-canvas/60 px-4 py-2.5 text-center text-[13px] font-semibold text-brand-700 hover:bg-canvas"
          >
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ user, portal }: { user: ShellUser; portal: Portal }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menu profil"
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-canvas"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-forest text-[12px] font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block max-w-36 truncate text-[11.5px] text-muted">{user.org}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 animate-rise overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[12px] text-muted">{user.email}</p>
            <p className="mt-1 truncate text-[12px] text-muted">{user.org}</p>
          </div>
          <ul className="p-1.5">
            {portal === "ikm" && (
              <li>
                <Link
                  href="/app/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink hover:bg-canvas"
                >
                  <UserRound className="size-4 text-muted" aria-hidden />
                  Profil & pengaturan
                </Link>
              </li>
            )}
            <li>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-danger-700 hover:bg-danger-50"
                >
                  <LogOut className="size-4" aria-hidden />
                  Keluar
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
