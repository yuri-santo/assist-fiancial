import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 })

  const { data, error } = await supabase
    .from("bank_connections")
    .select("id, provider, status, expires_at, scope, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[integrations] list connections error", error)
    return NextResponse.json({ ok: false, error: "Erro ao buscar integrações" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, connections: data || [] })
}
