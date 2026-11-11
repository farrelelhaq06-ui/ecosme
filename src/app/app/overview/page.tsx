import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  CircleDollarSign,
  Clock,
  DatabaseZap,
  Factory,
  Gauge,
  Leaf,
  Lightbulb,
  PartyPopper,
  PiggyBank,
  Router,
  Siren,
} from "lucide-react";
import { getOverview, measuredProvenance } from "@/lib/services/ikm";
import { requireRole } from "@/lib/auth/session";
import { RANGE_OPTIONS, localHour } from "@/lib/time";
import { EMISSION_NOTE, GREEN_SCORE_DISCLAIMER, TARIFF_NOTE } from "@/lib/config";
import { gradeLabel } from "@/lib/calc/green-score";
import { deviceStatusLabel } from "@/lib/calc/quality";
import { cn, fmtDate, fmtDateTime, fmtIdr, fmtIdrCompact, fmtNumber, fmtPct, fmtRelative } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RangeSelect } from "@/components/filters/filters";
import { KpiCard } from "@/components/data/kpi-card";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Callout, EmptyState, Progress, StatusDot } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { MACHINE_COLORS, VIZ } from "@/components/charts/format";
import { ScoreRing } from "@/components/data/score-ring";
import { MascotAvatar } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Ringkasan" };

