"use client";

import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Landmark,
  Leaf,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewSection {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: string;
  chartTitle: string;
  chartSub: string;
  curve: number[];
  curveColor: string;
  rightTitle: string;
  kpis: { l: string; v: string; t: string; highlight?: boolean }[];
  bars: { n: string; sub: string; v: number; c: string }[];
}

const PREVIEW_SECTIONS: PreviewSection[] = [
  {
    id: "overview",
    label: "Ringkasan",
    path: "app.ecosme.id/app/overview",
    icon: Gauge,
     badge: "73·B",
    badgeTone: "bg-brand-500/25 text-brand-200",
    chartTitle: "Tren konsumsi energi harian",
    chartSub: "30 hari terakhir (kWh)",
    curve: [38, 42, 40, 55, 61, 58, 66, 72, 69, 63, 70, 74, 68, 59, 52, 57, 64, 71, 76, 73, 66, 60, 54, 49],
    curveColor: "#16A36A",
    rightTitle: "Energi per mesin",
    kpis: [
      { l: "Energi", v: "15.5 MWh", t: "Simulasi" },
      { l: "Biaya (est.)", v: "Rp18,5 jt", t: "Estimasi" },
      { l: "Hemat M&V", v: "Rp3,1 jt", t: "Terverifikasi" },
      { l: "Green Score", v: "73 · B", t: "Indikator", highlight: true },
    ],
    bars: [
      { n: "Kompresor", sub: "42% beban", v: 92, c: "bg-brand-500" },
      { n: "Oven Curing", sub: "28% beban", v: 64, c: "bg-navy" },
      { n: "CNC Milling", sub: "18% beban", v: 40, c: "bg-info" },
      { n: "Mesin Las", sub: "12% beban", v: 26, c: "bg-warning" },
    ],
  },
  {
    id: "energy",
    label: "Energi & Tarif",
    path: "app.ecosme.id/app/energy",
    icon: Zap,
    badge: "WBP",
    badgeTone: "bg-warning/25 text-amber-200",
    chartTitle: "Profil beban per jam (LWBP vs WBP)",
    chartSub: "Puncak beban 17:00–22:00 WIB",
    curve: [24, 22, 25, 35, 58, 74, 82, 85, 79, 88, 92, 86, 78, 84, 95, 91, 76, 62, 48, 39, 33, 29, 26, 24],
    curveColor: "#2E90FA",
    rightTitle: "Proporsi jam tarif",
    kpis: [
      { l: "Daya Puncak", v: "48,2 kW", t: "Simulasi" },
      { l: "Porsi WBP", v: "21,4%", t: "Estimasi" },
      { l: "Power Factor", v: "0,89 cos φ", t: "Simulasi" },
      { l: "Tarif WBP", v: "Rp2.168", t: "1,5× LWBP", highlight: true },
    ],
    bars: [
      { n: "Jam Kerja (07–17)", sub: "LWBP Normal", v: 78, c: "bg-brand-500" },
      { n: "Beban Puncak (17–22)", sub: "WBP 1,5×", v: 45, c: "bg-warning" },
      { n: "Malam / Idle (22–07)", sub: "Beban dasar", v: 22, c: "bg-info" },
      { n: "Potensi Geser WBP", sub: "Oven & Kompresor", v: 60, c: "bg-navy" },
    ],
  },
  {
    id: "alerts",
    label: "Peringatan",
    path: "app.ecosme.id/app/alerts",
    icon: Bell,
    badge: "3",
    badgeTone: "bg-danger/30 text-red-200",
    chartTitle: "Deteksi anomali beban & faktor daya",
    chartSub: "7 hari terakhir · 3 peringatan terbuka",
    curve: [30, 32, 31, 35, 40, 88, 94, 48, 42, 39, 41, 85, 79, 44, 38, 36, 39, 77, 82, 45, 38, 34, 32, 30],
    curveColor: "#F79009",
    rightTitle: "Peringatan aktif",
    kpis: [
      { l: "Anomali Aktif", v: "3 terbuka", t: "Simulasi" },
      { l: "Beban Idle", v: "+18% malam", t: "Kompresor" },
      { l: "PF Rendah", v: "0,81 cos φ", t: "Mesin Las" },
      { l: "Potensi Hemat", v: "Rp1,4 jt/bln", t: "Estimasi", highlight: true },
    ],
    bars: [
      { n: "Oven aktif saat WBP", sub: "Kritis · Rp680rb/bln", v: 88, c: "bg-danger" },
      { n: "Kompresor idle malam", sub: "Peringatan · Rp490rb/bln", v: 65, c: "bg-warning" },
      { n: "PF Mesin Las < 0,85", sub: "Info · Kapasitor bank", v: 42, c: "bg-info" },
      { n: "Sensor IoT Online", sub: "4/4 unit aktif (98,6%)", v: 98, c: "bg-brand-500" },
    ],
  },
  {
    id: "sustainability",
    label: "Keberlanjutan",
    path: "app.ecosme.id/app/sustainability",
    icon: Leaf,
    badge: "CO₂e",
    badgeTone: "bg-brand-500/25 text-brand-200",
    chartTitle: "Tren intensitas emisi (kg CO₂e / unit)",
    chartSub: "Turun 14,2% dibanding periode baseline",
    curve: [82, 80, 78, 79, 75, 73, 71, 69, 70, 67, 65, 64, 66, 62, 60, 59, 61, 58, 56, 55, 54, 53, 52, 50],
    curveColor: "#12B76A",
    rightTitle: "Kontribusi dekarbonisasi",
    kpis: [
      { l: "Emisi Bulan Ini", v: "12,1 tCO₂e", t: "Estimasi" },
      { l: "Emisi Dihindari", v: "1,94 tCO₂e", t: "Terverifikasi" },
      { l: "Intensitas", v: "1,18 kg/unit", t: "-14,2%" },
      { l: "Faktor Grid", v: "0,78 kg/kWh", t: "Asumsi", highlight: true },
    ],
    bars: [
      { n: "Optimasi tekanan kompresor", sub: "-980 kg CO₂e", v: 84, c: "bg-brand-500" },
      { n: "Penjadwalan ulang oven", sub: "-620 kg CO₂e", v: 58, c: "bg-info" },
      { n: "Perbaikan faktor daya", sub: "-340 kg CO₂e", v: 36, c: "bg-navy" },
      { n: "Kelengkapan M&V", sub: "2 periode terverifikasi", v: 92, c: "bg-brand-500" },
    ],
  },
  {
    id: "financing",
    label: "Pembiayaan",
    path: "app.ecosme.id/app/financing",
    icon: Landmark,
    badge: "89%",
    badgeTone: "bg-info/30 text-sky-200",
    chartTitle: "Riwayat Green Score & kesiapan dokumen",
    chartSub: "Skor 73 (Grade B) · 8 dari 9 checklist selesai",
    curve: [58, 60, 61, 63, 64, 65, 67, 68, 68, 70, 71, 72, 73, 73, 74, 75, 75, 76, 76, 77, 78, 78, 79, 80],
    curveColor: "#16A36A",
    rightTitle: "Checklist kesiapan bank",
    kpis: [
      { l: "Kesiapan Data", v: "89% (8/9)", t: "Indikator" },
      { l: "Baseline M&V", v: "R² = 0,88", t: "Terverifikasi" },
      { l: "Legalitas Usaha", v: "NIB & NPWP", t: "Lengkap" },
      { l: "Izin Berbagi", v: "Aktif · Bank", t: "Persetujuan", highlight: true },
    ],
    bars: [
      { n: "Riwayat energi ≥ 3 bulan", sub: "Terpenuhi (100%)", v: 100, c: "bg-brand-500" },
      { n: "Kelengkapan data ≥ 95%", sub: "98,6% tercapai", v: 99, c: "bg-brand-500" },
      { n: "Penghematan terverifikasi", sub: "2 periode IPMVP", v: 100, c: "bg-info" },
      { n: "Dokumen legal & izin mitra", sub: "Siap ditinjau bank", v: 89, c: "bg-navy" },
    ],
  },
];

