'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'

export default function Panel() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = supabaseBrowser()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setLoading(false)
    })
  }, [])

  if (loading) return <main className="min-h-screen grid place-items-center p-6">Cargando…</main>

  if (!email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-center space-y-2">
          <p>No has iniciado sesión.</p>
          <Link className="underline" href="/auth">Ir a /auth</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Panel del abogado</h1>
        <p>Sesión iniciada: {email}</p>
      </div>
    </main>
  )
}