function greeting(now = new Date()) {
  const h = localHour(now);
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const session = await requireRole("ikm");
  const d = await getOverview(sp.range);
  const { ctx, range, totals } = d;
  const prov = measuredProvenance(ctx);
  const firstName = session.name.split(" ")[0];
  const green = d.green.current.result;

  const machineSlices = d.breakdown.map((b, i) => ({ name: b.name, value: b.kwh, color: MACHINE_COLORS[i % MACHINE_COLORS.length] }));
  const onlineCount = ctx.devices.filter((x) => x.status === "online").length;
  const sev = { critical: "danger", warning: "warning", info: "info" } as const;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Factory className="size-3.5" aria-hidden />
            {ctx.business.name} · {ctx.business.sector} · {ctx.business.city}
          </span>
        }
        title={`${greeting()}, ${firstName}`}
        description={
          <>
            Ringkasan kinerja energi untuk <strong className="font-semibold text-ink">{range.label}</strong>. Pembaruan data terakhir{" "}
            <time dateTime={ctx.lastUpdate.toISOString()} className="font-medium text-ink">
              {fmtDateTime(ctx.lastUpdate)} WIB
            </time>
            .
          </>
        }
        actions={<RangeSelect value={range.key} options={RANGE_OPTIONS} />}
      />

      {sp.welcome === "1" && (
        <Callout tone="brand" icon={<PartyPopper />} title={`Selamat datang di EcoSME, ${firstName}!`} className="mb-4">
          Akun Anda berhasil dibuat. Sampai perangkat IoT Anda terpasang, dashboard menampilkan dataset demonstrasi milik usaha contoh agar Anda dapat menjelajahi
          seluruh fitur. <Link href="/app/devices" className="font-semibold underline underline-offset-2">Hubungkan perangkat pertama →</Link>
        </Callout>
      )}
      {ctx.mode === "demo" && (
        <Callout
          tone="info"
          icon={<MascotAvatar size={26} className="ring-1 ring-blue-300" />}
          className="mb-6"
        >
          <strong>Lingkungan DEMO.</strong> Seluruh pembacaan energi pada dashboard ini adalah data simulasi untuk usaha fiktif dan bukan pembacaan sensor nyata.
          Biaya dan emisi merupakan estimasi berdasarkan asumsi yang dapat diubah di Pengaturan.
        </Callout>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Penggunaan Energi"
          icon={<Bolt />}
          value={fmtNumber(totals.kwh)}
          unit="kWh"
          provenance={prov}
          deltaPct={d.deltas.kwh}
          goodWhen="down"
          footnote="vs periode sebelumnya"
        />
        <KpiCard
          label="Estimasi Biaya Listrik"
          icon={<CircleDollarSign />}
          value={fmtIdrCompact(totals.costIdr)}
          provenance="estimated"
          deltaPct={d.deltas.cost}
          goodWhen="down"
          footnote={`Tarif ${ctx.tariff.tariffGroup} (asumsi)`}
        />
        <KpiCard
          label="Penghematan Terverifikasi"
          icon={<PiggyBank />}
          value={d.savings.verified ? fmtIdrCompact(d.savings.verified.idr) : ""}
          unavailable={!d.savings.verified}
          provenance="verified"
          footnote={
            d.savings.verified
              ? `${fmtNumber(d.savings.verified.kwh)} kWh · ${d.savings.verified.periods} periode M&V s.d. ${fmtDate(d.savings.verified.lastPeriodEnd)}`
              : "Belum ada periode M&V yang terverifikasi"
          }
        />
        <KpiCard
          accent
          label="EcoSME Green Score"
          icon={<Gauge />}
          value={green.total}
          unit={`/100 · ${green.grade}`}
          provenance="estimated"
          footnote={`${gradeLabel(green.grade)} · ${green.periodLabel}`}
        />
      </div>

      {/* Consumption trend + machine share */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Tren Konsumsi Energi"
            subtitle={`${range.granularity === "hour" ? "Per jam" : "Per hari"} · garis putus-putus = periode sebelumnya`}
            actions={<ProvenanceBadge kind={prov} />}
          />
          <CardBody>
            <TimeSeriesChart
              ariaLabel="Grafik tren konsumsi energi"
              data={d.trend}
              unit="kwh"
              granularity={range.granularity}
              series={[
                { key: "kwh", label: "Periode ini", color: VIZ.green, type: "area" },
                ...(d.prevTotals ? [{ key: "prevKwh", label: "Periode sebelumnya", color: VIZ.gray, type: "line" as const, dashed: true }] : []),
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Energi per Mesin" subtitle={range.label} actions={<ProvenanceBadge kind={prov} />} />
          <CardBody>
            {machineSlices.length ? (
              <DonutChart ariaLabel="Distribusi energi per mesin" data={machineSlices} unit="kwh" centerValue={fmtNumber(totals.kwh)} centerLabel="kWh total" height={180} />
            ) : (
              <EmptyState title="Belum ada data mesin" />
            )}
          </CardBody>
          <CardFooter>
            <Link href={`/app/machines?range=${range.key}`} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              Analisis per mesin <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Cost + intensity */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Tren Estimasi Biaya Listrik"
            subtitle={`LWBP vs WBP (${ctx.tariff.peakStartHour}.00–${ctx.tariff.peakEndHour}.00, ×${fmtNumber(ctx.tariff.peakMultiplier, 1)})`}
            actions={<ProvenanceBadge kind="estimated" />}
          />
          <CardBody>
            <TimeSeriesChart
              ariaLabel="Grafik tren estimasi biaya listrik"
              data={d.trend}
              unit="idr"
              granularity={range.granularity}
              showTotal
              series={[
                { key: "offPeakCostIdr", label: "LWBP", color: VIZ.navy, type: "bar", stackId: "c" },
                { key: "peakCostIdr", label: "WBP", color: VIZ.amber, type: "bar", stackId: "c" },
              ]}
            />
          </CardBody>
          <CardFooter>{TARIFF_NOTE}</CardFooter>
        </Card>
        <Card>
          <CardHeader
            title="Intensitas Energi per Unit Produksi"
            subtitle={`kWh/unit per hari · ${d.intensityFromDays} hari terakhir${d.intensityFromDays !== Math.round((range.to.getTime() - range.from.getTime()) / 86400000) ? " (minimum 7 hari)" : ""}`}
            actions={<ProvenanceBadge kind="estimated" />}
          />
          <CardBody>
            <TimeSeriesChart
              ariaLabel="Grafik intensitas energi per unit produksi"
              data={d.intensity}
              unit="kwh_unit"
              granularity="day"
              showLegend={false}
              series={[{ key: "intensity", label: "Intensitas", color: VIZ.blue, type: "line" }]}
              referenceLines={d.savings.baseline ? [{ y: Math.round(d.savings.baseline.intensityKwhPerUnit * 100) / 100, label: "Baseline", color: VIZ.amber }] : []}
            />
          </CardBody>
          <CardFooter className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Rata-rata periode: <strong className="num text-ink">{d.intensityNow ? `${fmtNumber(d.intensityNow, 2)} kWh/unit` : "–"}</strong>
              {d.savings.baseline && (
                <>
                  {" "}· baseline <span className="num">{fmtNumber(d.savings.baseline.intensityKwhPerUnit, 2)}</span>
                </>
              )}
            </span>
            <span>Hari tanpa produksi (Minggu) tidak dihitung.</span>
          </CardFooter>
        </Card>
      </div>

      {/* Status row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader
            icon={<Router />}
            title="Status Koneksi Mesin"
            subtitle={`${onlineCount} dari ${ctx.devices.length} perangkat online`}
          />
          <CardBody className="pt-4">
            <ul className="divide-y divide-line/70">
              {ctx.machines.map((m) => {
                const dev = ctx.devices.find((x) => x.id === m.deviceId)!;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <StatusDot status={dev.status} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{m.name}</span>
                        <span className="block text-[11.5px] text-muted">
                          {dev.id} · {fmtRelative(dev.lastSeen)}
                        </span>
                      </span>
                    </span>
                    <Badge tone={dev.status === "online" ? "success" : dev.status === "degraded" ? "warning" : "danger"}>{deviceStatusLabel(dev)}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardBody>
          <CardFooter>
            <Link href="/app/devices" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              Kelola perangkat <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader icon={<Siren />} title="Peringatan Terbaru" subtitle={`${d.alerts.open.length} aktif · 7 hari terakhir`} />
          <CardBody className="pt-4">
            {d.alerts.open.length === 0 ? (
              <EmptyState title="Tidak ada peringatan aktif" description="Semua mesin beroperasi dalam batas normal." />
            ) : (
              <ul className="space-y-2.5">
                {d.alerts.open.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/alerts?focus=${encodeURIComponent(a.id)}`} className="flex gap-3 rounded-lg p-2 -m-2 hover:bg-canvas">
                      <span
                        aria-hidden
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-warning" : "bg-info")}
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-1 text-[13px] font-medium">{a.title}</span>
                        <span className="flex items-center gap-2 text-[11.5px] text-muted">
                          <Badge tone={sev[a.severity]} className="py-0">
                            {a.severity === "critical" ? "Kritis" : a.severity === "warning" ? "Peringatan" : "Info"}
                          </Badge>
                          {fmtRelative(a.detectedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
          <CardFooter>
            <Link href="/app/alerts" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              Semua peringatan <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader icon={<DatabaseZap />} title="Ringkasan Kualitas Data" subtitle={range.label} actions={<Badge tone={d.quality.rating === "baik" ? "success" : d.quality.rating === "cukup" ? "warning" : "danger"}>Kualitas {d.quality.rating}</Badge>} />
          <CardBody className="pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted">Kelengkapan interval</span>
              <span className="num text-lg font-semibold">{fmtPct(d.quality.completeness * 100)}</span>
            </div>
            <Progress value={d.quality.completeness * 100} className="mt-2" label="Kelengkapan data" tone={d.quality.completeness >= 0.97 ? "brand" : "warning"} />
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-canvas p-2.5">
                <dt className="text-[11px] text-muted">Diterima</dt>
                <dd className="num text-[15px] font-semibold">{fmtNumber(d.quality.received)}</dd>
              </div>
              <div className="rounded-lg bg-canvas p-2.5">
                <dt className="text-[11px] text-muted">Celah data</dt>
                <dd className="num text-[15px] font-semibold">{d.quality.gapCount}</dd>
              </div>
              <div className="rounded-lg bg-canvas p-2.5">
                <dt className="text-[11px] text-muted">Di luar rentang</dt>
                <dd className="num text-[15px] font-semibold">{d.quality.outOfRange}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-2">
              {d.quality.perDevice
                .filter((p) => p.completeness < 0.99 || p.outOfRange > 0)
                .slice(0, 3)
                .map((p) => (
                  <li key={p.deviceId} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted">
                      {p.deviceId} · {ctx.machines.find((m) => m.id === p.machineId)?.name}
                    </span>
                    <span className="num font-medium">{fmtPct(p.completeness * 100)}</span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Sustainability + recommendations */}
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader icon={<Leaf />} title="Snapshot Keberlanjutan" subtitle={range.label} />
          <CardBody className="space-y-4 pt-4">
            <div className="flex items-center gap-5">
              <ScoreRing value={green.total} grade={green.grade} size={104} />
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] text-muted">EcoSME Green Score</p>
                <p className="text-sm font-semibold">{gradeLabel(green.grade)}</p>
                <Link href="/app/green-score" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline">
                  Lihat rincian komponen <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-muted">Emisi periode ini</p>
                  <ProvenanceBadge kind="estimated" />
                </div>
                <p className="num mt-2 text-lg font-semibold">
                  {fmtNumber(totals.emissionKg / 1000, 1)} <span className="text-[12px] font-medium text-muted">t CO₂e</span>
                </p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-muted">Emisi terhindarkan</p>
                  <ProvenanceBadge kind="verified" />
                </div>
                <p className="num mt-2 text-lg font-semibold">
                  {d.savings.verified ? (
                    <>
                      {fmtNumber(d.savings.verified.emissionKg / 1000, 2)} <span className="text-[12px] font-medium text-muted">t CO₂e</span>
                    </>
                  ) : (
                    <span className="text-sm text-subtle">Belum tersedia</span>
                  )}
                </p>
              </div>
            </div>
            <p className="text-[12px] leading-5 text-muted">
              {EMISSION_NOTE} Emisi terhindarkan hanya dihitung dari periode penghematan yang terverifikasi.
            </p>
          </CardBody>
          <CardFooter>{GREEN_SCORE_DISCLAIMER}</CardFooter>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader icon={<Lightbulb />} title="Rekomendasi Tindakan Berikutnya" subtitle="Disusun otomatis dari data periode ini; nilai rupiah adalah estimasi" />
          <CardBody className="pt-4">
            <ol className="space-y-3">
              {d.recommendations.map((r, i) => (
                <li key={r.id}>
                  <Link href={r.href} className="group flex gap-4 rounded-xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest text-[12px] font-bold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold">{r.title}</span>
                        <Badge tone={r.priority === "tinggi" ? "danger" : r.priority === "sedang" ? "warning" : "neutral"}>Prioritas {r.priority}</Badge>
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-5 text-muted">{r.detail}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        {r.impact}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-white/60 px-5 py-4">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Clock className="size-4" aria-hidden />
          Estimasi biaya {range.label}: <strong className="num text-ink">{fmtIdr(totals.costIdr)}</strong> · Beban puncak{" "}
          <strong className="num text-ink">{fmtNumber(totals.maxDemandKw, 1)} kW</strong> · Porsi WBP <strong className="num text-ink">{fmtPct(totals.peakShare * 100)}</strong>
        </p>
        <ButtonLink href={`/app/energy?range=${range.key}`} variant="outline" size="sm">
          Buka monitoring detail <ArrowRight />
        </ButtonLink>
      </div>
    </>
  );
}
