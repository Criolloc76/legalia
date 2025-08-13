// app/panel/page.tsx
import { supabaseServer } from '@/lib/supabase-server'

type RawRow = {
  id: string
  created_at: string
  lead_id: string
  area: string | null
  subtopic: string | null
  keywords: string[] | null
  jurisdiction: string | null
  amount_estimate: number | null
  urgency: string | null
  facts: string | null
  // relación con leads: viene como un array de objetos con { name }
  leads?: { name: string | null }[] | null
}

type EnrichmentRow = {
  id: string
  created_at: string
  lead_id: string
  lead_name: string | null
  area: string | null
  subtopic: string | null
  keywords: string[] | null
  jurisdiction: string | null
  amount_estimate: number | null
  urgency: string | null
  facts: string | null
}

export default async function PanelPage() {
  const supabase = supabaseServer()

  const { data, error } = await supabase
    .from('enrichments')
    .select(
      `
      id,
      created_at,
      lead_id,
      area,
      subtopic,
      keywords,
      jurisdiction,
      amount_estimate,
      urgency,
      facts,
      leads ( name )
    `
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Panel interno</h1>
        <p className="text-red-600">Error cargando datos: {error.message}</p>
      </main>
    )
  }

  // Tipamos sin usar `any`
  const rows: EnrichmentRow[] = (data ?? []).map((r: RawRow) => ({
    id: r.id,
    created_at: r.created_at,
    lead_id: r.lead_id,
    lead_name:
      Array.isArray(r.leads) && r.leads.length > 0
        ? r.leads[0]?.name ?? null
        : null,
    area: r.area ?? null,
    subtopic: r.subtopic ?? null,
    keywords: r.keywords ?? null,
    jurisdiction: r.jurisdiction ?? null,
    amount_estimate: r.amount_estimate ?? null,
    urgency: r.urgency ?? null,
    facts: r.facts ?? null,
  }))

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Panel interno</h1>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2">Área</th>
              <th className="px-3 py-2">Subtema</th>
              <th className="px-3 py-2">Urgencia</th>
              <th className="px-3 py-2">Jurisdicción</th>
              <th className="px-3 py-2">Cuantía</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-3" colSpan={7}>
                  Sin datos todavía.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {row.lead_name ?? row.lead_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{row.area ?? '—'}</td>
                  <td className="px-3 py-2">{row.subtopic ?? '—'}</td>
                  <td className="px-3 py-2">{row.urgency ?? '—'}</td>
                  <td className="px-3 py-2">{row.jurisdiction ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.amount_estimate ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
