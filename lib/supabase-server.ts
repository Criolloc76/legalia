// lib/supabase-server.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export function supabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // API compatible con Next 13/14/15: firma set(name, value, options)
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          // Borrar cookie: set con maxAge: 0
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}
