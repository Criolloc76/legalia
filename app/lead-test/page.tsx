'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function LeadTest() {
  const [name, setName] = useState('Juan Pérez')
  const [city, setCity] = useState('Bogotá')
  const [summary, setSummary] = useState('Consulta por despido sin justa causa')
  const [status, setStatus] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Guardando…')
    const supabase = supabaseBrowser()

    // 1) Traer usuario (para owner_user_id por RLS)
    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr || !user) { setStatus('Sin sesión'); return }

    // 2) Insertar lead con owner_user_id = user.id (RLS exige esto)
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name, city, summary,
        owner_user_id: user.id,
        whatsapp_opt_in: false
      })
      .select('id')
      .single()

    if (error) { setStatus(`Error: ${error.message}`) }
    else { setLeadId(data.id); setStatus('Lead creado ✅') }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">Crear lead (prueba)</h1>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre" />
        <input className="w-full border rounded px-3 py-2" value={city} onChange={e=>setCity(e.target.value)} placeholder="Ciudad" />
        <textarea className="w-full border rounded px-3 py-2" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Resumen del caso" />
        <button className="rounded px-4 py-2 bg-black text-white">Guardar lead</button>
        {status && <p className="text-sm opacity-80">{status}</p>}
        {leadId && <p className="text-sm">ID: {leadId}</p>}
      </form>
    </main>
  )
}
