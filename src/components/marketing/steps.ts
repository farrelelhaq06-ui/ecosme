import { Calculator, Cable, Handshake, LineChart, Search } from "lucide-react";

export const STEPS = [
  { icon: Cable, title: "Hubungkan Perangkat", text: "Pasang power meter IoT pada panel atau mesin utama. Data per jam dikirim ke cloud." },
  { icon: LineChart, title: "Pantau Energi", text: "Lihat kWh, daya, arus, faktor daya, dan estimasi biaya per mesin secara berkala." },
  { icon: Search, title: "Temukan Peluang", text: "Peringatan otomatis dan rekomendasi menunjukkan pemborosan dan beban di jam puncak." },
  { icon: Calculator, title: "Ukur Hasil", text: "Penghematan dihitung terhadap baseline terdokumentasi yang dinormalisasi produksi." },
  { icon: Handshake, title: "Siapkan Data Pembiayaan Hijau", text: "Susun paket data kinerja energi, lalu bagikan ke mitra keuangan dengan persetujuan Anda." },
];
