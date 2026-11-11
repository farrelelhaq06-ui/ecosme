"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/solutions", label: "Solusi" },
  { href: "/how-it-works", label: "Cara Kerja" },
  { href: "/pricing", label: "Harga" },
  { href: "/about", label: "Tentang" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(pathname);
  if (last !== pathname) {
    setLast(pathname);
    setOpen(false);
  }
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-md">
      <nav aria-label="Navigasi situs" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                  pathname === l.href ? "text-forest" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/login" variant="ghost" size="md">
            Masuk
          </ButtonLink>
          <ButtonLink href="/register" size="md">
            Mulai Monitoring
          </ButtonLink>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-ink hover:bg-canvas md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {open && (
        <div id="mobile-nav" className="animate-fade-in border-t border-line bg-white px-4 pb-5 pt-2 md:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-canvas">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink href="/login" variant="outline">
              Masuk
            </ButtonLink>
            <ButtonLink href="/register">Mulai Monitoring</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
