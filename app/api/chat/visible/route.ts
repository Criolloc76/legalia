import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/** ===== PROMPT (tu versión reducida actual) ===== */
const SYSTEM_PROMPT = `
Eres Lexi, asistente legal virtual de Legalia en Colombia.

Aviso al usuario:
"Esta es una orientación general y no sustituye la asesoría profesional de un abogado."

Objetivo:
- Orientar de forma clara y útil en cualquier área del derecho colombiano (normas y jurisprudencia vigentes en lenguaje sencillo).
- Incentivar de forma natural agendar cita con un abogado.
- Captar progresivamente datos clave: nombre, ciudad, teléfono, email, resumen del caso, área legal, urgencia, horario, autorización para WhatsApp.
- Atender máximo 2 casos por conversación. Si hay un tercero, sugerir cita con abogado.
- Filtrar temas no legales y responder con cortesía.

Reglas:
1. Usa lenguaje natural y humano, no tipo formulario.
2. Entrega valor sin convertirte en biblioteca jurídica ni dar clases.
3. En el 3º caso, agradecer y proponer cita.
4. Menciona leyes/jurisprudencia solo si aportan claridad breve.

Mantén coherencia con el hilo. Si el usuario hace referencia a algo ya dicho, continúa sin pedir que lo repita salvo que falte información clave.
`

type Body = { conversationId?: string; userText?: string }

function seemsNewCase(input: string) {
  const t = input.toLowerCase()
  const triggers = ['otro tema','además','aparte','también tengo','nuevo caso','otro caso','por otra parte','cambiando de tema']
  return triggers.some(k => t.includes(k))
}

async function getConvMeta(supabase: ReturnType<typeof supabaseServer>, id: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('case_count, case_notes, lead_id, summary, summary_turns')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as {
    case_count: number | null
    case_notes: string[] | null
    lead_id: string
    summary: string | null
    summary_turns: number | null
  }
}

async function bumpCaseCount(supabase: ReturnType<typeof supabaseServer>, id: string) {
  const { data: curr } = await supabase
    .from('conversations')
    .select('case_count')
    .eq('id', id)
    .single()
  const nextCount = (curr?.case_count ?? 0) + 1
  await supabase.from('conversations').update({ case_count: nextCount }).eq('id', id)
}

/** Trunca cada mensaje para controlar tokens */
function clip(s: string | null, max = 1000) {
  const v = s ?? ''
  return v.length > max ? v.slice(0, max) + '…' : v
}

/** Decide si toca refrescar resumen (cada N mensajes nuevos) */
function shouldRefreshSummary(totalMsgs: number, summaryTurns: number | null, step = 8) {
  const done = summaryTurns ?? 0
  return totalMsgs - done >= step
}

/** Genera/actualiza resumen en background (no bloquea respuesta) */
async function refreshSummaryBG(params: {
  supabase: ReturnType<typeof supabaseServer>
  origin: string
  conversationId: string
}) {
  const { supabase, origin, conversationId } = params
  try {
    // Traigo todos los mensajes para resumir barato:
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    const plain = (allMsgs ?? [])
      .map(m => `${m.role}: ${clip(m.content, 400)}`)
      .join('\n')

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: 'Resume en 120-180 palabras el contexto del caso en español. Sé concreto y útil. No inventes.' },
          { role: 'user', content: plain.slice(0, 8000) } // límite defensivo
        ]
      })
    })
    if (!resp.ok) return
    const json = await resp.json() as { choices: { message: { content?: string } }[] }
    const summary = json?.choices?.[0]?.message?.content?.trim() ?? null

    if (summary) {
      await supabase
        .from('conversations')
        .update({
          summary,
          summary_turns: (allMsgs?.length ?? 0)
        })
        .eq('id', conversationId)
    }
  } catch {
    // silencioso
  }
}

export async function POST(req: Request) {
  try {
    const { conversationId, userText } = (await req.json()) as Body
    if (!conversationId || !userText) {
      return NextResponse.json({ error: 'Missing conversationId or userText' }, { status: 400 })
    }

    const supabase = supabaseServer()

    // 1) Guardar mensaje user
    const { error: insUserErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: userText })
    if (insUserErr) return NextResponse.json({ error: insUserErr.message }, { status: 400 })

    // 2) Meta conversación
    const meta = await getConvMeta(supabase, conversationId)
    const isNew = seemsNewCase(userText)

    // Límite 2 casos
    if (isNew && (meta.case_count ?? 0) >= 2) {
      const limitMsg = 'Veo que estás iniciando otro tema. Para revisarlo a fondo y no mezclar casos, puedo agendarte con un abogado de Legalia. ¿Te reservo una cita?'
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: limitMsg })
      return NextResponse.json({ ok: true, assistant: limitMsg })
    }
    if (isNew && (meta.case_count ?? 0) < 2) {
      await bumpCaseCount(supabase, conversationId)
    }

    // 3) Disparar enriquecimiento (no bloqueante)
    ;(async () => {
      try {
        const origin = new URL(req.url).origin
        await fetch(`${origin}/api/internal/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: meta.lead_id, message: userText })
        })
      } catch {}
    })()

    // 4) Historial reciente + resumen
    const { data: recent, error: histErr } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(12) // últimos 12 → balance costo/contexto
    if (histErr) return NextResponse.json({ error: histErr.message }, { status: 400 })

    const recentMsgs = (recent ?? []).map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: clip(m.content, 1100)
    }))

    const contextMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(meta.summary ? [{ role: 'system', content: `Resumen del caso hasta ahora: ${clip(meta.summary, 1600)}` as const }] : []),
      ...recentMsgs
    ]

    // 5) Refrescar resumen si corresponde (background)
    ;(async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { head: true, count: 'exact' })
          .eq('conversation_id', conversationId)
        if (shouldRefreshSummary(count ?? 0, meta.summary_turns, 8)) {
          await refreshSummaryBG({ supabase, origin: new URL(req.url).origin, conversationId })
        }
      } catch {}
    })()

    // 6) OpenAI (ajustado a economía)
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 360,
        messages: contextMessages
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ error: `OpenAI error: ${text}` }, { status: 500 })
    }

    const json = await resp.json() as { choices: { message: { content?: string } }[] }
    const assistant = json.choices?.[0]?.message?.content?.trim() || 'No pude generar respuesta.'

    // 7) Guardar respuesta
    const { error: insAErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: assistant })
    if (insAErr) return NextResponse.json({ error: insAErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, assistant })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
