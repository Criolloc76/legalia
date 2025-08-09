'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setErrorMsg(null)
    const supabase = supabaseBrowser()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/panel` },
    })
    setLoading(false)
    if (error) setErrorMsg(error.message)
    else setSent(true)
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Ingresar</h1>
        <input
          type="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className="w-full border rounded px-3 py-2"
        />
        <button className="rounded px-4 py-2 bg-black text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </button>
        {sent && <p>Revisa tu correo (o Email Testing) y entra con el enlace.</p>}
        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
      </form>
    </main>
  )
}
