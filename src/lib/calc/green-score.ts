import type { GreenScoreComponent, GreenScoreResult } from "@/lib/domain/types";
import type { GreenScoreWeights } from "@/lib/config";
import { clamp, fmtNumber, fmtPct } from "@/lib/utils";

export interface GreenScoreInputs {
  /** Improvement of kWh/unit vs baseline, in % (positive = better). Null if no baseline. */
  intensityImprovementPct: number | null;
  /** Savings % of latest VERIFIED period. Null if none verified. */
  verifiedSavingsPct: number | null;
  /** Data completeness 0..1. */
  completeness: number;
  /** Share of kWh consumed in WBP hours 0..1. */
  peakShare: number;
  /** Energy-weighted average power factor. */
  avgPowerFactor: number | null;
  periodLabel: string;
}

/**
 * EcoSME Green Score — transparent, rule-based internal indicator (0–100).
 * NOT an ESG certification and NOT a credit score.
 *
 * Component scoring (linear, clamped to 0–100):
 *  - intensity:        0% → 0,  25% improvement → 100
 *  - verified_savings: 0% → 0,  20% verified savings → 100; none verified → 0
 *  - data_quality:     85% completeness → 0, 100% → 100
 *  - peak_load:        WBP share 40% → 0, 10% → 100
 *  - power_factor:     PF 0,75 → 0, 0,95 → 100
 */
export function computeGreenScore(i: GreenScoreInputs, w: GreenScoreWeights): GreenScoreResult {
  const components: GreenScoreComponent[] = [
    {
      key: "intensity",
      label: "Perbaikan intensitas energi",
      weight: w.intensity,
      score: i.intensityImprovementPct === null ? 0 : clamp((i.intensityImprovementPct / 25) * 100),
      rawValue: i.intensityImprovementPct === null ? "Baseline belum ada" : `${fmtPct(i.intensityImprovementPct)} vs baseline`,
      explanation: "Penurunan kWh per unit produksi dibanding baseline. 25% atau lebih = skor penuh.",
    },
    {
      key: "verified_savings",
      label: "Penghematan terverifikasi",
      weight: w.verified_savings,
      score: i.verifiedSavingsPct === null ? 0 : clamp((i.verifiedSavingsPct / 20) * 100),
      rawValue: i.verifiedSavingsPct === null ? "Belum tersedia" : `${fmtPct(i.verifiedSavingsPct)} terverifikasi`,
      explanation: "Hanya periode M&V yang telah diverifikasi yang dihitung. 20% atau lebih = skor penuh.",
    },
    {
      key: "data_quality",
      label: "Kelengkapan & kualitas data",
      weight: w.data_quality,
      score: clamp(((i.completeness - 0.85) / 0.15) * 100),
      rawValue: `${fmtPct(i.completeness * 100)} lengkap`,
      explanation: "Persentase interval data per jam yang diterima. 85% atau kurang = 0; 100% = skor penuh.",
    },
    {
      key: "peak_load",
      label: "Manajemen beban puncak (WBP)",
      weight: w.peak_load,
      score: clamp(((0.4 - i.peakShare) / 0.3) * 100),
      rawValue: `${fmtPct(i.peakShare * 100)} kWh di jam WBP`,
      explanation: "Porsi konsumsi pada jam beban puncak. 10% atau kurang = skor penuh; 40% atau lebih = 0.",
    },
    {
      key: "power_factor",
      label: "Faktor daya",
      weight: w.power_factor,
      score: i.avgPowerFactor === null ? 0 : clamp(((i.avgPowerFactor - 0.75) / 0.2) * 100),
      rawValue: i.avgPowerFactor === null ? "Tidak ada data" : `PF rata-rata ${fmtNumber(i.avgPowerFactor, 2)}`,
      explanation: "Faktor daya tertimbang energi. 0,95 atau lebih = skor penuh; 0,75 atau kurang = 0.",
    },
  ];
  const weightSum = components.reduce((s, c) => s + c.weight, 0) || 1;
  const total = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0) / weightSum);
  const grade = total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : "D";
  return { total, grade, components: components.map((c) => ({ ...c, score: Math.round(c.score) })), periodLabel: i.periodLabel };
}

export function gradeLabel(grade: GreenScoreResult["grade"]): string {
  return { A: "Sangat baik", B: "Baik", C: "Cukup", D: "Perlu perbaikan" }[grade];
}
