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

export interface NavDimension {
  key: string;
  label: string;
  href: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  keywords?: string[];
  dimensions?: NavDimension[];
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
        {
          href: "/app/overview",
          label: "Ringkasan",
          icon: LayoutDashboard,
          description: "KPI utama, tren & rekomendasi",
          keywords: ["dashboard", "home", "kpi"],
        },
        {
          href: "/app/energy",
          label: "Monitoring Energi",
          icon: Zap,
          description: "Konsumsi kWh, beban WBP/LWBP & kualitas daya",
          keywords: ["listrik", "kwh", "tarif", "wbp", "pf", "tegangan"],
          dimensions: [
            { key: "consumption", label: "Tren & Profil 24 Jam", href: "/app/energy?dim=consumption" },
            { key: "tariff", label: "Biaya & Tarif WBP/LWBP", href: "/app/energy?dim=tariff" },
            { key: "quality", label: "Kualitas Daya (PF, V, A)", href: "/app/energy?dim=quality" },
            { key: "intervals", label: "Log Interval Sensor", href: "/app/energy?dim=intervals" },
          ],
        },
        {
          href: "/app/machines",
          label: "Mesin",
          icon: Cpu,
          description: "Profil beban, jadwal & efisiensi per mesin",
          keywords: ["kompresor", "oven", "cnc", "las", "utilisasi"],
          dimensions: [
            { key: "overview", label: "Matriks & Detail Mesin", href: "/app/machines?dim=overview" },
            { key: "comparison", label: "Perbandingan Beban & Biaya", href: "/app/machines?dim=comparison" },
            { key: "schedule", label: "Jadwal vs Jam Idle", href: "/app/machines?dim=schedule" },
            { key: "telemetry", label: "Tabel Spesifikasi & IoT", href: "/app/machines?dim=telemetry" },
          ],
        },
        {
          href: "/app/alerts",
          label: "Peringatan",
          icon: Bell,
          description: "Anomali beban, PF, jam malam & perangkat",
          keywords: ["notifikasi", "anomali", "bahaya", "overload"],
          dimensions: [
            { key: "active", label: "Tindak Lanjut Peringatan", href: "/app/alerts?dim=active" },
            { key: "category", label: "Dimensi Kategori Anomali", href: "/app/alerts?dim=category" },
            { key: "rules", label: "Aturan & Ambang Batas", href: "/app/alerts?dim=rules" },
          ],
        },
      ],
    },
    {
      label: "Kinerja",
      items: [
        {
          href: "/app/savings",
          label: "Penghematan (M&V)",
          icon: PiggyBank,
          description: "Verifikasi hemat vs baseline IPMVP",
          keywords: ["ipmvp", "baseline", "hemat", "rupiah", "roi"],
          dimensions: [
            { key: "verification", label: "Verifikasi & Periode M&V", href: "/app/savings?dim=verification" },
            { key: "baseline", label: "Model Baseline & Regresi", href: "/app/savings?dim=baseline" },
            { key: "measures", label: "Tindakan Efisiensi & ROI", href: "/app/savings?dim=measures" },
            { key: "simulator", label: "Kalkulator Proyeksi M&V", href: "/app/savings?dim=simulator" },
          ],
        },
        {
          href: "/app/sustainability",
          label: "Keberlanjutan",
          icon: Leaf,
          description: "Jejak karbon & intensitas emisi",
          keywords: ["emisi", "co2", "karbon", "esg", "plts"],
          dimensions: [
            { key: "footprint", label: "Jejak Karbon & Tren CO₂e", href: "/app/sustainability?dim=footprint" },
            { key: "machines", label: "Kontribusi Emisi Mesin", href: "/app/sustainability?dim=machines" },
            { key: "intensity", label: "Intensitas Karbon Produksi", href: "/app/sustainability?dim=intensity" },
            { key: "decarbonization", label: "Simulasi Dekarbonisasi", href: "/app/sustainability?dim=decarbonization" },
          ],
        },
        {
          href: "/app/green-score",
          label: "Green Score",
          icon: Gauge,
          description: "Skor kinerja efisiensi 0–100",
          keywords: ["skor", "grade", "rating", "bobot", "simulasi"],
          dimensions: [
            { key: "breakdown", label: "Rincian 5 Komponen Skor", href: "/app/green-score?dim=breakdown" },
            { key: "history", label: "Tren Historis & Benchmark", href: "/app/green-score?dim=history" },
            { key: "simulator", label: "Simulator Peningkatan Skor", href: "/app/green-score?dim=simulator" },
            { key: "methodology", label: "Metodologi & Aturan Bobot", href: "/app/green-score?dim=methodology" },
          ],
        },
      ],
    },
    {
      label: "Pembiayaan",
      items: [
        {
          href: "/app/financing",
          label: "Kesiapan Pembiayaan",
          icon: Handshake,
          description: "Checklist dokumen & izin berbagi data",
          keywords: ["bank", "kredit", "pinjaman", "dokumen", "consent", "cicilan"],
          dimensions: [
            { key: "checklist", label: "Checklist & Skor Kesiapan", href: "/app/financing?dim=checklist" },
            { key: "documents", label: "Dokumen Legal & Persetujuan", href: "/app/financing?dim=documents" },
            { key: "applications", label: "Pengajuan & Status Mitra", href: "/app/financing?dim=applications" },
            { key: "simulator", label: "Simulator Kredit Hijau", href: "/app/financing?dim=simulator" },
          ],
        },
        {
          href: "/app/reports",
          label: "Laporan",
          icon: FileText,
          description: "Ekspor paket data & laporan M&V",
          keywords: ["unduh", "pdf", "csv", "ekspor", "cetak", "audit"],
          dimensions: [
            { key: "packages", label: "Paket Laporan Resmi", href: "/app/reports?dim=packages" },
            { key: "preview", label: "Pratinjau Eksekutif & M&V", href: "/app/reports?dim=preview" },
            { key: "export", label: "Ekspor CSV & Dataset Mentah", href: "/app/reports?dim=export" },
            { key: "history", label: "Riwayat Unduhan & Audit", href: "/app/reports?dim=history" },
          ],
        },
      ],
    },
    {
      label: "Sistem",
      items: [
        {
          href: "/app/devices",
          label: "Perangkat IoT",
          icon: Router,
          description: "Status sensor & kelengkapan data",
          keywords: ["sensor", "meter", "online", "offline", "pairing", "firmware"],
          dimensions: [
            { key: "fleet", label: "Status Sensor & Konektivitas", href: "/app/devices?dim=fleet" },
            { key: "quality", label: "Kelengkapan Data & Celah", href: "/app/devices?dim=quality" },
            { key: "pairing", label: "Registrasi & Pairing Sensor", href: "/app/devices?dim=pairing" },
            { key: "diagnostics", label: "Diagnostik Sinyal & Firmware", href: "/app/devices?dim=diagnostics" },
          ],
        },
        {
          href: "/app/settings",
          label: "Pengaturan",
          icon: Settings,
          description: "Profil usaha, tarif & parameter",
          keywords: ["profil", "akun", "konfigurasi", "tarif", "emisi", "privasi"],
          dimensions: [
            { key: "profile", label: "Profil Usaha & Fasilitas", href: "/app/settings?dim=profile" },
            { key: "tariff", label: "Tarif Listrik & Faktor Emisi", href: "/app/settings?dim=tariff" },
            { key: "targets", label: "Target Efisiensi & Notifikasi", href: "/app/settings?dim=targets" },
            { key: "governance", label: "Keamanan, Privasi & Audit", href: "/app/settings?dim=governance" },
          ],
        },
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
