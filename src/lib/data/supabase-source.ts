import "server-only";
import type { EnergyDataSource } from "@/lib/data/adapter";

/**
 * Placeholder for a Supabase-backed data source.
 *
 * Not connected: no Supabase project was configured for this build. The
 * schema in `supabase/schema.sql` defines the tables this adapter would read.
 * Implement each method with the server-side Supabase client (service-role
 * key must ONLY be read from server env vars, never sent to the browser).
 */
export class SupabaseDataSource implements EnergyDataSource {
  readonly mode = "supabase" as const;

  private notConnected(): never {
    throw new Error(
      "SupabaseDataSource belum terhubung. Set DATA_SOURCE=demo atau implementasikan adapter ini (lihat README).",
    );
  }

  getBusiness = async () => this.notConnected();
  getMachines = async () => this.notConnected();
  getDevices = async () => this.notConnected();
  getLatestTimestamp = async () => this.notConnected();
  getEarliestTimestamp = async () => this.notConnected();
  getReadings = async () => this.notConnected();
  getProduction = async () => this.notConnected();
  getMeasures = async () => this.notConnected();
  getVerificationRecords = async () => this.notConnected();
}
