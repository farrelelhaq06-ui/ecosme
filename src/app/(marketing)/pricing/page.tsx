import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/sections";
import { Callout } from "@/components/ui/feedback";
import { Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Harga",
  description: "Paket langganan EcoSME (usulan): Basic, Growth, dan Pro untuk IKM.",
};

const FAQ = [
  { q: "Apakah harga ini final?", a: "Belum. Harga adalah usulan untuk keperluan demonstrasi dan akan divalidasi melalui uji pasar dengan IKM." },
  { q: "Apakah biaya perangkat IoT termasuk?", a: "Belum termasuk. Skema pengadaan perangkat (beli, sewa, atau bundling) masih dirancang." },
  { q: "Apakah EcoSME menjamin pembiayaan?", a: "Tidak. EcoSME menyiapkan data pendukung. Penilaian dan keputusan kredit sepenuhnya kewenangan lembaga keuangan." },
  { q: "Apakah penghematan dijamin?", a: "Tidak. Monitoring membantu menemukan peluang; penghematan baru terjadi setelah tindakan dilakukan, lalu diukur terhadap baseline." },
];

export default function PricingPage() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">Harga</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">Harga sederhana, sesuai skala usaha.</h1>
        </div>
        <Callout tone="warning" icon={<Info />} className="mx-auto mt-8 max-w-3xl">
          Harga di bawah ini adalah <strong>usulan / demo</strong> dan belum divalidasi pasar. Harga dapat berubah.
        </Callout>
        <div className="mt-12">
          <PricingCards />
        </div>
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold">Pertanyaan umum</h2>
          <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
            {FAQ.map((f) => (
              <div key={f.q} className="p-6">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-2 text-[15px] leading-7 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
