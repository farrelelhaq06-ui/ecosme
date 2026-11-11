import type {
  Business,
  DataSourceMode,
  Device,
  EnergyMeasure,
  EnergyReading,
  Machine,
  ProductionRecord,
} from "@/lib/domain/types";

export interface ReadingQuery {
  from: Date; // inclusive
  to: Date; // exclusive
  machineIds?: string[];
}

export interface VerificationRecord {
  measureId: string;
  periodStart: string;
  periodEnd: string;
  verifier: string;
  verifiedAt: string;
}

/**
 * Data-access contract for energy data. Pages and services depend only on
 * this interface so that the DEMO source can be swapped for Supabase (or a
 * direct IoT ingestion API) without touching UI code.
 */
export interface EnergyDataSource {
  readonly mode: DataSourceMode;
  getBusiness(): Promise<Business>;
  getMachines(): Promise<Machine[]>;
  getDevices(): Promise<Device[]>;
  /** Start of the most recent complete hourly interval. */
  getLatestTimestamp(): Promise<Date>;
  /** Start of the earliest interval available. */
  getEarliestTimestamp(): Promise<Date>;
  getReadings(q: ReadingQuery): Promise<EnergyReading[]>;
  getProduction(from: Date, to: Date): Promise<ProductionRecord[]>;
  getMeasures(): Promise<EnergyMeasure[]>;
  getVerificationRecords(): Promise<VerificationRecord[]>;
}
