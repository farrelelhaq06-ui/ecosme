import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calculator,
  ClipboardList,
  Eye,
  FileSearch,
  FlaskConical,
  Handshake,
  Leaf,
  PiggyBank,
  Radio,
  Repeat,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { BankPreview, DashboardPreview } from "@/components/marketing/previews";
import { PricingCards, SectionHeading } from "@/components/marketing/sections";
import { STEPS } from "@/components/marketing/steps";

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div aria-hidden className="absolute -top-40 right-[-10%] size-[560px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12.5px] font-semibold text-brand-700">
              <Leaf className="size-3.5" aria-hidden /> Smart Energy & Green Finance untuk IKM Indonesia
            </p>
            <h1 className="mt-6 text-[40px] font-extrabold leading-[1.08] tracking-tight text-forest sm:text-5xl lg:text-[56px]">
              Ubah Data Energi Menjadi <span className="text-brand-500">Efisiensi</span> dan Peluang Pembiayaan.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-muted">
              EcoSME membantu IKM memantau penggunaan listrik, memahami biaya energi, mengukur kinerja keberlanjutan, dan mempersiapkan data pendukung pembiayaan hijau.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg">
                Jelajahi Dashboard <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/how-it-works" size="lg" variant="outline">
                Lihat Cara Kerja
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[13px] text-muted">
              <FlaskConical className="size-4 text-info" aria-hidden /> Dashboard demo menggunakan data simulasi yang diberi label jelas.
            </p>
          </div>
          <div className="animate-rise [animation-delay:120ms]">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-line bg-canvas py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Tantangan" title="Listrik adalah biaya besar, tetapi sering tidak terlihat." description="Banyak IKM hanya melihat satu angka: tagihan bulanan. Akibatnya, tiga hal sulit dilakukan." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Eye, t: "Visibilitas terbatas per mesin", d: "Tagihan PLN tidak menunjukkan mesin mana yang paling boros, kapan, dan mengapa." },
              { icon: FileSearch, t: "Penghematan sulit dibuktikan", d: "Tanpa baseline dan metode pengukuran, penurunan tagihan tidak bisa dipisahkan dari perubahan produksi atau cuaca." },
              { icon: ClipboardList, t: "Data pembiayaan belum terstruktur", d: "Lembaga keuangan membutuhkan informasi kinerja energi yang konsisten untuk menilai proyek efisiensi." },
            ].map((p, i) => (
              <article key={p.t} className="rounded-2xl border border-line bg-white p-7">
                <span className="num text-[13px] font-semibold text-subtle">0{i + 1}</span>
                <p.icon className="mt-4 size-7 text-warning" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{p.t}</h3>
                <p className="mt-2 text-[14.5px] leading-7 text-muted">{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Solusi" title="Satu platform, dari sensor hingga kesiapan pembiayaan." center />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Radio, t: "Monitoring Energi IoT", d: "Power meter 3 fase per mesin: kWh, kW, A, V, PF, Hz." },
              { icon: BarChart3, t: "Analitik Biaya & Efisiensi", d: "Tarif LWBP/WBP, intensitas kWh/unit, beban puncak." },
              { icon: PiggyBank, t: "Pengukuran Penghematan", d: "Baseline regresi terhadap produksi (pendekatan IPMVP)." },
              { icon: Leaf, t: "Pelaporan Keberlanjutan", d: "Estimasi emisi & Green Score yang transparan." },
              { icon: Handshake, t: "Kesiapan Pembiayaan Hijau", d: "Checklist, paket data, dan berbagi berbasis persetujuan." },
            ].map((s) => (
              <article key={s.t} className="group rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-pop)]">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-[15px] font-bold">{s.t}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-muted">{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-forest py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-300">Cara Kerja</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">Lima langkah menuju efisiensi yang terukur.</h2>
          </div>
          <ol className="mt-14 grid gap-4 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-6 text-brand-300" aria-hidden />
                  <span className="num text-[13px] text-white/40">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[15px] font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-white/65">{s.text}</p>
                {i < STEPS.length - 1 && <ArrowRight aria-hidden className="absolute -right-3.5 top-1/2 hidden size-5 -translate-y-1/2 text-brand-400 md:block" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Pratinjau Produk" title="Dua sisi, satu sumber data yang sama." description="IKM melihat operasional dan penghematan; mitra keuangan melihat ringkasan kinerja hanya setelah IKM memberi persetujuan." center />
          <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <DashboardPreview />
              <p className="mt-4 text-center text-[13.5px] font-semibold">Dashboard IKM</p>
            </div>
            <div className="lg:mt-16">
              <BankPreview />
              <p className="mt-4 text-center text-[13.5px] font-semibold">Portal Mitra Keuangan</p>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/login" size="lg" variant="dark">
              Coba dashboard demo <ArrowRight />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* REVENUE MODEL */}
      <section className="border-y border-line bg-canvas py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Model Bisnis" title="Model pendapatan ganda." description="Rencana model bisnis EcoSME. Bagian pembiayaan bergantung pada perjanjian kemitraan dan regulasi yang berlaku, dan belum ada kemitraan bank yang terjalin saat ini." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Repeat, t: "Langganan SaaS B2B", d: "Biaya bulanan per fasilitas berdasarkan jumlah titik ukur dan fitur analitik." },
              { icon: Zap, t: "Layanan Energi Berbasis Kinerja", d: "Pendampingan implementasi efisiensi dengan imbal jasa yang dikaitkan pada penghematan terukur." },
              { icon: Wallet, t: "Komisi Referral / Channeling", d: "Potensi komisi dari lembaga keuangan atas rujukan pembiayaan hijau, tergantung perjanjian dan regulasi." },
            ].map((r) => (
              <article key={r.t} className="rounded-2xl border border-line bg-white p-7">
                <r.icon className="size-7 text-brand-600" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{r.t}</h3>
                <p className="mt-2 text-[14.5px] leading-7 text-muted">{r.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Harga" title="Paket yang tumbuh bersama usaha Anda." description="Harga berikut adalah usulan untuk keperluan demonstrasi dan belum divalidasi pasar." center />
          <div className="mt-14">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section id="transparansi" className="bg-navy py-20 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-300">Kepercayaan & Transparansi</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">Setiap angka memiliki label asal-usulnya.</h2>
            <p className="mt-4 text-[16px] leading-7 text-white/70">Monitoring bukan penghematan, dan estimasi bukan verifikasi. EcoSME menampilkan perbedaan ini di setiap KPI.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Radio, t: "Live", d: "Data terukur langsung dari perangkat IoT yang terpasang.", c: "text-success" },
              { icon: FlaskConical, t: "Simulasi", d: "Data demonstrasi untuk usaha fiktif, bukan pembacaan sensor nyata.", c: "text-info" },
              { icon: Calculator, t: "Estimasi", d: "Dihitung dari asumsi seperti tarif dan faktor emisi, yang dapat diubah pengguna.", c: "text-warning" },
              { icon: BadgeCheck, t: "Terverifikasi", d: "Penghematan yang ditinjau terhadap baseline terdokumentasi oleh verifikator.", c: "text-brand-300" },
            ].map((x) => (
              <article key={x.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <x.icon className={`size-6 ${x.c}`} aria-hidden />
                <h3 className="mt-4 text-[16px] font-bold text-white">{x.t}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-white/65">{x.d}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 flex items-start gap-2 text-[13px] text-white/60">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
            EcoSME Green Score adalah indikator kinerja internal, bukan sertifikasi ESG resmi dan bukan skor kredit. Bank tetap bertanggung jawab atas penilaian dan keputusan kreditnya.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Mulai dari satu panel listrik.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-muted">Jelajahi dashboard demo sekarang, atau daftarkan usaha Anda untuk menyiapkan pemasangan perangkat.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" size="lg">
              Mulai Monitoring
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="outline">
              Masuk ke demo
            </ButtonLink>
          </div>
          <p className="mt-6 text-[13px] text-muted">
            Ingin tahu detail metodologi? <Link href="/how-it-works" className="font-semibold text-brand-700 underline-offset-2 hover:underline">Baca cara kerja</Link>
          </p>
        </div>
      </section>
    </>
  );
}
