import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#123B2A" />
      <path d="M9 21.5c0-6.6 5-11.5 14-12-0.4 8.6-5.3 13.5-11.6 13.5-0.9 0-1.7-0.1-2.4-0.4" fill="#16A36A" />
      <path d="M9.5 22.5c2.6-3.6 5.6-6.2 9.5-8" stroke="#DDF7E8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M17.2 17.6l-1.6 3h2.6l-1.6 3" stroke="#DDF7E8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({
  href = "/",
  inverted = false,
  compact = false,
  className,
}: {
  href?: string;
  inverted?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="EcoSME — beranda">
      <LogoMark />
      {!compact && (
        <span className={cn("text-[17px] font-extrabold tracking-tight", inverted ? "text-white" : "text-forest")}>
          Eco<span className="text-brand-500">SME</span>
        </span>
      )}
    </Link>
  );
}
