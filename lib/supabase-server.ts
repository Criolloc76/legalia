// Server-side Supabase client (Next.js App Router / Route Handlers)
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const ck = cookies();     // ¡OJO! NO usar "await cookies()"
  const hdrs = headers();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Manejo de cookies compatible con Next 14/15
      cookies: {
        getAll() {
          // ck es ReadonlyRequestCookies
          return ck.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              ck.set(name, value, options);
            });
          } catch {
            // silencioso (en edge puede fallar set)
          }
        },
      },
      headers: {
        // opcional: útil si activas RLS con session from headers
        get(key: string) {
          return hdrs.get(key);
        },
      },
    }
  );
}
