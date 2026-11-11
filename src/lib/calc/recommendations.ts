import type { Alert, TariffSettings } from "@/lib/domain/types";
import type { EnergyTotals, MachineBreakdown } from "@/lib/calc/energy";
import { fmtIdr, fmtNumber } from "@/lib/utils";

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: string;
  priority: "tinggi" | "sedang" | "rendah";
  href: string;
}

export interface RecommendationInputs {
  breakdown: MachineBreakdown[];
  alerts: Alert[];
  totals: EnergyTotals;
  rangeDays: number;
  tariff: TariffSettings;
  /** kWh consumed in WBP by the oven over the range. */
  ovenPeakKwh: number;
  completeness: number;
}

/** Rule-based next-best actions. Monetary values are ESTIMATES. */
export function buildRecommendations(i: RecommendationInputs): Recommendation[] {
  const recs: Recommendation[] = [];
  const perMonth = 30 / Math.max(1, i.rangeDays);

  if (i.alerts.some((a) => a.type === "device_offline" && a.severity === "critical")) {
    recs.push({
      id: "fix-offline",
      title: "Pulihkan perangkat yang offline",
      detail: "Data yang hilang menurunkan akurasi baseline, perhitungan penghematan, dan Green Score.",
      impact: `Kelengkapan data saat ini ${fmtNumber(i.completeness * 100, 1)}%`,
      priority: "tinggi",
      href: "/app/devices",
    });
  }

  if (i.ovenPeakKwh > 0) {
    const premium = i.tariff.baseRateIdrPerKwh * (i.tariff.peakMultiplier - 1);
    const monthly = i.ovenPeakKwh * premium * perMonth;
    recs.push({
      id: "shift-oven",
      title: "Geser jadwal oven pengecatan keluar jam WBP",
      detail: `Oven beroperasi pada ${i.tariff.peakStartHour}.00–${i.tariff.peakEndHour}.00 saat lembur. Memindahkan ke pagi hari menghindari selisih tarif WBP.`,
      impact: `Estimasi ±${fmtIdr(monthly)}/bulan`,
      priority: monthly > 500_000 ? "tinggi" : "sedang",
      href: "/app/machines",
    });
  }

  const offHours = i.alerts.filter((a) => a.type === "off_hours");
  if (offHours.length) {
    recs.push({
      id: "shutdown-sop",
      title: "Terapkan SOP shutdown akhir shift",
      detail: `${offHours.length} kejadian mesin menyala di luar jam operasi terdeteksi. Tetapkan checklist dan penanggung jawab shift malam.`,
      impact: "Menghindari konsumsi tanpa produksi",
      priority: "sedang",
      href: "/app/alerts",
    });
  }

  const lowPf = i.breakdown.filter((b) => b.avgPowerFactor !== null && b.avgPowerFactor < 0.85);
  if (lowPf.length) {
    recs.push({
      id: "pf-correction",
      title: `Kaji koreksi faktor daya untuk ${lowPf.map((b) => b.name).join(", ")}`,
      detail: "PF di bawah 0,85 meningkatkan arus dan rugi-rugi kabel, serta berpotensi dikenakan biaya kVARh oleh PLN.",
      impact: `PF terendah ${fmtNumber(Math.min(...lowPf.map((b) => b.avgPowerFactor ?? 1)), 2)}`,
      priority: "sedang",
      href: "/app/energy",
    });
  }

  recs.push({
    id: "plan-mv",
    title: "Siapkan baseline untuk tindakan hemat energi berikutnya",
    detail: "Catat tanggal implementasi dan data produksi harian agar penghematan dapat diukur dan diverifikasi.",
    impact: "Syarat penghematan terverifikasi",
    priority: "rendah",
    href: "/app/savings",
  });

  const rank = { tinggi: 0, sedang: 1, rendah: 2 } as const;
  return recs.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
