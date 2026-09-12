import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is optional until the off-chain data model is defined.
 * Callers must opt in explicitly; no database schema or auth behavior is assumed.
 */
export function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}
