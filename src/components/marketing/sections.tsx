import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PRICING_PLANS } from "@/lib/config";
import { cn, fmtIdr } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, center = false }: { eyebrow?: string; title: ReactNode; description?: ReactNode; center?: boolean }) {
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>}
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-[16px] leading-7 text-muted">{description}</p>}
    </div>
  );
}

export function PricingCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PRICING_PLANS.map((p) => (
        <article
          key={p.id}
          className={cn(
            "relative flex flex-col rounded-2xl border p-7 transition-shadow hover:shadow-[var(--shadow-pop)]",
            p.highlighted ? "border-forest bg-forest text-white shadow-[0_24px_60px_-24px_rgba(18,59,42,0.6)]" : "border-line bg-white",
          )}
        >
          {p.highlighted && (
            <span className="absolute -top-3 left-7 rounded-full bg-brand-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-forest-950">Paling sesuai IKM</span>
          )}
          <h3 className={cn("text-lg font-bold", p.highlighted ? "text-white" : "text-ink")}>{p.name}</h3>
          <p className={cn("mt-1 text-[14px]", p.highlighted ? "text-white/70" : "text-muted")}>{p.tagline}</p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="num text-4xl font-semibold">{fmtIdr(p.priceIdr)}</span>
            <span className={cn("text-[14px]", p.highlighted ? "text-white/70" : "text-muted")}>/bulan</span>
          </p>
          <p className={cn("mt-1 text-[12px] font-semibold", p.highlighted ? "text-brand-200" : "text-warning-700")}>Harga usulan (demo), belum divalidasi pasar</p>
          <p className={cn("mt-4 rounded-lg px-3 py-2 text-[13px] font-medium", p.highlighted ? "bg-white/10" : "bg-canvas")}>{p.devices}</p>
          <ul className="mt-5 flex-1 space-y-3">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2.5 text-[14px]">
                <Check className={cn("mt-0.5 size-4 shrink-0", p.highlighted ? "text-brand-300" : "text-brand-600")} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href={`/register?plan=${p.id}`} variant={p.highlighted ? "primary" : "outline"} size="lg" className="mt-7 w-full">
            Pilih {p.name}
          </ButtonLink>
        </article>
      ))}
    </div>
  );
}
