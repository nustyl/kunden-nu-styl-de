import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Für Server Components, Route Handlers, Server Actions. Nutzt den
// anon-Key + die Session-Cookies des Nutzers -> RLS greift ganz normal.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Wird in Server Components (kein Write-Zugriff auf Cookies)
            // erwartet und vom middleware.ts Session-Refresh abgefangen.
          }
        },
      },
    }
  );
}
