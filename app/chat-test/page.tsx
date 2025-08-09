'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Lead = { id: string; name: string | null }
type Conversation = { id: string }
type Message = { id: string; role: 'user'|'assistant'|'system'; content: string; created_at: string }

export default function ChatTest() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadId, setLeadId] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('Hola, necesito orientación legal básica.')
  const [status, setStatus] = useState<string>('Listo')

  const supabase = supabaseBrowser()

  // 1) Cargar leads del usuario logueado
  useEffect(() => {
    (async () => {
      setStatus('Cargando leads…')
      // Obtiene user para validar sesión
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('Sin sesión. Ve a /auth primero.'); return }
      // Traer leads (RLS mostrará solo los tuyos)
      const { data, error } = await supabase
        .from('leads')
        .select('id,name')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) setStatus(`Error cargando leads: ${error.message}`)
      else {
        setLeads(data ?? [])
        if ((data ?? []).length) setLeadId(data![0].id)
        setStatus('Leads cargados')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Crear conversación para el lead seleccionado
  const onCreateConversation = async () => {
    if (!leadId) { setStatus('Selecciona un lead'); return }
    setStatus('Creando conversación…')
    const { data, error } = await supabase
      .from('conversations')
      .insert({ lead_id: leadId })
      .select('id')
      .single()
    if (error) { setStatus(`Error: ${error.message}`); return }
    setConversationId(data.id)
    setStatus('Conversación creada ✅')
    setMessages([])
  }

  // 3) Insertar mensaje de usuario
  const onSend = async () => {
    if (!conversationId) { setStatus('Crea primero una conversación'); return }
    if (!text.trim()) { setStatus('Escribe un mensaje'); return }
    setStatus('Enviando…')
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: text })
    if (error) { setStatus(`Error: ${error.message}`); return }
    setText('')
    setStatus('Mensaje enviado ✅')
    await loadMessages(conversationId)
  }

  // 4) Listar mensajes de la conversación
  const loadMessages = async (convId: string) => {
    setStatus('Cargando mensajes…')
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (error) { setStatus(`Error: ${error.message}`); return }
    setMessages(data ?? [])
    setStatus('Mensajes cargados')
  }

  return (
    <main className="min-h-screen mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Chat Test (MVP)</h1>

      {/* Selector de lead */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Lead</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={leadId}
          onChange={(e)=>setLeadId(e.target.value)}
        >
          {leads.map(l => (
            <option key={l.id} value={l.id}>
              {l.name ?? '(sin nombre)'} — {l.id.slice(0,8)}
            </option>
          ))}
        </select>
        <button
          onClick={onCreateConversation}
          className="rounded px-4 py-2 bg-black text-white"
        >
          Crear conversación
        </button>
      </div>

      {/* Si hay conversación, mostrar mensajes */}
      {conversationId && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversación: {conversationId.slice(0,8)}</h2>
            <button
              onClick={()=>loadMessages(conversationId)}
              className="text-sm underline"
            >
              Recargar mensajes
            </button>
          </div>

          <div className="border rounded p-3 h-60 overflow-y-auto space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm opacity-60">Sin mensajes aún.</p>
            ) : messages.map(m => (
              <div key={m.id} className="text-sm">
                <span className="font-medium">{m.role}:</span> {m.content}
                <span className="opacity-60"> — {new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder="Escribe tu mensaje…"
              value={text}
              onChange={(e)=>setText(e.target.value)}
            />
            <button onClick={onSend} className="rounded px-4 py-2 bg-black text-white">
              Enviar
            </button>
            <button
              onClick={async () => {
                if (!conversationId || !text.trim()) {
                  setStatus('Crea conversación y escribe texto'); 
                  return
                }
                setStatus('Llamando /api/chat/visible…')
                const res = await fetch('/api/chat/visible', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ conversationId, userText: text })
                })
                const j = await res.json()
                if (!res.ok) { setStatus(`Error API: ${j.error}`); return }
                setText('')
                setStatus('Mock recibido ✅')
                await loadMessages(conversationId)
              }}
              className="rounded px-4 py-2 border"
            >
              Enviar vía API (mock)
            </button>

          </div>
        </section>
      )}

      <p className="text-sm opacity-70">Estado: {status}</p>
    </main>
  )
}
