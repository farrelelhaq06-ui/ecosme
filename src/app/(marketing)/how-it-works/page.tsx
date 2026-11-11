import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { STEPS } from "@/components/marketing/steps";
import { DEFAULT_TARIFF } from "@/lib/config";
import { fmtNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cara Kerja",
  description: "Lima langkah EcoSME: hubungkan perangkat, pantau energi, temukan peluang, ukur hasil dengan baseline, dan siapkan data pembiayaan hijau.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">Cara Kerja</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">Connect → Monitor → Identify → Measure → Prepare.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-muted">Setiap langkah menghasilkan data yang menjadi dasar langkah berikutnya, sehingga klaim penghematan dapat ditelusuri.</p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <ol className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-5 rounded-2xl border border-line bg-white p-7 sm:grid-cols-[64px_1fr]">
              <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                <span className="grid size-12 place-items-center rounded-xl bg-forest text-brand-300">
                  <s.icon className="size-6" aria-hidden />
                </span>
                <span className="num text-[13px] font-semibold text-subtle">Langkah {i + 1}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{s.title}</h2>
                <p className="mt-2 text-[15px] leading-7 text-muted">{s.text}</p>
                {i === 0 && <p className="mt-3 text-[14px] leading-7 text-muted">Field yang direkam: <code className="rounded bg-canvas px-1.5 py-0.5 text-[12.5px]">timestamp, device_id, machine_id, energy_kwh, active_power_watt, current_ampere, voltage_volt, power_factor, frequency_hz</code>.</p>}
                {i === 1 && <p className="mt-3 text-[14px] leading-7 text-muted">Estimasi biaya memakai tarif yang dapat dikonfigurasi. Default demo: {DEFAULT_TARIFF.tariffGroup} Rp{fmtNumber(DEFAULT_TARIFF.baseRateIdrPerKwh, 2)}/kWh dengan faktor WBP ×{fmtNumber(DEFAULT_TARIFF.peakMultiplier, 1)} ({DEFAULT_TARIFF.peakStartHour}.00–{DEFAULT_TARIFF.peakEndHour}.00). Semua ini adalah asumsi dan wajib diverifikasi dengan tagihan PLN.</p>}
                {i === 3 && (
                  <div className="mt-4 rounded-xl bg-canvas p-4 text-[14px] leading-7 text-muted">
                    <p className="font-semibold text-ink">Metodologi penghematan (disederhanakan dari IPMVP Opsi C)</p>
                    <p className="mt-1">
                      Baseline: regresi harian <span className="num">kWh = a + b × unit produksi</span> pada periode sebelum tindakan. Penghematan = Σ baseline yang disesuaikan − Σ kWh aktual.
                      Model dinilai cukup bila R² ≥ 0,75 dan CV(RMSE) ≤ 25%. Penghematan baru disebut <strong>terverifikasi</strong> setelah ditinjau verifikator.
                    </p>
                  </div>
                )}
                {i === 4 && <p className="mt-3 text-[14px] leading-7 text-muted">Data hanya dibagikan setelah IKM memberi persetujuan eksplisit, dan persetujuan dapat dicabut kapan saja. Keputusan kredit sepenuhnya kewenangan lembaga keuangan.</p>}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/login" size="lg">
            Lihat langsung di dashboard demo <ArrowRight />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
