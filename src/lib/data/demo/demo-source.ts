import "server-only";
import type { EnergyDataSource, ReadingQuery, VerificationRecord } from "@/lib/data/adapter";
import { DEMO_BUSINESS, DEMO_MACHINES, getDemoDataset } from "@/lib/data/demo/generator";
import { localDayKey, DAY_MS } from "@/lib/time";

/** Binary search for first index with timestamp >= iso. */
function lowerBound(arr: { timestamp: string }[], iso: string): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].timestamp < iso) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class DemoDataSource implements EnergyDataSource {
  readonly mode = "demo" as const;

  async getBusiness() {
    return DEMO_BUSINESS;
  }

  async getMachines() {
    return DEMO_MACHINES;
  }

  async getDevices() {
    return getDemoDataset().devices;
  }

  async getLatestTimestamp() {
    return getDemoDataset().anchors.latest;
  }

  async getEarliestTimestamp() {
    return getDemoDataset().anchors.start;
  }

  async getReadings({ from, to, machineIds }: ReadingQuery) {
    const { readings } = getDemoDataset();
    const start = lowerBound(readings, from.toISOString());
    const end = lowerBound(readings, to.toISOString());
    const slice = readings.slice(start, end);
    if (!machineIds || machineIds.length === 0) return slice;
    const set = new Set(machineIds);
    return slice.filter((r) => set.has(r.machine_id));
  }

  async getProduction(from: Date, to: Date) {
    const fromKey = localDayKey(from);
    const toKey = localDayKey(new Date(to.getTime() - 1));
    return getDemoDataset().production.filter((p) => p.date >= fromKey && p.date <= toKey);
  }

  async getMeasures() {
    return getDemoDataset().measures;
  }

  async getVerificationRecords(): Promise<VerificationRecord[]> {
    const { anchors } = getDemoDataset();
    const p1Start = anchors.interventionAt;
    const p1End = new Date(p1Start.getTime() + 30 * DAY_MS);
    return [
      {
        measureId: "ECM-01",
        periodStart: p1Start.toISOString(),
        periodEnd: p1End.toISOString(),
        verifier: "Auditor Energi Independen (simulasi demo)",
        verifiedAt: new Date(p1End.getTime() + 2 * DAY_MS).toISOString(),
      },
    ];
  }
}