function Spark({ values, color = "#16A36A", h = 80 }: { values: number[]; color?: string; h?: number }) {
  const w = 300;
  const max = Math.max(...values);
  const min = Math.min(...values) * 0.8;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min)) * (h - 6) - 3]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

/** Interactive preview of the IKM dashboard with a clickable, expandable sidebar for marketing pages. */
export function DashboardPreview({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string>("overview");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const current = PREVIEW_SECTIONS.find((s) => s.id === activeId) ?? PREVIEW_SECTIONS[0];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(18,59,42,0.35)]",
        className,
      )}
    >
      {/* Browser Top Chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#F97066]" />
        <span className="size-2.5 rounded-full bg-[#FDB022]" />
        <span className="size-2.5 rounded-full bg-[#32D583]" />
        <span className="ml-2 truncate rounded-md bg-white px-3 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line transition-all">
          {current.path}
        </span>
        <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700 ring-1 ring-brand-200">
          Klik menu sidebar
        </span>
      </div>

      {/* Main Preview Shell with Interactive Sidebar */}
      <div
        className={cn(
          "grid transition-all duration-200",
          sidebarExpanded ? "grid-cols-[148px_1fr] sm:grid-cols-[164px_1fr]" : "grid-cols-[54px_1fr]",
        )}
      >
        {/* Interactive Sidebar */}
        <div className="flex flex-col justify-between border-r border-white/10 bg-gradient-to-b from-forest to-forest-950 p-2.5 text-white">
          <div>
            {/* Sidebar Mini Header + Expand Toggle */}
            <div className={cn("mb-2.5 flex items-center justify-between border-b border-white/10 pb-2", !sidebarExpanded && "justify-center")}>
              {sidebarExpanded && (
                <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-tight text-white">
                  <span className="size-2 rounded-full bg-brand-400 animate-pulse" />
                  Portal IKM
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarExpanded((v) => !v)}
                title={sidebarExpanded ? "Ciutkan sidebar pratinjau" : "Perluas sidebar pratinjau"}
                aria-label={sidebarExpanded ? "Ciutkan sidebar pratinjau" : "Perluas sidebar pratinjau"}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                {sidebarExpanded ? <ChevronsLeft className="size-3.5" /> : <ChevronsRight className="size-3.5" />}
              </button>
            </div>

            {/* Interactive Nav Items */}
            <nav aria-label="Menu pratinjau interaktif" className="space-y-1">
              {PREVIEW_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const active = sec.id === current.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveId(sec.id)}
                    title={!sidebarExpanded ? sec.label : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] font-medium transition-all",
                      active
                        ? "bg-white/15 text-white shadow-sm ring-1 ring-white/15"
                        : "text-white/65 hover:bg-white/[0.08] hover:text-white",
                      !sidebarExpanded && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-brand-400" />}
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-transform group-hover:scale-110",
                        active ? "text-brand-300" : "text-white/60 group-hover:text-brand-200",
                      )}
                      aria-hidden
                    />
                    {sidebarExpanded && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{sec.label}</span>
                        {sec.badge && (
                          <span className={cn("num shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-bold", sec.badgeTone)}>
                            {sec.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mini Eco-Pulse Footer inside Preview Sidebar */}
          <div className="mt-3 border-t border-white/10 pt-2">
            {sidebarExpanded ? (
              <div className="rounded-lg bg-white/[0.06] p-2 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 font-semibold text-brand-200">
                    <Activity className="size-3 text-brand-300" aria-hidden /> Eco-Pulse
                  </span>
                  <span className="num text-[9.5px] text-white/70">4/4 IoT</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[92%] rounded-full bg-brand-400" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarExpanded(true)}
                title="Buka Eco-Pulse"
                className="mx-auto grid size-7 place-items-center rounded-lg bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/30"
              >
                <Activity className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Preview Body */}
        <div key={current.id} className="space-y-3 p-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {current.kpis.map((k) => (
              <div
                key={k.l}
                className={cn(
                  "rounded-lg border p-2.5 transition-all",
                  k.highlight ? "border-forest bg-forest text-white" : "border-line bg-white",
                )}
              >
                <p className={cn("truncate text-[10px]", k.highlight ? "text-white/70" : "text-muted")}>{k.l}</p>
                <p className="num mt-1 truncate text-[13.5px] font-semibold">{k.v}</p>
                <p className={cn("mt-1 truncate text-[9px] font-semibold uppercase", k.highlight ? "text-brand-200" : "text-brand-700")}>
                  {k.t}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[1.45fr_1fr]">
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[11px] font-semibold text-ink">{current.chartTitle}</p>
              </div>
              <p className="text-[10px] text-muted">{current.chartSub}</p>
              <div className="mt-2 h-24">
                <Spark values={current.curve} color={current.curveColor} />
              </div>
            </div>

            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] font-semibold text-ink">{current.rightTitle}</p>
              <ul className="mt-2 space-y-2">
                {current.bars.map((b) => (
                  <li key={b.n}>
                    <div className="flex justify-between gap-1 text-[10px]">
                      <span className="truncate font-medium text-ink">{b.n}</span>
                      <span className="shrink-0 text-[9.5px] text-muted">{b.sub}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
                      <div className={cn("h-full rounded-full transition-all duration-300", b.c)} style={{ width: `${b.v}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static preview of the bank partner portal. */
export function BankPreview({ className }: { className?: string }) {
  const rows = [
    { n: "IKM Fabrikasi Logam", s: 73, r: 89, st: "Dalam peninjauan", tone: "bg-gray-100 text-gray-700" },
    { n: "IKM Furnitur Kayu", s: 78, r: 90, st: "Disetujui prinsip", tone: "bg-brand-50 text-brand-700" },
    { n: "IKM Pengolahan Makanan", s: 64, r: 75, st: "Baru diajukan", tone: "bg-info-50 text-info-700" },
  ];
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(20,36,58,0.35)]", className)}>
      <div className="flex items-center justify-between border-b border-line bg-navy px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-[12px] font-semibold">
          <Landmark className="size-4 text-brand-300" aria-hidden /> Portal Mitra Keuangan
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase">Ilustrasi demo</span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold text-muted">Pipeline IKM dengan persetujuan berbagi data</p>
        <ul className="mt-3 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.n} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold">{r.n}</span>
                <span className="text-[10.5px] text-muted">
                  Green Score {r.s} · Kesiapan {r.r}%
                </span>
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", r.tone)}>{r.st}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[10.5px] text-muted">
          <BadgeCheck className="size-3.5 text-brand-600" aria-hidden /> Keputusan kredit tetap sepenuhnya di tangan bank.
        </p>
      </div>
    </div>
  );
}
