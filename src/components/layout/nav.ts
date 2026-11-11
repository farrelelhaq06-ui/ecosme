import {
  Bell,
  Building2,
  ClipboardCheck,
  Cpu,
  DatabaseZap,
  FileText,
  Gauge,
  Handshake,
  Landmark,
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  PiggyBank,
  Router,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export type Portal = "ikm" | "bank" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  keywords?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: Record<Portal, NavGroup[]> = {
  ikm: [
    {
      label: "Monitoring",
      items: [
        { href: "/app/overview", label: "Ringkasan", icon: LayoutDashboard, description: "KPI utama, tren & rekomendasi", keywords: ["dashboard", "home", "kpi"] },
        { href: "/app/energy", label: "Monitoring Energi", icon: Zap, description: "Konsumsi kWh, beban WBP/LWBP", keywords: ["listrik", "kwh", "tarif", "wbp"] },
        { href: "/app/machines", label: "Mesin", icon: Cpu, description: "Profil beban & efisiensi per mesin", keywords: ["kompresor", "oven", "cnc", "las"] },
        { href: "/app/alerts", label: "Peringatan", icon: Bell, description: "Anomali beban, PF & perangkat", keywords: ["notifikasi", "anomali", "bahaya"] },
      ],
    },
    {
      label: "Kinerja",
      items: [
        { href: "/app/savings", label: "Penghematan (M&V)", icon: PiggyBank, description: "Verifikasi hemat vs baseline IPMVP", keywords: ["ipmvp", "baseline", "hemat", "rupiah"] },
        { href: "/app/sustainability", label: "Keberlanjutan", icon: Leaf, description: "Jejak karbon & intensitas emisi", keywords: ["emisi", "co2", "karbon", "esg"] },
        { href: "/app/green-score", label: "Green Score", icon: Gauge, description: "Skor kinerja efisiensi 0–100", keywords: ["skor", "grade", "rating"] },
      ],
    },
    {
      label: "Pembiayaan",
      items: [
        { href: "/app/financing", label: "Kesiapan Pembiayaan", icon: Handshake, description: "Checklist dokumen & izin berbagi data", keywords: ["bank", "kredit", "pinjaman", "dokumen"] },
        { href: "/app/reports", label: "Laporan", icon: FileText, description: "Ekspor paket data & laporan M&V", keywords: ["unduh", "pdf", "csv", "ekspor"] },
      ],
    },
    {
      label: "Sistem",
      items: [
        { href: "/app/devices", label: "Perangkat IoT", icon: Router, description: "Status sensor & kelengkapan data", keywords: ["sensor", "meter", "online", "offline"] },
        { href: "/app/settings", label: "Pengaturan", icon: Settings, description: "Profil usaha, tarif & parameter", keywords: ["profil", "akun", "konfigurasi"] },
      ],
    },
  ],
  bank: [
    {
      label: "Portal Mitra",
      items: [
        { href: "/bank/overview", label: "Ringkasan", icon: LayoutDashboard, description: "Metrik portofolio & tren pipeline", keywords: ["dashboard", "portofolio"] },
        { href: "/bank/pipeline", label: "Pipeline IKM", icon: Workflow, description: "Daftar IKM dengan izin berbagi data", keywords: ["ikm", "usaha", "kandidat"] },
        { href: "/bank/applications", label: "Pengajuan", icon: ClipboardCheck, description: "Tinjau & putuskan status pengajuan", keywords: ["aplikasi", "review", "kredit"] },
        { href: "/bank/reports", label: "Laporan", icon: FileText, description: "Ringkasan portofolio pembiayaan hijau", keywords: ["ekspor", "unduh", "dokumen"] },
      ],
    },
  ],
  admin: [
    {
      label: "Platform",
      items: [
        { href: "/admin/overview", label: "Ringkasan", icon: LayoutDashboard, description: "Kesehatan platform & metrik global", keywords: ["dashboard", "sistem"] },
        { href: "/admin/users", label: "Pengguna", icon: Users, description: "Kelola akun IKM, bank & admin", keywords: ["akun", "user", "organisasi"] },
        { href: "/admin/devices", label: "Armada Perangkat", icon: Router, description: "Pemantauan seluruh unit sensor IoT", keywords: ["iot", "fleet", "sensor"] },
      ],
    },
    {
      label: "Tata Kelola",
      items: [
        { href: "/admin/data-quality", label: "Kualitas Data", icon: DatabaseZap, description: "Kelengkapan pembacaan & anomali", keywords: ["data", "validasi", "completeness"] },
        { href: "/admin/green-score", label: "Metodologi Score", icon: SlidersHorizontal, description: "Bobot & parameter kalkulasi skor", keywords: ["bobot", "rumus", "skor"] },
        { href: "/admin/audit-logs", label: "Log Audit", icon: ScrollText, description: "Jejak aktivitas & persetujuan data", keywords: ["log", "histori", "keamanan"] },
      ],
    },
  ],
};

export const PORTAL_META: Record<Portal, { label: string; shortLabel: string; description: string; icon: LucideIcon; home: string }> = {
  ikm: {
    label: "Aplikasi IKM",
    shortLabel: "Portal IKM",
    description: "Monitoring energi, M&V & kesiapan pembiayaan",
    icon: Building2,
    home: "/app/overview",
  },
  bank: {
    label: "Portal Mitra Keuangan",
    shortLabel: "Mitra Bank",
    description: "Evaluasi pipeline & pengajuan pembiayaan hijau",
    icon: Landmark,
    home: "/bank/overview",
  },
  admin: {
    label: "Admin EcoSME",
    shortLabel: "Admin",
    description: "Tata kelola armada IoT, kualitas data & metodologi",
    icon: ShieldCheck,
    home: "/admin/overview",
  },
};

/** Breadcrumb labels for path segments. */
export const SEGMENT_LABEL: Record<string, string> = {
  app: "IKM",
  bank: "Mitra",
  admin: "Admin",
  overview: "Ringkasan",
  energy: "Monitoring Energi",
  machines: "Mesin",
  alerts: "Peringatan",
  savings: "Penghematan",
  sustainability: "Keberlanjutan",
  "green-score": "Green Score",
  financing: "Kesiapan Pembiayaan",
  reports: "Laporan",
  devices: "Perangkat",
  settings: "Pengaturan",
  pipeline: "Pipeline IKM",
  applications: "Pengajuan",
  users: "Pengguna",
  "data-quality": "Kualitas Data",
  "audit-logs": "Log Audit",
};
