import type { ReactNode } from "react";
import { BadgeCheck, Calculator, FlaskConical, Radio } from "lucide-react";
import type { Provenance } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "navy";

const tones: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-success-50 text-success-700 ring-success/25",
  warning: "bg-warning-50 text-warning-700 ring-warning/30",
  danger: "bg-danger-50 text-danger-700 ring-danger/25",
  info: "bg-info-50 text-info-700 ring-info/25",
  navy: "bg-navy text-white ring-navy",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset [&_svg]:size-3",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const PROVENANCE: Record<Provenance, { label: string; tone: Tone; icon: ReactNode; help: string }> = {
  live: { label: "Live", tone: "success", icon: <Radio aria-hidden />, help: "Data terukur langsung dari perangkat IoT." },
  simulated: {
    label: "Simulasi",
    tone: "info",
    icon: <FlaskConical aria-hidden />,
    help: "Data demonstrasi yang disimulasikan — bukan pembacaan sensor nyata.",
  },
  estimated: {
    label: "Estimasi",
    tone: "warning",
    icon: <Calculator aria-hidden />,
    help: "Hasil perhitungan berdasarkan asumsi (tarif, faktor emisi). Bukan nilai terverifikasi.",
  },
  verified: {
    label: "Terverifikasi",
    tone: "brand",
    icon: <BadgeCheck aria-hidden />,
    help: "Ditinjau terhadap baseline terdokumentasi oleh pihak verifikator.",
  },
};

/** Labels where a number comes from. Required on every KPI. */
export function ProvenanceBadge({ kind, className }: { kind: Provenance; className?: string }) {
  const p = PROVENANCE[kind];
  return (
    <Badge tone={p.tone} title={p.help} className={className}>
      {p.icon}
      {p.label}
    </Badge>
  );
}

export const PROVENANCE_INFO = PROVENANCE;
