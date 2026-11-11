import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const COLS = [
  {
    title: "Produk",
    links: [
      { href: "/solutions", label: "Solusi" },
      { href: "/how-it-works", label: "Cara Kerja" },
      { href: "/pricing", label: "Harga" },
      { href: "/login", label: "Jelajahi Dashboard Demo" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { href: "/about", label: "Tentang EcoSME" },
      { href: "/about#transparansi", label: "Transparansi Data" },
      { href: "/register", label: "Daftar" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Kebijakan Privasi" },
      { href: "/terms", label: "Syarat Layanan" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-forest-950 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-[14px] leading-6">Smart Energy. Measurable Savings. Smarter Green Financing.</p>
          <p className="mt-1 text-[13px] text-white/50">Pantau Energi, Optimalkan Biaya, Siapkan Pembiayaan Hijau.</p>
          <ul className="mt-6 space-y-2 text-[13px]">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-brand-400" aria-hidden /> halo@ecosme.example <span className="text-white/40">(placeholder)</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-brand-400" aria-hidden /> +62 xxx-xxxx-xxxx <span className="text-white/40">(placeholder)</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-brand-400" aria-hidden /> Indonesia <span className="text-white/40">(alamat menyusul)</span>
            </li>
          </ul>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-[12px] text-white/50 sm:px-6 md:flex-row md:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} EcoSME. Prototipe untuk kompetisi inovasi.</p>
          <p className="max-w-2xl md:text-right">
            Disclaimer demo: data, angka, dan nama usaha pada dashboard adalah simulasi. Harga paket bersifat usulan. EcoSME belum memiliki kemitraan resmi dengan
            lembaga keuangan mana pun; nama &quot;Bank Mitra (Demo)&quot; adalah fiktif.
          </p>
        </div>
      </div>
    </footer>
  );
}
