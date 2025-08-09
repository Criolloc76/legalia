import { supabaseServer } from '@/lib/supabase-server'

export default async function Check() {
  const supabase = supabaseServer()

  // Probar conexión usando la API de admin (no requiere sesión de usuario)
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })

  const ok = !error
  const count = data?.users?.length ?? 0

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Health Check</h1>
        <p>{ok ? 'Supabase OK ✅' : 'Error conectando a Supabase ❌'}</p>
        {!ok && <pre className="text-sm opacity-70">{error?.message}</pre>}
        {ok && <p className="text-sm opacity-70">Usuarios encontrados: {count}</p>}
      </div>
    </main>
  )
}

