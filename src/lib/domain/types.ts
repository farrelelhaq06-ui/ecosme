/**
 * Core EcoSME business entities.
 * Identifiers and fields use English; UI copy is Indonesian.
 */

export type Role = "ikm" | "bank" | "admin";

/** Where a number comes from. Every metric shown in the UI carries one. */
export type Provenance = "live" | "simulated" | "estimated" | "verified";

export type DataSourceMode = "demo" | "supabase";

export type ReadingQuality = "ok" | "out_of_range" | "interpolated";

/** One aggregated measurement interval (1 hour) from one IoT device. */
export interface EnergyReading {
  timestamp: string; // ISO, interval start
  device_id: string;
  machine_id: string;
  current_ampere: number | null;
  voltage_volt: number | null;
  active_power_watt: number | null; // interval average
  power_factor: number | null;
  energy_kwh: number; // energy consumed during the interval
  frequency_hz: number | null;
  quality: ReadingQuality;
}

export type MachineCategory =
  | "compressor"
  | "cnc"
  | "welding"
  | "oven"
  | "pump"
  | "utility";

export interface Machine {
  id: string;
  name: string;
  category: MachineCategory;
  ratedPowerKw: number;
  location: string;
  /** Scheduled operating window (local hour, inclusive start, exclusive end). */
  schedule: { start: number; end: number; days: string };
  deviceId: string;
}

export type DeviceStatus = "online" | "degraded" | "offline";

export interface Device {
  id: string;
  serial: string;
  model: string;
  machineId: string | null;
  firmware: string;
  status: DeviceStatus;
  lastSeen: string;
  signalDbm: number;
  installedAt: string;
}

export interface Business {
  id: string;
  name: string;
  sector: string;
  city: string;
  productUnit: string; // e.g. "unit komponen"
  employees: number;
  tariffGroup: string;
  contractedPowerKva: number;
}

export interface ProductionRecord {
  date: string; // yyyy-mm-dd
  units: number;
}

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "overload"
  | "low_power_factor"
  | "off_hours"
  | "device_offline"
  | "voltage_deviation"
  | "data_gap";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  machineId: string | null;
  deviceId: string | null;
  title: string;
  description: string;
  detectedAt: string;
  occurrences: number;
}

export type EnergyMeasureStatus = "planned" | "implemented";

/** An energy-conservation measure (ECM) with an M&V baseline. */
export interface EnergyMeasure {
  id: string;
  name: string;
  machineIds: string[];
  implementedAt: string; // ISO date
  investmentIdr: number;
  status: EnergyMeasureStatus;
  methodology: string;
}

export interface Baseline {
  id: string;
  measureId: string;
  periodStart: string;
  periodEnd: string;
  /** kWh per production unit during the baseline period (simple ratio). */
  intensityKwhPerUnit: number;
  totalKwh: number;
  totalUnits: number;
  days: number;
  /** Daily regression model: kWh = interceptKwh + slopeKwhPerUnit × units. */
  interceptKwh: number;
  slopeKwhPerUnit: number;
  r2: number;
  cvRmsePct: number;
  normalization: string;
}

export type SavingsStatus = "verified" | "calculated" | "in_progress";

export interface SavingsPeriod {
  id: string;
  measureId: string;
  periodStart: string;
  periodEnd: string;
  status: SavingsStatus;
  verifier: string | null;
  verifiedAt: string | null;
  adjustedBaselineKwh: number;
  actualKwh: number;
  savedKwh: number;
  savedIdr: number;
  savedPct: number;
  avoidedEmissionKg: number;
}

export interface GreenScoreComponent {
  key: "intensity" | "verified_savings" | "data_quality" | "peak_load" | "power_factor";
  label: string;
  weight: number; // 0–100, all weights sum to 100
  score: number; // 0–100
  rawValue: string;
  explanation: string;
}

export interface GreenScoreResult {
  total: number;
  grade: "A" | "B" | "C" | "D";
  components: GreenScoreComponent[];
  periodLabel: string;
}

export interface TariffSettings {
  tariffGroup: string;
  baseRateIdrPerKwh: number;
  peakMultiplier: number; // WBP factor applied to base rate
  peakStartHour: number;
  peakEndHour: number;
  emissionFactorKgPerKwh: number;
}

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "info_requested"
  | "approved_in_principle"
  | "declined";

export interface FinancingApplication {
  id: string;
  businessId: string;
  businessName: string;
  sector: string;
  city: string;
  project: string;
  requestedIdr: number;
  greenScore: number;
  readinessPct: number;
  monthlyKwh: number;
  verifiedSavingsIdr: number | null;
  status: ApplicationStatus;
  submittedAt: string;
  consentScope: string[];
  partner: string;
  isDemoSeed: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  role: Role | "system";
  action: string;
  target: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
}

export interface DateRange {
  key: RangeKey;
  from: Date;
  to: Date;
  label: string;
  granularity: "hour" | "day";
}

export type RangeKey = "24h" | "7d" | "30d" | "90d";
