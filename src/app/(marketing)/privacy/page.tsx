import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="rounded-lg bg-warning-50 px-4 py-2 text-[13px] font-medium text-warning-700">Draf untuk prototipe. Bukan dokumen hukum final; wajib ditinjau penasihat hukum sebelum layanan komersial.</p>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Kebijakan Privasi</h1>
      <div className="mt-8 space-y-6 text-[15px] leading-7 text-muted">
        <section>
          <h2 className="text-lg font-bold text-ink">1. Data yang dikumpulkan</h2>
          <p className="mt-2">Data akun (nama, email, telepon, nama usaha), data pengukuran energi dari perangkat, data produksi yang Anda masukkan, serta log aktivitas.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">2. Penggunaan data</h2>
          <p className="mt-2">Untuk menampilkan analitik, menghitung estimasi dan penghematan, serta menghasilkan laporan. Data tidak dijual kepada pihak ketiga.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">3. Berbagi data dengan mitra keuangan</h2>
          <p className="mt-2">Hanya dilakukan dengan persetujuan eksplisit Anda, terbatas pada cakupan yang Anda pilih, dan dapat dicabut kapan saja. Setiap akses dicatat dalam log audit.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">4. Hak Anda</h2>
          <p className="mt-2">Anda dapat meminta akses, koreksi, ekspor, atau penghapusan data sesuai peraturan perlindungan data pribadi yang berlaku di Indonesia.</p>
        </section>
      </div>
    </article>
  );
}
