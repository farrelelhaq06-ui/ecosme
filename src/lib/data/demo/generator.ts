import type { Business, Device, EnergyMeasure, EnergyReading, Machine, ProductionRecord } from "@/lib/domain/types";
import { DAY_MS, HOUR_MS, floorHour, localDayKey, localHour, localWeekday, startOfLocalDay } from "@/lib/time";

/**
 * Deterministic DEMO dataset generator.
 *
 * Produces 120 days of hourly readings for a fictional metal-fabrication IKM.
 * Values are SIMULATED. They are generated from documented load profiles plus
 * seeded noise so that every page shows consistent numbers across reloads.
 */

export const DEMO_DAYS = 120;

export const DEMO_BUSINESS: Business = {
  id: "biz-demo-001",
  name: "CV Maju Logam Presisi",
  sector: "Fabrikasi komponen logam",
  city: "Sidoarjo, Jawa Timur",
  productUnit: "unit",
  employees: 48,
  tariffGroup: "I-3/TM",
  contractedPowerKva: 240,
};

export const DEMO_MACHINES: Machine[] = [
  { id: "M-01", name: "Kompresor Udara 22 kW", category: "compressor", ratedPowerKw: 22, location: "Ruang utilitas", schedule: { start: 6, end: 22, days: "Sen–Sab" }, deviceId: "DEV-1001" },
  { id: "M-02", name: "Mesin Bubut CNC", category: "cnc", ratedPowerKw: 11, location: "Lini produksi A", schedule: { start: 7, end: 16, days: "Sen–Sab" }, deviceId: "DEV-1002" },
  { id: "M-03", name: "Mesin Las Inverter (2 unit)", category: "welding", ratedPowerKw: 18, location: "Lini produksi B", schedule: { start: 8, end: 16, days: "Sen–Sab" }, deviceId: "DEV-1003" },
  { id: "M-04", name: "Oven Pengecatan", category: "oven", ratedPowerKw: 15, location: "Area finishing", schedule: { start: 7, end: 17, days: "Sen–Sab" }, deviceId: "DEV-1004" },
  { id: "M-05", name: "Pompa Air & Pendingin", category: "pump", ratedPowerKw: 5.5, location: "Ruang utilitas", schedule: { start: 6, end: 22, days: "Sen–Sab" }, deviceId: "DEV-1005" },
  { id: "M-06", name: "Penerangan & AC Kantor", category: "utility", ratedPowerKw: 6, location: "Gedung kantor", schedule: { start: 7, end: 18, days: "Sen–Sab" }, deviceId: "DEV-1006" },
];

const BASE_PF: Record<string, number> = { "M-01": 0.84, "M-02": 0.86, "M-03": 0.76, "M-04": 0.98, "M-05": 0.85, "M-06": 0.92 };

