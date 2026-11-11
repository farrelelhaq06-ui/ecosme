import type { TariffSettings } from "@/lib/domain/types";

/**
 * Default cost & emission assumptions.
 * IMPORTANT: these are configurable ASSUMPTIONS for estimation. Users must
 * verify tariffs against their own PLN bill and emission factors against the
 * latest official publication.
 */
export const DEFAULT_TARIFF: TariffSettings = {
  tariffGroup: "I-3/TM",
  baseRateIdrPerKwh: 1114.74,
  peakMultiplier: 1.4,
  peakStartHour: 17,
  peakEndHour: 22,
  emissionFactorKgPerKwh: 0.87,
};

export const TARIFF_NOTE =
  "Tarif dasar dan faktor WBP adalah asumsi yang dapat diubah di Pengaturan. Verifikasi dengan tagihan PLN Anda.";

export const EMISSION_NOTE =
  "Emisi dihitung dari kWh × faktor emisi grid (asumsi, dapat diubah). Angka ini adalah estimasi, bukan hasil verifikasi independen.";

export const GREEN_SCORE_DISCLAIMER =
  "EcoSME Green Score adalah indikator kinerja internal. Bukan sertifikasi ESG resmi dan bukan skor kredit. Keputusan pembiayaan sepenuhnya merupakan kewenangan lembaga keuangan.";

export const DEFAULT_GREEN_SCORE_WEIGHTS = {
  intensity: 30,
  verified_savings: 20,
  data_quality: 20,
  peak_load: 15,
  power_factor: 15,
} as const;

export type GreenScoreWeights = Record<keyof typeof DEFAULT_GREEN_SCORE_WEIGHTS, number>;

export interface PricingPlan {
  id: "basic" | "growth" | "pro";
  name: string;
  priceIdr: number;
  tagline: string;
  devices: string;
  features: string[];
  highlighted?: boolean;
}

/** Proposed / demo prices — NOT validated market prices. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    priceIdr: 149_000,
    tagline: "Mulai memahami pola konsumsi listrik.",
    devices: "Hingga 3 titik ukur",
    features: [
      "Dashboard energi & biaya",
      "Riwayat data 3 bulan",
      "Alert dasar (offline, beban lebih)",
      "Laporan bulanan PDF",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceIdr: 349_000,
    tagline: "Optimasi per mesin dan pengukuran penghematan.",
    devices: "Hingga 10 titik ukur",
    highlighted: true,
    features: [
      "Semua fitur Basic",
      "Analitik per mesin & intensitas energi",
      "Baseline & perhitungan penghematan (M&V)",
      "EcoSME Green Score",
      "Riwayat data 12 bulan",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceIdr: 699_000,
    tagline: "Kesiapan pembiayaan hijau & pelaporan lengkap.",
    devices: "Hingga 25 titik ukur",
    features: [
      "Semua fitur Growth",
      "Paket data kesiapan pembiayaan hijau",
      "Berbagi data berbasis persetujuan ke mitra",
      "Ekspor data mentah (CSV) & API",
      "Pendampingan analis energi",
    ],
  },
];
