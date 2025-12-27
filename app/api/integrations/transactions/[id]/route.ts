import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 })

  const id = params.id
  const body = await request.json().catch(() => ({}))

  const patch: any = {}
  if (body.direction === "debit" || body.direction === "credit") patch.direction = body.direction
  if (typeof body.description === "string") patch.description = body.description
  if (typeof body.occurred_at === "string") patch.occurred_at = body.occurred_at
  if (typeof body.amount === "number") patch.amount = body.amount

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "Nada para atualizar" }, { status: 400 })
  }

  const { error } = await supabase
    .from("bank_transactions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[integrations] update transaction error", error)
    return NextResponse.json({ ok: false, error: "Erro ao atualizar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