/* ---------- seeded randomness ---------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Uniform [0,1) deterministic for (key, n). */
function rand(key: string, n: number): number {
  let t = (hash(key) ^ Math.imul(n, 0x9e3779b1)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

/** Approx. normal noise in [-1, 1]. */
function noise(key: string, n: number): number {
  return (rand(key, n) + rand(key + "b", n) + rand(key + "c", n)) / 1.5 - 1;
}

/* ---------- anchors ---------- */

export interface DemoAnchors {
  latest: Date; // start of the latest complete hourly interval
  start: Date;
  interventionAt: Date;
  pumpOfflineSince: Date;
  voltageEventAt: Date;
  nightLeftOnDay: Date;
  lightingGapStart: Date;
}

export function computeAnchors(now: Date = new Date()): DemoAnchors {
  const latest = new Date(floorHour(now).getTime() - HOUR_MS);
  const today = startOfLocalDay(latest);
  return {
    latest,
    start: new Date(today.getTime() - (DEMO_DAYS - 1) * DAY_MS),
    interventionAt: new Date(today.getTime() - 60 * DAY_MS),
    pumpOfflineSince: new Date(latest.getTime() - 29 * HOUR_MS),
    voltageEventAt: new Date(today.getTime() - 5 * DAY_MS + 10 * HOUR_MS),
    nightLeftOnDay: new Date(today.getTime() - 3 * DAY_MS),
    lightingGapStart: new Date(today.getTime() - 2 * DAY_MS + 2 * HOUR_MS),
  };
}

/* ---------- load profiles ---------- */

function inWindow(h: number, start: number, end: number) {
  return h >= start && h < end;
}

/** Fraction of rated power drawn by a machine in a given local hour. */
function loadFactor(m: Machine, t: Date, a: DemoAnchors, n: number): number {
  const h = localHour(t);
  const wd = localWeekday(t);
  const sunday = wd === 0;
  const saturday = wd === 6;
  const after = t >= a.interventionAt;
  const end = (normal: number) => (saturday ? Math.min(normal, 13) : normal);
  const k = m.id;
  const z = noise(k, n);

  switch (m.category) {
    case "compressor": {
      const working = !sunday && inWindow(h, 6, end(22));
      if (working) return after ? 0.72 + 0.07 * z : 0.8 + 0.08 * z;
      // Night-time leakage before the measure; one recent night left running.
      const leftOn = t >= a.nightLeftOnDay && t.getTime() < a.nightLeftOnDay.getTime() + DAY_MS && (h >= 23 || h < 5);
      if (leftOn) return 0.45 + 0.05 * z;
      return after ? 0.08 + 0.01 * z : 0.28 + 0.03 * z;
    }
    case "cnc": {
      if (sunday || !inWindow(h, 7, end(16))) return 0.02;
      if (h === 12) return 0.3 + 0.05 * z;
      if (rand(k + "spike", n) < 0.03) return 0.96 + 0.02 * z;
      return 0.65 + 0.1 * z;
    }
    case "welding": {
      if (sunday || !inWindow(h, 8, end(16)) || h === 12) return 0;
      return Math.max(0.15, 0.45 + 0.15 * z);
    }
    case "oven": {
      if (sunday) return 0;
      // Overtime curing on Mon/Wed/Fri runs into the WBP (peak) window.
      const overtime = wd === 1 || wd === 3 || wd === 5;
      const close = saturday ? 13 : overtime ? 19 : 17;
      if (h === 7) return 0.88;
      if (inWindow(h, 8, close)) return 0.78 + 0.08 * z;
      return 0;
    }
    case "pump": {
      if (!sunday && inWindow(h, 6, end(22))) return 0.6 + 0.08 * z;
      return 0.1 + 0.02 * z;
    }
    case "utility": {
      if (!sunday && inWindow(h, 7, end(18))) return 0.72 + 0.08 * z;
      return 0.15 + 0.02 * z;
    }
  }
}

function hasReading(m: Machine, t: Date, a: DemoAnchors, n: number): boolean {
  if (m.id === "M-05" && t >= a.pumpOfflineSince) return false;
  if (m.id === "M-06" && t >= a.lightingGapStart && t.getTime() < a.lightingGapStart.getTime() + 6 * HOUR_MS) return false;
  return rand(m.id + "miss", n) >= 0.012;
}

function buildReading(m: Machine, t: Date, a: DemoAnchors): EnergyReading | null {
  const n = Math.floor(t.getTime() / HOUR_MS);
  if (!hasReading(m, t, a, n)) return null;

  const lf = Math.max(0, loadFactor(m, t, a, n));
  const powerW = lf * m.ratedPowerKw * 1000;
  const h = localHour(t);
  const voltageEvent = t.getTime() === a.voltageEventAt.getTime();
  const randomSpike = rand(m.id + "volt", n) < 0.0015;
  const peakSag = h >= 17 && h < 22 ? -4 : 0;
  const voltage = voltageEvent ? 334 + 2 * noise(m.id + "v", n) : randomSpike ? 424 : 380 + peakSag + 5 * noise(m.id + "v", n);
  const pfBase = m.id === "M-01" && t >= a.interventionAt ? 0.91 : BASE_PF[m.id];
  const running = powerW >= 50;
  const pf = running ? Math.min(0.99, pfBase + 0.015 * noise(m.id + "pf", n)) : null;
  const current = running && pf ? powerW / (Math.sqrt(3) * voltage * pf) : 0;

  return {
    timestamp: t.toISOString(),
    device_id: m.deviceId,
    machine_id: m.id,
    current_ampere: round(current, 2),
    voltage_volt: round(voltage, 1),
    active_power_watt: round(powerW, 0),
    power_factor: pf === null ? null : round(pf, 3),
    energy_kwh: round(powerW / 1000, 3),
    frequency_hz: round(50 + 0.04 * noise(m.id + "hz", n), 2),
    quality: voltageEvent || randomSpike ? "out_of_range" : "ok",
  };
}

function round(v: number, d: number) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/* ---------- cached dataset ---------- */

export interface DemoDataset {
  anchors: DemoAnchors;
  readings: EnergyReading[]; // sorted by timestamp, then machine
  production: ProductionRecord[];
  devices: Device[];
  measures: EnergyMeasure[];
}

let cache: { key: number; data: DemoDataset } | null = null;

export function getDemoDataset(now: Date = new Date()): DemoDataset {
  const anchors = computeAnchors(now);
  const key = anchors.latest.getTime();
  if (cache && cache.key === key) return cache.data;

  const readings: EnergyReading[] = [];
  for (let t = anchors.start.getTime(); t <= anchors.latest.getTime(); t += HOUR_MS) {
    const d = new Date(t);
    for (const m of DEMO_MACHINES) {
      const r = buildReading(m, d, anchors);
      if (r) readings.push(r);
    }
  }

  const production: ProductionRecord[] = [];
  for (let t = anchors.start.getTime(); t <= anchors.latest.getTime(); t += DAY_MS) {
    const d = new Date(t);
    const wd = localWeekday(d);
    const n = Math.floor(t / DAY_MS);
    let units = wd === 0 ? 0 : wd === 6 ? 430 + 40 * noise("prod", n) : 900 + 80 * noise("prod", n);
    if (t + DAY_MS > anchors.latest.getTime()) {
      // Current, partial day: production accrues across the 07–16 shift.
      const elapsed = (localHour(anchors.latest) + 1 - 7) / 9;
      units *= Math.min(1, Math.max(0, elapsed));
    }
    production.push({ date: localDayKey(d), units: Math.round(units) });
  }

  const nowMs = now.getTime();
  const devices: Device[] = DEMO_MACHINES.map((m, i) => {
    const offline = m.id === "M-05";
    const degraded = m.id === "M-06";
    return {
      id: m.deviceId,
      serial: `ESM-PM3-24${String(1001 + i).padStart(5, "0")}`,
      model: "EcoSME PowerMeter 3P (simulasi)",
      machineId: m.id,
      firmware: degraded ? "1.3.9" : "1.4.2",
      status: offline ? "offline" : degraded ? "degraded" : "online",
      lastSeen: offline
        ? anchors.pumpOfflineSince.toISOString()
        : new Date(nowMs - (2 + i * 3) * 60_000).toISOString(),
      signalDbm: offline ? -110 : degraded ? -97 : -62 - i * 3,
      installedAt: new Date(anchors.start.getTime() - 3 * DAY_MS).toISOString(),
    };
  });

  const measures: EnergyMeasure[] = [
    {
      id: "ECM-01",
      name: "Perbaikan kebocoran udara & pemasangan VSD kompresor",
      machineIds: ["M-01"],
      implementedAt: anchors.interventionAt.toISOString(),
      investmentIdr: 68_000_000,
      status: "implemented",
      methodology:
        "Perbandingan intensitas energi fasilitas (kWh/unit) terhadap baseline 60 hari sebelum implementasi, dinormalisasi terhadap volume produksi (pendekatan IPMVP Opsi C, disederhanakan).",
    },
    {
      id: "ECM-02",
      name: "Penjadwalan ulang oven pengecatan di luar jam WBP",
      machineIds: ["M-04"],
      implementedAt: new Date(anchors.latest.getTime() + 14 * DAY_MS).toISOString(),
      investmentIdr: 0,
      status: "planned",
      methodology: "Direncanakan — baseline akan diambil dari 30 hari terakhir sebelum implementasi.",
    },
  ];

  const data: DemoDataset = { anchors, readings, production, devices, measures };
  cache = { key, data };
  return data;
}
