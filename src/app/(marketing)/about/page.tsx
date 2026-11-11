import type { Metadata } from "next";
import { BadgeCheck, Calculator, FlaskConical, Radio, Scale, ShieldCheck, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Misi EcoSME dan prinsip transparansi data: membedakan data terukur, simulasi, estimasi, dan hasil terverifikasi.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">Tentang EcoSME</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">Membuat efisiensi energi IKM dapat diukur dan dipercaya.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-muted">
            EcoSME menghubungkan monitoring energi industri, optimasi biaya, analitik keberlanjutan, dan kesiapan pembiayaan hijau untuk industri kecil dan menengah di Indonesia.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            { icon: Target, t: "Misi", d: "Memberikan visibilitas energi per mesin yang terjangkau, agar IKM dapat mengambil keputusan efisiensi berbasis data." },
            { icon: Scale, t: "Prinsip", d: "Monitoring bukan penghematan. Penghematan harus diukur terhadap baseline terdokumentasi dengan metodologi yang jelas." },
            { icon: ShieldCheck, t: "Tanggung jawab", d: "Green Score adalah indikator internal. Lembaga keuangan tetap memegang tanggung jawab penilaian dan keputusan kredit." },
          ].map((x) => (
            <article key={x.t} className="rounded-2xl border border-line bg-white p-7">
              <x.icon className="size-7 text-brand-600" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">{x.t}</h2>
              <p className="mt-2 text-[15px] leading-7 text-muted">{x.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="transparansi" className="border-t border-line bg-canvas py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Transparansi data</h2>
          <p className="mt-3 text-[16px] leading-7 text-muted">Setiap angka di EcoSME diberi salah satu dari empat label berikut.</p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Label asal-usul data</caption>
              <thead className="bg-canvas text-[12px] uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Label</th>
                  <th scope="col" className="px-5 py-3">Arti</th>
                  <th scope="col" className="hidden px-5 py-3 sm:table-cell">Contoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  { i: Radio, l: "Live", a: "Diukur langsung oleh perangkat IoT yang terpasang.", e: "kWh mesin dari power meter" },
                  { i: FlaskConical, l: "Simulasi", a: "Data demonstrasi untuk usaha fiktif.", e: "Seluruh dataset di mode demo" },
                  { i: Calculator, l: "Estimasi", a: "Hasil hitung berdasarkan asumsi yang dapat diubah.", e: "Biaya listrik, emisi CO₂e" },
                  { i: BadgeCheck, l: "Terverifikasi", a: "Ditinjau terhadap baseline oleh verifikator.", e: "Penghematan periode M&V" },
                ].map((r) => (
                  <tr key={r.l}>
                    <td className="px-5 py-4 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <r.i className="size-4 text-brand-600" aria-hidden /> {r.l}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">{r.a}</td>
                    <td className="hidden px-5 py-4 text-muted sm:table-cell">{r.e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-[14px] leading-7 text-muted">
            Status saat ini: EcoSME adalah prototipe kompetisi. Belum ada pelanggan berbayar, sertifikasi resmi, maupun kemitraan bank. Seluruh nama usaha di dashboard demo adalah fiktif.
          </p>
        </div>
      </section>
    </>
  );
}
