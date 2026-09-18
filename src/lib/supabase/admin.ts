import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Nutzt den Service-Role-Key -> umgeht RLS komplett. Ausschließlich in
// serverseitigem Code verwenden (Route Handlers / Server Actions), die
// zuvor selbst geprüft haben, dass der Aufrufer Admin ist. NIE an den
// Client weitergeben oder importieren.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
