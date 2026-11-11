import "server-only";
import type { EnergyDataSource } from "@/lib/data/adapter";
import { DemoDataSource } from "@/lib/data/demo/demo-source";
import { SupabaseDataSource } from "@/lib/data/supabase-source";

let instance: EnergyDataSource | null = null;

/** Returns the active data source. Defaults to DEMO. */
export function getDataSource(): EnergyDataSource {
  if (instance) return instance;
  const wantsSupabase =
    process.env.DATA_SOURCE === "supabase" && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  instance = wantsSupabase ? new SupabaseDataSource() : new DemoDataSource();
  return instance;
}

export function isDemoMode(): boolean {
  return getDataSource().mode === "demo";
}
