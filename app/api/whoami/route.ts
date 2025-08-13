// app/api/whoami/route.ts
import { NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'           // en Vercel, Node runtime
export const dynamic = 'force-dynamic'    // desactiva caché de ruta en prod

export async function GET() {
  try {
    const supabase = supabaseServer()

    // sesión (si hay)
    const { data, error } = await supabase.auth.getUser()
    const user = data?.user ?? null

    const hdrs = headers()
    const ck = cookies()

    return NextResponse.json({
      ok: true,
      hasSession: !!user,
      user: user
        ? { id: user.id, email: user.email, aud: user.aud }
        : null,
      debug: {
        cookieKeys: ck.getAll().map(c => c.name),
        host: hdrs.get('host'),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelRegion: process.env.VERCEL_REGION ?? null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
