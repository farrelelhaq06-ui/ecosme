import { describe, expect, it } from "vitest";
import type { EnergyReading, TariffSettings } from "@/lib/domain/types";
import { buildSeries, computeTotals, isPeakHour, rateForHour } from "@/lib/calc/energy";
import { linearFit, computeSavingsPeriod, computeBaseline } from "@/lib/calc/savings";
import { computeGreenScore } from "@/lib/calc/green-score";
import { assessQuality } from "@/lib/calc/quality";
import { DEFAULT_GREEN_SCORE_WEIGHTS } from "@/lib/config";
import { DEMO_MACHINES, getDemoDataset } from "@/lib/data/demo/generator";

const tariff: TariffSettings = {
  tariffGroup: "TEST",
  baseRateIdrPerKwh: 1000,
  peakMultiplier: 1.5,
  peakStartHour: 17,
  peakEndHour: 22,
  emissionFactorKgPerKwh: 0.8,
};

/** Build an ISO timestamp for a given Jakarta local hour on 2026-01-05 (Mon). */
const at = (h: number) => new Date(Date.UTC(2026, 0, 5, h - 7)).toISOString();

function reading(h: number, kwh: number, pf: number | null = 0.9, machine = "M-01"): EnergyReading {
  return {
    timestamp: at(h),
    device_id: "D",
    machine_id: machine,
    current_ampere: 10,
    voltage_volt: 380,
    active_power_watt: kwh * 1000,
    power_factor: pf,
    energy_kwh: kwh,
    frequency_hz: 50,
    quality: "ok",
  };
}

describe("cost & totals", () => {
  it("applies the WBP multiplier only during peak hours", () => {
    expect(isPeakHour(16, tariff)).toBe(false);
    expect(isPeakHour(17, tariff)).toBe(true);
    expect(isPeakHour(22, tariff)).toBe(false);
    expect(rateForHour(18, tariff)).toBe(1500);
    expect(rateForHour(10, tariff)).toBe(1000);
  });

  it("computes cost, peak share, weighted PF, max demand and emissions", () => {
    const t = computeTotals([reading(10, 10, 0.8), reading(18, 10, 1.0), reading(18, 5, null, "M-02")], tariff);
    expect(t.kwh).toBe(25);
    expect(t.costIdr).toBe(10 * 1000 + 15 * 1500);
    expect(t.peakShare).toBeCloseTo(15 / 25);
    expect(t.avgPowerFactor).toBeCloseTo((0.8 * 10 + 1.0 * 10) / 20);
    expect(t.maxDemandKw).toBe(15);
    expect(t.emissionKg).toBeCloseTo(20);
  });

  it("returns null PF when no PF data exists", () => {
    expect(computeTotals([reading(10, 1, null)], tariff).avgPowerFactor).toBeNull();
  });

  it("builds hourly buckets including empty ones", () => {
    const from = new Date(at(8));
    const to = new Date(at(12));
    const s = buildSeries([reading(9, 3)], from, to, "hour", tariff);
    expect(s).toHaveLength(4);
    expect(s.map((p) => p.kwh)).toEqual([0, 3, 0, 0]);
  });
});

describe("M&V savings", () => {
  it("fits a perfect line", () => {
    const f = linearFit([0, 1, 2, 3], [10, 12, 14, 16]);
    expect(f.slope).toBeCloseTo(2);
    expect(f.intercept).toBeCloseTo(10);
    expect(f.r2).toBeCloseTo(1);
  });

  it("computes avoided energy against the production-adjusted baseline", () => {
    const measure = { id: "E", name: "E", machineIds: [], implementedAt: at(0), investmentIdr: 0, status: "implemented" as const, methodology: "" };
    const baseline = { ...computeBaseline(measure, [], [], new Date(), new Date()), interceptKwh: 100, slopeKwhPerUnit: 0.5 };
    const p = computeSavingsPeriod({
      id: "P",
      measure,
      baseline,
      readings: [reading(10, 150)],
      production: [{ date: "2026-01-05", units: 200 }],
      periodStart: new Date(at(0)),
      periodEnd: new Date(at(23)),
      tariff,
      closed: true,
    });
    // Adjusted baseline = 100 + 0.5*200 = 200; actual = 150 → 50 kWh saved (25%).
    expect(p.adjustedBaselineKwh).toBeCloseTo(200);
    expect(p.savedKwh).toBeCloseTo(50);
    expect(p.savedPct).toBeCloseTo(25);
    expect(p.status).toBe("calculated");
  });

  it("is never 'verified' without a verification record", () => {
    const measure = { id: "E", name: "E", machineIds: [], implementedAt: at(0), investmentIdr: 0, status: "implemented" as const, methodology: "" };
    const baseline = computeBaseline(measure, [], [], new Date(), new Date());
    const p = computeSavingsPeriod({ id: "P", measure, baseline, readings: [], production: [], periodStart: new Date(), periodEnd: new Date(), tariff, closed: false });
    expect(p.status).toBe("in_progress");
  });
});

describe("green score", () => {
  it("is bounded 0..100 and gives 0 for missing verified savings", () => {
    const r = computeGreenScore(
      { intensityImprovementPct: null, verifiedSavingsPct: null, completeness: 0.5, peakShare: 0.6, avgPowerFactor: 0.6, periodLabel: "x" },
      DEFAULT_GREEN_SCORE_WEIGHTS,
    );
    expect(r.total).toBe(0);
    expect(r.grade).toBe("D");
    const best = computeGreenScore(
      { intensityImprovementPct: 30, verifiedSavingsPct: 20, completeness: 1, peakShare: 0.1, avgPowerFactor: 0.99, periodLabel: "x" },
      DEFAULT_GREEN_SCORE_WEIGHTS,
    );
    expect(best.total).toBe(100);
    expect(best.grade).toBe("A");
  });
});

describe("data quality", () => {
  it("detects gaps of 2+ hours", () => {
    const m = DEMO_MACHINES.slice(0, 1);
    const from = new Date(at(0));
    const to = new Date(at(6));
    const rs = [0, 1, 4, 5].map((h) => ({ ...reading(h, 1), machine_id: m[0].id }));
    const q = assessQuality(rs, m, from, to);
    expect(q.completeness).toBeCloseTo(4 / 6);
    expect(q.gapCount).toBe(1);
    expect(q.longestGapHours).toBe(2);
  });
});

describe("demo dataset", () => {
  const ds = getDemoDataset(new Date("2026-10-28T03:30:00Z"));

  it("is deterministic", () => {
    const again = getDemoDataset(new Date("2026-10-28T03:45:00Z"));
    expect(again.readings.length).toBe(ds.readings.length);
  });

  it("has sane physical values", () => {
    for (const r of ds.readings.slice(0, 2000)) {
      expect(r.energy_kwh).toBeGreaterThanOrEqual(0);
      if (r.power_factor !== null) {
        expect(r.power_factor).toBeGreaterThan(0.5);
        expect(r.power_factor).toBeLessThanOrEqual(1);
      }
    }
  });

  it("shows a measurable reduction after the documented measure", () => {
    const intervention = ds.anchors.interventionAt.getTime();
    const daysBefore = (intervention - ds.anchors.start.getTime()) / 86400000;
    const before = ds.readings.filter((r) => new Date(r.timestamp).getTime() < intervention).reduce((s, r) => s + r.energy_kwh, 0) / daysBefore;
    const after = ds.readings.filter((r) => new Date(r.timestamp).getTime() >= intervention).reduce((s, r) => s + r.energy_kwh, 0) / 60;
    expect(after).toBeLessThan(before);
  });
});
