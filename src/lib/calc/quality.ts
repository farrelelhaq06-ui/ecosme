import type { Device, EnergyReading, Machine } from "@/lib/domain/types";
import { HOUR_MS } from "@/lib/time";

export interface DataGap {
  machineId: string;
  from: string;
  to: string; // exclusive
  hours: number;
}

export interface DeviceQuality {
  machineId: string;
  deviceId: string;
  expected: number;
  received: number;
  completeness: number; // 0..1
  outOfRange: number;
  gaps: DataGap[];
}

export interface QualitySummary {
  completeness: number; // 0..1
  expected: number;
  received: number;
  outOfRange: number;
  gapCount: number;
  longestGapHours: number;
  perDevice: DeviceQuality[];
  rating: "baik" | "cukup" | "perlu perhatian";
}

/**
 * Data-quality assessment: completeness of hourly intervals, readings
 * flagged out-of-range, and gaps (>= 2 consecutive missing hours).
 */
export function assessQuality(readings: EnergyReading[], machines: Machine[], from: Date, to: Date): QualitySummary {
  const hours = Math.max(0, Math.round((to.getTime() - from.getTime()) / HOUR_MS));
  const byMachine = new Map<string, EnergyReading[]>();
  for (const m of machines) byMachine.set(m.id, []);
  for (const r of readings) byMachine.get(r.machine_id)?.push(r);

  const perDevice: DeviceQuality[] = machines.map((m) => {
    const rs = byMachine.get(m.id) ?? [];
    const present = new Set(rs.map((r) => new Date(r.timestamp).getTime()));
    const gaps: DataGap[] = [];
    let gapStart: number | null = null;
    for (let i = 0; i <= hours; i++) {
      const ms = from.getTime() + i * HOUR_MS;
      const missing = i < hours && !present.has(ms);
      if (missing && gapStart === null) gapStart = ms;
      if (!missing && gapStart !== null) {
        const len = (ms - gapStart) / HOUR_MS;
        if (len >= 2) gaps.push({ machineId: m.id, from: new Date(gapStart).toISOString(), to: new Date(ms).toISOString(), hours: len });
        gapStart = null;
      }
    }
    return {
      machineId: m.id,
      deviceId: m.deviceId,
      expected: hours,
      received: rs.length,
      completeness: hours ? rs.length / hours : 1,
      outOfRange: rs.filter((r) => r.quality === "out_of_range").length,
      gaps,
    };
  });

  const expected = perDevice.reduce((s, d) => s + d.expected, 0);
  const received = perDevice.reduce((s, d) => s + d.received, 0);
  const completeness = expected ? received / expected : 1;
  const allGaps = perDevice.flatMap((d) => d.gaps);
  return {
    completeness,
    expected,
    received,
    outOfRange: perDevice.reduce((s, d) => s + d.outOfRange, 0),
    gapCount: allGaps.length,
    longestGapHours: allGaps.reduce((m, g) => Math.max(m, g.hours), 0),
    perDevice,
    rating: completeness >= 0.97 ? "baik" : completeness >= 0.9 ? "cukup" : "perlu perhatian",
  };
}

export function deviceStatusLabel(d: Device): string {
  return d.status === "online" ? "Online" : d.status === "degraded" ? "Sinyal lemah" : "Offline";
}
