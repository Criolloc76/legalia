import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { cookies, headers } from "next/headers";

export async function GET() {
  try {
    const ck = cookies();      // NO usar await
    const hdrs = headers();

    const supabase = supabaseServer();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    return NextResponse.json({
      ok: true,
      auth: {
        hasUser: !!user,
        userId: user?.id ?? null,
        email: user?.email ?? null,
        userError: userErr?.message ?? null,
      },
      debug: {
        cookieKeys: ck.getAll().map(c => c.name),
        host: hdrs.get("host"),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelRegion: process.env.VERCEL_REGION ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
