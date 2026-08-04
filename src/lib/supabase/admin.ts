import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Only import this from trusted server-side code (seed/admin scripts, or
 * route handlers that have already authorized the request themselves) —
 * never from anything reachable with a user-supplied protocol/table name,
 * and never from client components. The `server-only` import makes any
 * accidental client-bundle usage a build-time error.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
