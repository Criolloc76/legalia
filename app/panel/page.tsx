// app/panel/page.tsx
import { supabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

type LeadObj = { name: string | null }
type EnrichmentRow = {
  id: string
  created_at: string
  lead_id: string
  area: string | null
  subtopic: string | null
  keywords: string[] | null
  jurisdiction: string | null
  amount_estimate: number | null
  urgency: 'alta' | 'media' | 'baja' | null
  facts: string | null
  // Supabase a veces devuelve objeto y a veces array si la relación no está configurada;
  // lo tipamos como unión para ser tolerantes:
  leads: LeadObj | LeadObj[] | null
}

export default async function Panel() {
  const supabase = supabaseServer()

  // 1) Requiere sesión
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) redirect('/auth')

  // 2) Trae últimos 50 enriquecimientos (+ nombre del lead)
  const { data, error } = await supabase
    .from('enrichments')
    .select(`
      id, created_at, lead_id, area, subtopic, keywords, jurisdiction,
      amount_estimate, urgency, facts,
      leads:lead_id ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Panel del abogado</h1>
        <p className="text-red-600">Error cargando datos: {error.message}</p>
      </main>
    )
  }

  // Normaliza leads a un objeto (toma el primero si viene como array)
  const rows: EnrichmentRow[] = (data ?? []).map((r: any) => {
    const raw = r?.leads ?? null
    const normalized: LeadObj | null = Array.isArray(raw) ? (raw[0] ?? null) : raw
    return { ...r, leads: normalized }
  })

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Panel del abogado</h1>
      <p className="text-sm opacity-70">
        Sesión: {auth.user.email} — Enriquecimientos recientes ({rows.length})
      </p>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-zinc-900">
            <tr className="text-left">
              <th className="p-2">Fecha</th>
              <th className="p-2">Lead</th>
              <th className="p-2">Área / Subtema</th>
              <th className="p-2">Urgencia</th>
              <th className="p-2">Monto (COP)</th>
              <th className="p-2">Jurisdicción</th>
              <th className="p-2">Keywords</th>
              <th className="p-2">Hechos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-center opacity-60" colSpan={8}>
                  Aún no hay enriquecimientos. Envía un mensaje desde /chat-test.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const leadName =
                  (r.leads && !Array.isArray(r.leads) && r.leads.name) ||
                  (Array.isArray(r.leads) && r.leads[0]?.name) ||
                  '(sin nombre)'
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      {leadName}{' '}
                      <span className="opacity-60 text-xs">({r.lead_id.slice(0, 8)})</span>
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{r.area ?? '—'}</div>
                      <div className="opacity-70">{r.subtopic ?? ''}</div>
                    </td>
                    <td className="p-2 capitalize">{r.urgency ?? '—'}</td>
                    <td className="p-2">{r.amount_estimate ?? '—'}</td>
                    <td className="p-2">{r.jurisdiction ?? '—'}</td>
                    <td className="p-2">{(r.keywords ?? []).join(', ') || '—'}</td>
                    <td className="p-2 max-w-[28rem]">
                      <div className="line-clamp-3">{r.facts ?? '—'}</div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
