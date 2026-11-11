import Link from "next/link";
import { ArrowLeft, BadgeCheck, Leaf } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <main id="main" className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Beranda
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside className="relative hidden overflow-hidden bg-forest text-white lg:block" aria-label="Sorotan produk">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-30 [filter:invert(1)]" />
        <div aria-hidden className="absolute -right-32 -top-32 size-[480px] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold text-brand-100 ring-1 ring-white/15">
            <Leaf className="size-3.5" aria-hidden /> Pantau Energi, Optimalkan Biaya, Siapkan Pembiayaan Hijau
          </p>
          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight text-white">Smart Energy. Measurable Savings. Smarter Green Financing.</h2>
            <ul className="mt-8 space-y-4 text-[15px] text-white/80">
              {[
                "Konsumsi & estimasi biaya per mesin, per jam",
                "Penghematan diukur terhadap baseline terdokumentasi",
                "Berbagi data ke mitra keuangan hanya dengan persetujuan",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-brand-300" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[12.5px] text-white/50">Lingkungan demo · seluruh data adalah simulasi.</p>
        </div>
      </aside>
    </div>
  );
}
