import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { conversationId, userText } = await req.json() as { conversationId: string; userText: string }

    if (!conversationId || !userText) {
      return NextResponse.json({ error: 'Missing conversationId or userText' }, { status: 400 })
    }

    const supabase = supabaseServer()

    // Guardar mensaje de usuario
    const { error: userErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: userText })
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })

    // Insertar respuesta mock
    const assistant = 'Entendido. (mock) Pronto conectamos la IA visible.'
    const { error: aiErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: assistant })
    if (aiErr) return NextResponse.json({ error: aiErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, assistant })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
