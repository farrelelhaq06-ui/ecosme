import type { Metadata } from "next";

export const metadata: Metadata = { title: "Syarat Layanan" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="rounded-lg bg-warning-50 px-4 py-2 text-[13px] font-medium text-warning-700">Draf untuk prototipe. Bukan dokumen hukum final.</p>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Syarat Layanan</h1>
      <div className="mt-8 space-y-6 text-[15px] leading-7 text-muted">
        <section>
          <h2 className="text-lg font-bold text-ink">1. Sifat layanan</h2>
          <p className="mt-2">EcoSME menyediakan alat monitoring dan analitik energi. Estimasi biaya dan emisi bergantung pada asumsi yang dapat dikonfigurasi dan bukan merupakan tagihan resmi.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">2. Penghematan</h2>
          <p className="mt-2">EcoSME tidak menjamin penghematan. Hasil penghematan dihitung terhadap baseline dan hanya disebut terverifikasi setelah ditinjau verifikator.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">3. Green Score & pembiayaan</h2>
          <p className="mt-2">Green Score adalah indikator internal, bukan sertifikasi ESG maupun skor kredit. EcoSME tidak memberikan pinjaman dan tidak menjamin persetujuan pembiayaan.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">4. Mode demo</h2>
          <p className="mt-2">Lingkungan demo menggunakan data simulasi dan dapat diatur ulang sewaktu-waktu. Jangan memasukkan data sensitif di lingkungan demo.</p>
        </section>
      </div>
    </article>
  );
}
