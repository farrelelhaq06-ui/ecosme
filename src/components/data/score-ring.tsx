import { cn } from "@/lib/utils";

/** Circular score gauge (0–100), pure SVG — server-renderable. */
export function ScoreRing({
  value,
  grade,
  size = 120,
  stroke = 10,
  className,
  inverted = false,
}: {
  value: number;
  grade?: string;
  size?: number;
  stroke?: number;
  className?: string;
  inverted?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? "#16A36A" : v >= 65 ? "#4CC38D" : v >= 50 ? "#F79009" : "#D92D20";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Skor ${v} dari 100${grade ? `, grade ${grade}` : ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={inverted ? "rgba(255,255,255,0.12)" : "#EEF2EF"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={cn("num font-semibold leading-none", inverted ? "text-white" : "text-ink")} style={{ fontSize: size * 0.28 }}>
            {v}
          </p>
          {grade && <p className={cn("mt-1 text-[11px] font-bold uppercase tracking-wider", inverted ? "text-brand-200" : "text-muted")}>Grade {grade}</p>}
        </div>
      </div>
    </div>
  );
}
