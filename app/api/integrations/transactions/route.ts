import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider")
  const pendingOnly = (searchParams.get("pending") || "1") !== "0"

  let q = supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })

  if (provider) q = q.eq("provider", provider)
  if (pendingOnly) q = q.eq("imported", false)

  const { data, error } = await q
  if (error) {
    console.error("[integrations] list transactions error", error)
    return NextResponse.json({ ok: false, error: "Erro ao buscar transações" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, transactions: data || [] })
}
