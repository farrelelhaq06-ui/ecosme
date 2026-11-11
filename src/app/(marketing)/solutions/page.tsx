import type { Metadata } from "next";
import { Activity, BarChart3, Bell, Cpu, FileText, Gauge, Handshake, Leaf, PiggyBank, Router } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Solusi",
  description: "Modul EcoSME: monitoring energi IoT, analitik biaya, pengukuran penghematan (M&V), pelaporan keberlanjutan, dan kesiapan pembiayaan hijau untuk IKM.",
};

const MODULES = [
  { icon: Router, t: "Monitoring Energi IoT", d: "Power meter 3 fase mengirim kWh, daya aktif, arus, tegangan, faktor daya, dan frekuensi per interval. Status perangkat dan kualitas data dipantau terus.", pts: ["Data per mesin & per panel", "Indikator kelengkapan data", "Penanda data di luar rentang"] },
  { icon: BarChart3, t: "Analitik Biaya & Efisiensi", d: "Estimasi biaya dengan tarif LWBP/WBP yang dapat dikonfigurasi, intensitas energi per unit produksi, dan perbandingan periode.", pts: ["Biaya per mesin", "Porsi beban puncak (WBP)", "kWh per unit produksi"] },
  { icon: Bell, t: "Peringatan & Rekomendasi", d: "Aturan yang mudah dijelaskan mendeteksi beban lebih, faktor daya rendah, mesin menyala di luar jam operasi, deviasi tegangan, dan perangkat offline.", pts: ["Prioritas berdasarkan dampak", "Estimasi nilai rupiah", "Tindak lanjut tercatat"] },
  { icon: PiggyBank, t: "Pengukuran Penghematan (M&V)", d: "Baseline regresi harian kWh terhadap volume produksi (pendekatan IPMVP Opsi C). Status estimasi, terhitung, dan terverifikasi dipisahkan dengan jelas.", pts: ["R² & CV(RMSE) ditampilkan", "Periode pelaporan 30 hari", "Jejak verifikator"] },
  { icon: Leaf, t: "Keberlanjutan & Green Score", d: "Estimasi emisi dari faktor emisi grid yang dapat diubah, emisi terhindarkan dari penghematan terverifikasi, dan Green Score dengan rumus terbuka.", pts: ["Komponen & bobot transparan", "Bukan sertifikasi ESG", "Riwayat skor"] },
  { icon: Handshake, t: "Kesiapan Pembiayaan Hijau", d: "Checklist kesiapan, paket data kinerja energi, dan berbagi data ke mitra keuangan hanya dengan persetujuan eksplisit IKM, yang dapat dicabut kapan saja.", pts: ["Persetujuan granular", "Portal mitra keuangan", "Log audit lengkap"] },
];

export default function SolutionsPage() {
  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">Solusi</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">Dari pembacaan meter hingga keputusan investasi efisiensi.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-muted">Enam modul yang saling terhubung, dirancang untuk pemilik IKM, manajer produksi, dan manajer energi.</p>
        </div>
      </section>
      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          {MODULES.map((m) => (
            <article key={m.t} className="rounded-2xl border border-line bg-white p-8 transition hover:shadow-[var(--shadow-pop)]">
              <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <m.icon className="size-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-bold">{m.t}</h2>
              <p className="mt-3 text-[15px] leading-7 text-muted">{m.d}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {m.pts.map((p) => (
                  <li key={p} className="rounded-full bg-canvas px-3 py-1 text-[12.5px] font-medium text-ink ring-1 ring-line">
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-line bg-canvas py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Untuk siapa?" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gauge, t: "Pemilik IKM", d: "Biaya energi, penghematan, dan kesiapan pembiayaan dalam satu layar." },
              { icon: Cpu, t: "Manajer Produksi", d: "Mesin mana yang boros, kapan, dan apa tindakannya." },
              { icon: Activity, t: "Manajer Energi", d: "Data teknis: daya, arus, PF, kualitas data, dan M&V." },
              { icon: FileText, t: "Mitra Keuangan", d: "Ringkasan kinerja terstruktur, dibagikan dengan persetujuan." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-line bg-white p-6">
                <x.icon className="size-6 text-brand-600" aria-hidden />
                <h3 className="mt-3 font-bold">{x.t}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-muted">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <ButtonLink href="/login" size="lg">
              Jelajahi dashboard demo
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
