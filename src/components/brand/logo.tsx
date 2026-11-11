import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-xs ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-105",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/logo.png"
        alt="Logo EcoSME"
        width={size * 2}
        height={size * 2}
        className="size-full object-contain"
        priority
      />
    </div>
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
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-95", className)}
      aria-label="EcoSME — beranda"
    >
      <LogoMark className={inverted ? "ring-white/20 shadow-md" : "ring-slate-200 shadow-sm"} />
      {!compact && (
        <span className={cn("text-[17.5px] font-extrabold tracking-tight", inverted ? "text-white" : "text-forest")}>
          Eco<span className={inverted ? "text-brand-300" : "text-brand-500"}>SME</span>
        </span>
      )}
    </Link>
  );
}

export function MascotAvatar({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-2 ring-brand-400/40",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/mascot.png"
        alt="EcoBot Mascot"
        width={size * 2}
        height={size * 2}
        className="size-full object-contain object-top"
      />
    </div>
  );
}
