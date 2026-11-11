import "server-only";
import type { FinancingApplication } from "@/lib/domain/types";
import { computeTotals } from "@/lib/calc/energy";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { store } from "@/lib/store/platform-store";
import { getGreenScore, getIkmContext, getSavings } from "@/lib/services/ikm";

/* ------------------------------------------------------------------ */
/* Financing readiness (IKM side)                                      */
/* ------------------------------------------------------------------ */

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  detail: string;
  href: string;
}

export async function getReadiness() {
  const ctx = await getIkmContext();
  const [savings, green] = await Promise.all([getSavings(), getGreenScore()]);
  const s = store();
  const months = (ctx.latest.getTime() - ctx.earliest.getTime()) / (30 * DAY_MS);
  const completeness = green.current.inputs.completeness;
  const items: ReadinessItem[] = [
    { key: "history", label: "Riwayat data energi ≥ 3 bulan", done: months >= 3, detail: `${months.toFixed(1)} bulan data tersedia`, href: "/app/energy" },
    { key: "quality", label: "Kelengkapan data ≥ 95%", done: completeness >= 0.95, detail: `${(completeness * 100).toFixed(1)}% (30 hari terakhir)`, href: "/app/devices" },
    { key: "baseline", label: "Baseline terdokumentasi", done: !!savings.baseline && !!savings.adequacy?.ok, detail: savings.baseline ? `R² ${savings.baseline.r2.toFixed(2)}, ${savings.baseline.days} hari` : "Belum ada", href: "/app/savings" },
    { key: "verified", label: "Minimal 1 periode penghematan terverifikasi", done: !!savings.verified, detail: savings.verified ? `${savings.verified.periods} periode terverifikasi` : "Belum ada", href: "/app/savings" },
    { key: "score", label: "Green Score dihitung (≥ 60 disarankan)", done: green.current.result.total >= 60, detail: `Skor saat ini ${green.current.result.total}`, href: "/app/green-score" },
    { key: "nib", label: "Dokumen legalitas usaha (NIB)", done: !!s.legalDocs.nib, detail: s.legalDocs.nib ?? "Belum diunggah", href: "/app/financing#documents" },
    { key: "npwp", label: "NPWP badan usaha", done: !!s.legalDocs.npwp, detail: s.legalDocs.npwp ?? "Belum diunggah", href: "/app/financing#documents" },
    { key: "financials", label: "Laporan keuangan sederhana 12 bulan", done: !!s.legalDocs.financials, detail: s.legalDocs.financials ?? "Belum diunggah", href: "/app/financing#documents" },
    { key: "consent", label: "Persetujuan berbagi data ke mitra", done: s.consent.granted, detail: s.consent.granted ? `Kepada ${s.consent.partner}` : "Belum diberikan", href: "/app/financing#consent" },
  ];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, pct, consent: s.consent, legalDocs: s.legalDocs };
}

/* ------------------------------------------------------------------ */
/* Bank pipeline                                                       */
/* ------------------------------------------------------------------ */

/**
 * Applications visible to the bank partner. The EcoSME demo IKM's record is
 * resolved LIVE from its dataset (only if consent is granted); the others are
 * clearly flagged seed records (`isDemoSeed`).
 */
export async function getApplications(): Promise<FinancingApplication[]> {
  const s = store();
  const ctx = await getIkmContext();
  const [green, savings, readiness] = await Promise.all([getGreenScore(), getSavings(), getReadiness()]);
  const to = new Date(ctx.latest.getTime() + HOUR_MS);
  const rs = await ctx.ds.getReadings({ from: new Date(to.getTime() - 30 * DAY_MS), to });
  const monthlyKwh = computeTotals(rs, ctx.tariff).kwh;

  return s.applications
    .filter((a) => a.businessId !== "biz-demo-001" || s.consent.granted)
    .map((a) =>
      a.businessId === "biz-demo-001"
        ? {
            ...a,
            greenScore: green.current.result.total,
            readinessPct: readiness.pct,
            monthlyKwh: Math.round(monthlyKwh),
            verifiedSavingsIdr: savings.verified ? Math.round(savings.verified.idr / savings.verified.periods) : null,
          }
        : a,
    );
}

export const STATUS_LABEL: Record<FinancingApplication["status"], string> = {
  submitted: "Baru diajukan",
  under_review: "Dalam peninjauan",
  info_requested: "Perlu info tambahan",
  approved_in_principle: "Disetujui prinsip",
  declined: "Tidak dilanjutkan",
};

export const STATUS_TONE: Record<FinancingApplication["status"], "info" | "warning" | "brand" | "danger" | "neutral"> = {
  submitted: "info",
  under_review: "neutral",
  info_requested: "warning",
  approved_in_principle: "brand",
  declined: "danger",
};
