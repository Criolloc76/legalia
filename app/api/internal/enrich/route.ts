import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * ENRICH_PROMPT — barato y estricto en JSON.
 * Extrae campos clave del caso para que el abogado tenga contexto rápido.
 */
const ENRICH_PROMPT = `
Extrae en JSON conciso (y SOLO JSON) la información del caso legal en Colombia:
{
  "area": string,                     // p.ej. "laboral", "familia", "civil", "penal", "administrativo", "comercial", "inmobiliario", "tributario"
  "subtopic": string,                 // p.ej. "despido sin justa causa"
  "keywords": string[],               // 3 a 8 términos
  "jurisdiction": string,             // p.ej. "ordinaria laboral", "familia", "penal", "contencioso administrativo"
  "amount_estimate": number|null,     // en COP si se infiere, si no null
  "urgency": "alta"|"media"|"baja"|null,
  "facts": string                     // 1-2 frases con hechos relevantes
}
Si no puedes inferir un campo, usa null o "".
Devuelve SOLO el objeto JSON, sin texto extra.
`

type Body = {
  leadId?: string
  message?: string
  fromMessageId?: string
}

/** Recorta seguro para evitar picos de tokens */
function clip(s: string | undefined | null, max = 1500) {
  const v = s ?? ''
  return v.length > max ? v.slice(0, max) + '…' : v
}

export async function POST(req: Request) {
  try {
    const { leadId, message, fromMessageId } = (await req.json()) as Body
    if (!leadId || !message) {
      return NextResponse.json({ error: 'Missing leadId or message' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })
    }

    // Llamada económica a OpenAI (json estricto)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          { role: 'system', content: ENRICH_PROMPT },
          { role: 'user', content: clip(message, 1500) },
        ],
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ error: `OpenAI error: ${text}` }, { status: 500 })
    }

    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] }
    const content = json?.choices?.[0]?.message?.content ?? '{}'

    let data: {
      area?: string | null
      subtopic?: string | null
      keywords?: string[] | null
      jurisdiction?: string | null
      amount_estimate?: number | null
      urgency?: 'alta' | 'media' | 'baja' | null
      facts?: string | null
    } = {}
    try { data = JSON.parse(content) } catch { data = {} }

    const supabase = supabaseServer()
    const { error: insErr } = await supabase
      .from('enrichments')
      .insert({
        lead_id: leadId,
        from_message_id: fromMessageId ?? null,
        area: data.area ?? null,
        subtopic: data.subtopic ?? null,
        keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 10) : null,
        jurisdiction: data.jurisdiction ?? null,
        amount_estimate:
          typeof data.amount_estimate === 'number' ? data.amount_estimate : null,
        urgency: data.urgency ?? null,
        facts: data.facts ?? null,
      })

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, enrichment: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
