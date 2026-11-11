import "server-only";
import type { AuditLog, FinancingApplication, PlatformUser, Role, TariffSettings } from "@/lib/domain/types";
import { DEFAULT_GREEN_SCORE_WEIGHTS, DEFAULT_TARIFF, type GreenScoreWeights } from "@/lib/config";

/**
 * In-memory platform state for DEMO mode.
 *
 * LIMITATION: state lives in server memory and resets when the server
 * restarts. In production these collections map to database tables (see
 * supabase/schema.sql).
 */

export interface ConsentState {
  granted: boolean;
  partner: string;
  scope: string[];
  grantedAt: string | null;
}

export interface FleetDevice {
  id: string;
  organization: string;
  machine: string;
  status: "online" | "degraded" | "offline";
  lastSeen: string;
  completeness: number; // 0..1, last 7 days
  firmware: string;
}

export interface PairedDevice {
  id: string;
  serial: string;
  machineName: string;
  ratedPowerKw: number;
  pairedAt: string;
}

interface PlatformState {
  weights: GreenScoreWeights;
  tariff: TariffSettings;
  applications: FinancingApplication[];
  audit: AuditLog[];
  users: PlatformUser[];
  consent: ConsentState;
  legalDocs: { nib: string | null; npwp: string | null; financials: string | null };
  acknowledgedAlerts: string[];
  pairedDevices: PairedDevice[];
  fleet: FleetDevice[];
  seq: number;
}

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function seed(): PlatformState {
  const applications: FinancingApplication[] = [
    {
      id: "APP-2410-001",
      businessId: "biz-demo-001",
      businessName: "CV Maju Logam Presisi",
      sector: "Fabrikasi komponen logam",
      city: "Sidoarjo, Jawa Timur",
      project: "Kapasitor bank & VSD kompresor tahap 2",
      requestedIdr: 145_000_000,
      greenScore: 0, // resolved live from the IKM dataset
      readinessPct: 0,
      monthlyKwh: 0,
      verifiedSavingsIdr: null,
      status: "under_review",
      submittedAt: ago(24 * 6),
      consentScope: ["Ringkasan energi bulanan", "Laporan M&V", "Green Score & rinciannya"],
      partner: "Bank Mitra (Demo)",
      isDemoSeed: false,
    },
    { id: "APP-2410-002", businessId: "biz-seed-002", businessName: "UD Tenun Sari Lestari", sector: "Tekstil tenun", city: "Pekalongan, Jawa Tengah", project: "Penggantian motor tenun efisiensi tinggi (IE3)", requestedIdr: 250_000_000, greenScore: 71, readinessPct: 82, monthlyKwh: 9_800, verifiedSavingsIdr: 3_100_000, status: "under_review", submittedAt: ago(24 * 9), consentScope: ["Ringkasan energi bulanan", "Laporan M&V", "Green Score & rinciannya"], partner: "Bank Mitra (Demo)", isDemoSeed: true },
    { id: "APP-2410-003", businessId: "biz-seed-003", businessName: "CV Rasa Nusantara Food", sector: "Pengolahan makanan", city: "Bandung, Jawa Barat", project: "Cold storage dengan kompresor inverter", requestedIdr: 180_000_000, greenScore: 64, readinessPct: 75, monthlyKwh: 14_200, verifiedSavingsIdr: null, status: "submitted", submittedAt: ago(30), consentScope: ["Ringkasan energi bulanan", "Green Score & rinciannya"], partner: "Bank Mitra (Demo)", isDemoSeed: true },
    { id: "APP-2410-004", businessId: "biz-seed-004", businessName: "PT Kayu Jati Kreasi", sector: "Furnitur kayu", city: "Jepara, Jawa Tengah", project: "PLTS atap 40 kWp", requestedIdr: 520_000_000, greenScore: 78, readinessPct: 90, monthlyKwh: 21_500, verifiedSavingsIdr: 4_600_000, status: "approved_in_principle", submittedAt: ago(24 * 21), consentScope: ["Ringkasan energi bulanan", "Laporan M&V", "Green Score & rinciannya", "Data per jam"], partner: "Bank Mitra (Demo)", isDemoSeed: true },
    { id: "APP-2410-005", businessId: "biz-seed-005", businessName: "CV Plastik Mandiri Jaya", sector: "Plastik injeksi", city: "Tangerang, Banten", project: "Retrofit heater band & VSD mesin injeksi", requestedIdr: 310_000_000, greenScore: 55, readinessPct: 60, monthlyKwh: 32_000, verifiedSavingsIdr: null, status: "info_requested", submittedAt: ago(24 * 14), consentScope: ["Ringkasan energi bulanan"], partner: "Bank Mitra (Demo)", isDemoSeed: true },
    { id: "APP-2410-006", businessId: "biz-seed-006", businessName: "UD Keramik Bumi Lestari", sector: "Keramik & gerabah", city: "Purwakarta, Jawa Barat", project: "Tungku (kiln) efisiensi tinggi", requestedIdr: 450_000_000, greenScore: 48, readinessPct: 52, monthlyKwh: 41_000, verifiedSavingsIdr: null, status: "declined", submittedAt: ago(24 * 33), consentScope: ["Ringkasan energi bulanan", "Green Score & rinciannya"], partner: "Bank Mitra (Demo)", isDemoSeed: true },
  ];

  const users: PlatformUser[] = [
    { id: "usr-ikm-001", name: "Rina Wulandari", email: "rina@demo.ecosme.id", role: "ikm", organization: "CV Maju Logam Presisi", status: "active", lastActive: ago(0.2) },
    { id: "usr-ikm-002", name: "Bagus Santoso", email: "bagus@demo.ecosme.id", role: "ikm", organization: "CV Maju Logam Presisi", status: "active", lastActive: ago(5) },
    { id: "usr-ikm-003", name: "Dewi Lestari", email: "dewi@tenunsari.demo", role: "ikm", organization: "UD Tenun Sari Lestari", status: "active", lastActive: ago(26) },
    { id: "usr-ikm-004", name: "Hendra Gunawan", email: "hendra@rasanusantara.demo", role: "ikm", organization: "CV Rasa Nusantara Food", status: "active", lastActive: ago(50) },
    { id: "usr-ikm-005", name: "Yusuf Hidayat", email: "yusuf@kayujati.demo", role: "ikm", organization: "PT Kayu Jati Kreasi", status: "active", lastActive: ago(8) },
    { id: "usr-ikm-006", name: "Maya Kartika", email: "maya@plastikmandiri.demo", role: "ikm", organization: "CV Plastik Mandiri Jaya", status: "invited", lastActive: ago(24 * 4) },
    { id: "usr-bank-001", name: "Andi Pratama", email: "andi@bankmitra.demo", role: "bank", organization: "Bank Mitra (Demo)", status: "active", lastActive: ago(1) },
    { id: "usr-bank-002", name: "Lia Permata", email: "lia@bankmitra.demo", role: "bank", organization: "Bank Mitra (Demo)", status: "suspended", lastActive: ago(24 * 40) },
    { id: "usr-adm-001", name: "Sari Nugroho", email: "sari@ecosme.id", role: "admin", organization: "EcoSME", status: "active", lastActive: ago(0.5) },
  ];

  const audit: AuditLog[] = [
    { id: "log-0001", at: ago(24 * 6), actor: "Rina Wulandari", role: "ikm", action: "Mengajukan paket data pembiayaan", target: "APP-2410-001" },
    { id: "log-0002", at: ago(24 * 6 + 1), actor: "Rina Wulandari", role: "ikm", action: "Memberikan persetujuan berbagi data", target: "Bank Mitra (Demo)" },
    { id: "log-0003", at: ago(24 * 5), actor: "Andi Pratama", role: "bank", action: "Mengubah status pengajuan → Dalam peninjauan", target: "APP-2410-001" },
    { id: "log-0004", at: ago(24 * 3), actor: "Sistem", role: "system", action: "Menandai 12 pembacaan tegangan di luar rentang", target: "CV Maju Logam Presisi" },
    { id: "log-0005", at: ago(29), actor: "Sistem", role: "system", action: "Perangkat tidak mengirim data (offline)", target: "DEV-1005" },
    { id: "log-0006", at: ago(20), actor: "Sari Nugroho", role: "admin", action: "Mengundang pengguna", target: "maya@plastikmandiri.demo" },
    { id: "log-0007", at: ago(3), actor: "Andi Pratama", role: "bank", action: "Mengunduh laporan kesiapan pembiayaan", target: "APP-2410-004" },
  ];

  const fleet: FleetDevice[] = [
    { id: "DEV-2001", organization: "UD Tenun Sari Lestari", machine: "Panel utama", status: "online", lastSeen: ago(0.05), completeness: 0.992, firmware: "1.4.2" },
    { id: "DEV-2002", organization: "UD Tenun Sari Lestari", machine: "Mesin tenun lini 1", status: "online", lastSeen: ago(0.08), completeness: 0.985, firmware: "1.4.2" },
    { id: "DEV-3001", organization: "CV Rasa Nusantara Food", machine: "Cold storage", status: "degraded", lastSeen: ago(0.6), completeness: 0.912, firmware: "1.3.9" },
    { id: "DEV-4001", organization: "PT Kayu Jati Kreasi", machine: "Panel utama", status: "online", lastSeen: ago(0.03), completeness: 0.997, firmware: "1.4.2" },
    { id: "DEV-4002", organization: "PT Kayu Jati Kreasi", machine: "Dust collector", status: "online", lastSeen: ago(0.04), completeness: 0.994, firmware: "1.4.2" },
    { id: "DEV-5001", organization: "CV Plastik Mandiri Jaya", machine: "Mesin injeksi 1", status: "offline", lastSeen: ago(76), completeness: 0.61, firmware: "1.2.0" },
  ];

  return {
    weights: { ...DEFAULT_GREEN_SCORE_WEIGHTS },
    tariff: { ...DEFAULT_TARIFF },
    applications,
    audit,
    users,
    consent: { granted: true, partner: "Bank Mitra (Demo)", scope: ["Ringkasan energi bulanan", "Laporan M&V", "Green Score & rinciannya"], grantedAt: ago(24 * 6 + 1) },
    legalDocs: { nib: "NIB_CV_Maju_Logam.pdf", npwp: null, financials: null },
    acknowledgedAlerts: [],
    pairedDevices: [],
    fleet,
    seq: 100,
  };
}

const g = globalThis as unknown as { __ecosmeStore?: PlatformState };

export function store(): PlatformState {
  if (!g.__ecosmeStore) g.__ecosmeStore = seed();
  return g.__ecosmeStore;
}

export function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}-${s.seq}`;
}

export function audit(actor: string, role: Role | "system", action: string, target: string) {
  store().audit.unshift({ id: nextId("log"), at: new Date().toISOString(), actor, role, action, target });
}
