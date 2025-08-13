export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
// Si no tienes tipos de DB, quita "<Database>" o crea tu archivo de tipos.
import type { Database } from '@/lib/types'

export async function GET() {
  try {
    // En Next 15 son Promises:
    const ck = await cookies()
    const hdrs = await headers()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => ck.get(name)?.value,
          set: () => {},   // no persistimos desde aquí
          remove: () => {},// no persistimos desde aquí
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    return NextResponse.json({
      ok: true,
      hasSession: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message ?? null,
      debug: {
        cookieKeys: ck.getAll().map(c => c.name),
        host: hdrs.get('host'),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelRegion: process.env.VERCEL_REGION ?? null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
