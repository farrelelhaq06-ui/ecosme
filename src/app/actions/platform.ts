"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth/session";
import type { ApplicationStatus } from "@/lib/domain/types";
import { audit, nextId, store } from "@/lib/store/platform-store";
import type { FormState } from "@/app/actions/auth";

/* ---------------- IKM ---------------- */

export async function acknowledgeAlerts(ids: string[]): Promise<void> {
  const s = await requireRole("ikm");
  const st = store();
  for (const id of ids) if (!st.acknowledgedAlerts.includes(id)) st.acknowledgedAlerts.push(id);
  audit(s.name, "ikm", `Menandai ${ids.length} peringatan sebagai ditangani`, ids.join(", ").slice(0, 80));
  revalidatePath("/app", "layout");
}

export async function reopenAlert(id: string): Promise<void> {
  await requireRole("ikm");
  const st = store();
  st.acknowledgedAlerts = st.acknowledgedAlerts.filter((x) => x !== id);
  revalidatePath("/app", "layout");
}

const tariffSchema = z.object({
  tariffGroup: z.string().trim().min(1, "Wajib diisi").max(20),
  baseRateIdrPerKwh: z.coerce.number().min(100, "Minimal Rp100").max(10000, "Maksimal Rp10.000"),
  peakMultiplier: z.coerce.number().min(1, "Minimal 1,0").max(3, "Maksimal 3,0"),
  peakStartHour: z.coerce.number().int().min(0).max(23),
  peakEndHour: z.coerce.number().int().min(1).max(24),
  emissionFactorKgPerKwh: z.coerce.number().min(0.1, "Minimal 0,1").max(1.5, "Maksimal 1,5"),
});

export async function saveTariffSettings(_p: FormState, fd: FormData): Promise<FormState> {
  const s = await requireRole("ikm");
  const parsed = tariffSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors, message: "Periksa kembali isian." };
  }
  if (parsed.data.peakEndHour <= parsed.data.peakStartHour) return { ok: false, fieldErrors: { peakEndHour: "Jam selesai harus setelah jam mulai" } };
  store().tariff = parsed.data;
  audit(s.name, "ikm", "Memperbarui asumsi tarif & faktor emisi", `${parsed.data.tariffGroup} Rp${parsed.data.baseRateIdrPerKwh}/kWh`);
  revalidatePath("/app", "layout");
  return { ok: true, message: "Pengaturan tersimpan. Seluruh estimasi telah dihitung ulang." };
}

export async function setConsent(granted: boolean): Promise<void> {
  const s = await requireRole("ikm");
  const st = store();
  st.consent = { ...st.consent, granted, grantedAt: granted ? new Date().toISOString() : null };
  audit(s.name, "ikm", granted ? "Memberikan persetujuan berbagi data" : "Mencabut persetujuan berbagi data", st.consent.partner);
  revalidatePath("/app", "layout");
  revalidatePath("/bank", "layout");
}

export async function setLegalDoc(kind: "nib" | "npwp" | "financials", fileName: string | null): Promise<void> {
  const s = await requireRole("ikm");
  const clean = fileName ? fileName.replace(/[^\w.\- ]/g, "").slice(0, 80) : null;
  store().legalDocs[kind] = clean;
  audit(s.name, "ikm", clean ? `Mencatat dokumen ${kind.toUpperCase()} (demo, file tidak diunggah)` : `Menghapus dokumen ${kind.toUpperCase()}`, clean ?? "-");
  revalidatePath("/app/financing");
}

const appSchema = z.object({
  project: z.string().trim().min(5, "Jelaskan proyek minimal 5 karakter").max(120),
  requestedIdr: z.coerce.number().min(10_000_000, "Minimal Rp10 juta").max(5_000_000_000, "Maksimal Rp5 miliar"),
});

export async function submitApplication(_p: FormState, fd: FormData): Promise<FormState> {
  const s = await requireRole("ikm");
  const st = store();
  if (!st.consent.granted) return { ok: false, message: "Berikan persetujuan berbagi data terlebih dahulu." };
  const parsed = appSchema.safeParse({ project: fd.get("project"), requestedIdr: String(fd.get("requestedIdr") ?? "").replace(/\D/g, "") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors };
  }
  const id = nextId("APP-2411");
  st.applications.unshift({
    id,
    businessId: "biz-demo-001",
    businessName: "CV Maju Logam Presisi",
    sector: "Fabrikasi komponen logam",
    city: "Sidoarjo, Jawa Timur",
    project: parsed.data.project,
    requestedIdr: parsed.data.requestedIdr,
    greenScore: 0,
    readinessPct: 0,
    monthlyKwh: 0,
    verifiedSavingsIdr: null,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    consentScope: st.consent.scope,
    partner: st.consent.partner,
    isDemoSeed: false,
  });
  audit(s.name, "ikm", "Mengajukan paket data pembiayaan", id);
  revalidatePath("/app/financing");
  revalidatePath("/bank", "layout");
  return { ok: true, message: `Paket data ${id} terkirim ke ${st.consent.partner}. Keputusan pembiayaan sepenuhnya kewenangan mitra.` };
}

