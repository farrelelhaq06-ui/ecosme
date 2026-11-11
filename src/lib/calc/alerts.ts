import type { Alert, Device, EnergyReading, Machine, TariffSettings } from "@/lib/domain/types";
import { assessQuality } from "@/lib/calc/quality";
import { rateForHour } from "@/lib/calc/energy";
import { localDayKey, localHour } from "@/lib/time";
import { fmtDateTime, fmtIdr, fmtNumber, fmtRelative } from "@/lib/utils";

/**
 * Rule-based alert detection over a window of readings.
 * Rules are intentionally simple and explainable.
 */
export const ALERT_RULES = {
  overloadPct: 0.92,
  lowPowerFactor: 0.85,
  offHoursStart: 23,
  offHoursEnd: 5,
  offHoursLoadPct: 0.3,
  voltageNominal: 380,
  voltageTolerancePct: 10,
  minGapHours: 4,
};

export function detectAlerts(
  readings: EnergyReading[],
  machines: Machine[],
  devices: Device[],
  window: { from: Date; to: Date },
  tariff: TariffSettings,
  now: Date = new Date(),
): Alert[] {
  const alerts: Alert[] = [];
  const mById = new Map(machines.map((m) => [m.id, m]));

  // 1) Overload — grouped per machine.
  const overload = new Map<string, EnergyReading[]>();
  for (const r of readings) {
    const m = mById.get(r.machine_id);
    if (!m || r.active_power_watt === null) continue;
    if (r.active_power_watt > ALERT_RULES.overloadPct * m.ratedPowerKw * 1000) {
      overload.set(m.id, [...(overload.get(m.id) ?? []), r]);
    }
  }
  for (const [mid, rs] of overload) {
    const m = mById.get(mid)!;
    const last = rs[rs.length - 1];
    const peak = Math.max(...rs.map((r) => r.active_power_watt ?? 0)) / 1000;
    alerts.push({
      id: `overload-${mid}-${localDayKey(last.timestamp)}`,
      type: "overload",
      severity: rs.length >= 5 ? "critical" : "warning",
      machineId: mid,
      deviceId: m.deviceId,
      title: `Beban mendekati kapasitas: ${m.name}`,
      description: `${rs.length} interval melebihi ${ALERT_RULES.overloadPct * 100}% daya pengenal (puncak ${fmtNumber(peak, 1)} kW dari ${m.ratedPowerKw} kW). Periksa kondisi mekanis dan pembagian beban.`,
      detectedAt: last.timestamp,
      occurrences: rs.length,
    });
  }

  // 2) Low power factor — per machine, energy-weighted.
  for (const m of machines) {
    const rs = readings.filter((r) => r.machine_id === m.id && r.power_factor !== null);
    const e = rs.reduce((s, r) => s + r.energy_kwh, 0);
    if (!e) continue;
    const pf = rs.reduce((s, r) => s + (r.power_factor ?? 0) * r.energy_kwh, 0) / e;
    if (pf < ALERT_RULES.lowPowerFactor) {
      const lowCount = rs.filter((r) => (r.power_factor ?? 1) < ALERT_RULES.lowPowerFactor).length;
      alerts.push({
        id: `lowpf-${m.id}`,
        type: "low_power_factor",
        severity: pf < 0.8 ? "warning" : "info",
        machineId: m.id,
        deviceId: m.deviceId,
        title: `Faktor daya rendah: ${m.name}`,
        description: `PF rata-rata ${fmtNumber(pf, 2)} (ambang ${ALERT_RULES.lowPowerFactor}). PF rendah meningkatkan arus dan berpotensi menimbulkan biaya kVARh. Pertimbangkan kajian kapasitor bank.`,
        detectedAt: rs[rs.length - 1].timestamp,
        occurrences: lowCount,
      });
    }
  }

  // 3) Off-hours consumption — grouped per machine per night.
  const nights = new Map<string, EnergyReading[]>();
  for (const r of readings) {
    const m = mById.get(r.machine_id);
    if (!m || m.category === "pump" || m.category === "utility") continue;
    const h = localHour(r.timestamp);
    const off = h >= ALERT_RULES.offHoursStart || h < ALERT_RULES.offHoursEnd;
    if (off && (r.active_power_watt ?? 0) > ALERT_RULES.offHoursLoadPct * m.ratedPowerKw * 1000) {
      const nightKey = localDayKey(new Date(new Date(r.timestamp).getTime() - 6 * 3600_000));
      const k = `${m.id}|${nightKey}`;
      nights.set(k, [...(nights.get(k) ?? []), r]);
    }
  }
  for (const [k, rs] of nights) {
    if (rs.length < 2) continue;
    const [mid, night] = k.split("|");
    const m = mById.get(mid)!;
    const kwh = rs.reduce((s, r) => s + r.energy_kwh, 0);
    const cost = rs.reduce((s, r) => s + r.energy_kwh * rateForHour(localHour(r.timestamp), tariff), 0);
    alerts.push({
      id: `offhours-${mid}-${night}`,
      type: "off_hours",
      severity: "warning",
      machineId: mid,
      deviceId: m.deviceId,
      title: `Mesin menyala di luar jam operasi: ${m.name}`,
      description: `${rs.length} jam konsumsi di luar jadwal (${fmtNumber(kwh, 1)} kWh ≈ ${fmtIdr(cost)}, estimasi). Pastikan prosedur shutdown akhir shift.`,
      detectedAt: rs[rs.length - 1].timestamp,
      occurrences: rs.length,
    });
  }

  // 4) Device connectivity.
  for (const d of devices) {
    const m = d.machineId ? mById.get(d.machineId) : undefined;
    if (d.status === "offline") {
      alerts.push({
        id: `offline-${d.id}`,
        type: "device_offline",
        severity: "critical",
        machineId: d.machineId,
        deviceId: d.id,
        title: `Perangkat offline: ${d.id}${m ? ` (${m.name})` : ""}`,
        description: `Tidak ada data sejak ${fmtDateTime(d.lastSeen)} (${fmtRelative(d.lastSeen, now)}). Periksa catu daya dan koneksi jaringan perangkat.`,
        detectedAt: d.lastSeen,
        occurrences: 1,
      });
    } else if (d.status === "degraded") {
      alerts.push({
        id: `signal-${d.id}`,
        type: "device_offline",
        severity: "info",
        machineId: d.machineId,
        deviceId: d.id,
        title: `Sinyal perangkat lemah: ${d.id}`,
        description: `Kekuatan sinyal ${d.signalDbm} dBm. Risiko kehilangan data; pertimbangkan antena eksternal atau repeater.`,
        detectedAt: d.lastSeen,
        occurrences: 1,
      });
    }
  }

  // 5) Voltage deviation — grouped by timestamp.
  const volt = new Map<string, EnergyReading[]>();
  for (const r of readings) {
    if (r.voltage_volt === null) continue;
    const dev = Math.abs(r.voltage_volt - ALERT_RULES.voltageNominal) / ALERT_RULES.voltageNominal * 100;
    if (dev > ALERT_RULES.voltageTolerancePct) volt.set(r.timestamp, [...(volt.get(r.timestamp) ?? []), r]);
  }
  for (const [ts, rs] of volt) {
    const v = rs.reduce((s, r) => s + (r.voltage_volt ?? 0), 0) / rs.length;
    const facilityWide = rs.length >= 3;
    alerts.push({
      id: `voltage-${ts}`,
      type: "voltage_deviation",
      severity: facilityWide ? "critical" : "warning",
      machineId: facilityWide ? null : rs[0].machine_id,
      deviceId: facilityWide ? null : rs[0].device_id,
      title: facilityWide ? "Deviasi tegangan di seluruh fasilitas" : `Deviasi tegangan: ${mById.get(rs[0].machine_id)?.name ?? rs[0].machine_id}`,
      description: `Tegangan rata-rata ${fmtNumber(v, 0)} V (nominal ${ALERT_RULES.voltageNominal} V, toleransi ±${ALERT_RULES.voltageTolerancePct}%) pada ${rs.length} titik ukur. Data ditandai "di luar rentang".`,
      detectedAt: ts,
      occurrences: rs.length,
    });
  }

  // 6) Data gaps (excluding currently-offline devices, already alerted).
  const offlineIds = new Set(devices.filter((d) => d.status === "offline").map((d) => d.machineId));
  const q = assessQuality(readings, machines, window.from, window.to);
  for (const d of q.perDevice) {
    if (offlineIds.has(d.machineId)) continue;
    for (const g of d.gaps.filter((g) => g.hours >= ALERT_RULES.minGapHours)) {
      alerts.push({
        id: `gap-${d.machineId}-${g.from}`,
        type: "data_gap",
        severity: "info",
        machineId: d.machineId,
        deviceId: d.deviceId,
        title: `Celah data ${g.hours} jam: ${mById.get(d.machineId)?.name ?? d.machineId}`,
        description: `Tidak ada data dari ${fmtDateTime(g.from)} hingga ${fmtDateTime(g.to)}. Interval ini dikecualikan dari perhitungan penghematan.`,
        detectedAt: g.to,
        occurrences: 1,
      });
    }
  }

  const sevRank = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.detectedAt.localeCompare(a.detectedAt));
}

export const ALERT_TYPE_LABEL: Record<Alert["type"], string> = {
  overload: "Beban lebih",
  low_power_factor: "Faktor daya",
  off_hours: "Di luar jam operasi",
  device_offline: "Konektivitas",
  voltage_deviation: "Tegangan",
  data_gap: "Celah data",
};