const deviceSchema = z.object({
  serial: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ESM-[A-Z0-9]{3}-[0-9]{7}$/, "Format serial: ESM-XXX-1234567 (tertera pada label perangkat)"),
  machineName: z.string().trim().min(3, "Nama mesin minimal 3 karakter").max(60),
  ratedPowerKw: z.coerce.number().min(0.1, "Minimal 0,1 kW").max(2000, "Maksimal 2.000 kW"),
});

export async function pairDevice(_p: FormState, fd: FormData): Promise<FormState> {
  const s = await requireRole("ikm");
  const parsed = deviceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors };
  }
  const st = store();
  if (st.pairedDevices.some((d) => d.serial === parsed.data.serial)) return { ok: false, fieldErrors: { serial: "Serial sudah terdaftar" } };
  st.pairedDevices.push({ id: nextId("DEV"), ...parsed.data, pairedAt: new Date().toISOString() });
  audit(s.name, "ikm", "Mendaftarkan perangkat baru (menunggu data pertama)", parsed.data.serial);
  revalidatePath("/app/devices");
  return { ok: true, message: "Perangkat terdaftar. Status: menunggu data pertama dari perangkat." };
}

export async function removePairedDevice(id: string): Promise<void> {
  const s = await requireRole("ikm");
  const st = store();
  st.pairedDevices = st.pairedDevices.filter((d) => d.id !== id);
  audit(s.name, "ikm", "Menghapus pendaftaran perangkat", id);
  revalidatePath("/app/devices");
}

/* ---------------- Bank ---------------- */

const STATUSES: ApplicationStatus[] = ["submitted", "under_review", "info_requested", "approved_in_principle", "declined"];

export async function updateApplicationStatus(id: string, status: ApplicationStatus, note: string): Promise<{ ok: boolean; message: string }> {
  const s = await requireRole("bank");
  if (!STATUSES.includes(status)) return { ok: false, message: "Status tidak valid" };
  const app = store().applications.find((a) => a.id === id);
  if (!app) return { ok: false, message: "Pengajuan tidak ditemukan" };
  app.status = status;
  audit(s.name, "bank", `Mengubah status pengajuan → ${status}${note ? ` (${note.slice(0, 60)})` : ""}`, id);
  revalidatePath("/bank", "layout");
  revalidatePath("/app/financing");
  return { ok: true, message: "Status diperbarui." };
}

export async function logReportDownload(target: string): Promise<void> {
  const s = await getSession();
  if (!s) return;
  audit(s.name, s.role, "Mengunduh / mencetak laporan", target);
}

/* ---------------- Admin ---------------- */

const weightSchema = z.object({
  intensity: z.coerce.number().int().min(0).max(100),
  verified_savings: z.coerce.number().int().min(0).max(100),
  data_quality: z.coerce.number().int().min(0).max(100),
  peak_load: z.coerce.number().int().min(0).max(100),
  power_factor: z.coerce.number().int().min(0).max(100),
});

export async function saveWeights(_p: FormState, fd: FormData): Promise<FormState> {
  const s = await requireRole("admin");
  const parsed = weightSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Bobot harus bilangan bulat 0–100." };
  const sum = Object.values(parsed.data).reduce((a, b) => a + b, 0);
  if (sum !== 100) return { ok: false, message: `Total bobot harus 100 (saat ini ${sum}).` };
  store().weights = parsed.data;
  audit(s.name, "admin", "Memperbarui bobot metodologi Green Score", JSON.stringify(parsed.data));
  revalidatePath("/", "layout");
  return { ok: true, message: "Bobot tersimpan dan diterapkan ke seluruh perhitungan Green Score." };
}

export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<void> {
  const s = await requireRole("admin");
  const u = store().users.find((x) => x.id === id);
  if (!u || u.id === s.sub) return;
  u.status = status;
  audit(s.name, "admin", status === "suspended" ? "Menangguhkan pengguna" : "Mengaktifkan pengguna", u.email);
  revalidatePath("/admin/users");
}

const inviteSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  role: z.enum(["ikm", "bank", "admin"]),
  organization: z.string().trim().min(2, "Organisasi wajib diisi"),
});

export async function inviteUser(_p: FormState, fd: FormData): Promise<FormState> {
  const s = await requireRole("admin");
  const parsed = inviteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors };
  }
  const st = store();
  if (st.users.some((u) => u.email === parsed.data.email)) return { ok: false, fieldErrors: { email: "Email sudah terdaftar" } };
  st.users.push({ id: nextId("usr"), ...parsed.data, status: "invited", lastActive: new Date().toISOString() });
  audit(s.name, "admin", "Mengundang pengguna (email tidak dikirim di mode demo)", parsed.data.email);
  revalidatePath("/admin/users");
  return { ok: true, message: "Undangan tercatat. Di mode demo, email undangan tidak dikirim." };
}
