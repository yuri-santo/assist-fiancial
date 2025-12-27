import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
  const importAllPending: boolean = Boolean(body?.importAllPending)

  if (!ids.length && !importAllPending) {
    return NextResponse.json({ ok: false, error: "Informe ids ou use importAllPending" }, { status: 400 })
  }

  let q = supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("imported", false)
    .order("occurred_at", { ascending: true })

  if (!importAllPending) q = q.in("id", ids)

  const { data: txs, error: txErr } = await q
  if (txErr) {
    console.error("[integrations] read tx to import error", txErr)
    return NextResponse.json({ ok: false, error: "Erro ao carregar transações" }, { status: 500 })
  }

  if (!txs?.length) {
    return NextResponse.json({ ok: true, imported: 0, message: "Nada para importar" })
  }

  const now = new Date().toISOString()
  const despesas: any[] = []
  const receitas: any[] = []

  for (const tx of txs) {
    const descricao = tx.description || `Transação ${tx.provider} ${tx.external_id}`
    const data = String(tx.occurred_at)
    const valor = Number(tx.amount || 0)

    if (tx.direction === "credit") {
      receitas.push({
        user_id: user.id,
        valor,
        fonte: `Banco (${tx.provider})`,
        data,
        descricao,
        recorrente: false,
        created_at: now,
      })
    } else {
      const hash_importacao = sha256(`${user.id}|${tx.provider}|${tx.external_id}`)
      despesas.push({
        user_id: user.id,
        valor,
        categoria_id: null,
        subcategoria: null,
        data,
        descricao,
        forma_pagamento: "debito",
        cartao_id: null,
        recorrente: false,
        parcelado: false,
        total_parcelas: 1,
        parcela_atual: 1,
        observacoes: null,
        origem: "banco",
        hash_importacao,
        created_at: now,
        updated_at: now,
      })
    }
  }

  // Inserções
  if (despesas.length) {
    const { error } = await supabase.from("despesas").insert(despesas)
    if (error) {
      console.error("[integrations] insert despesas error", error)
      return NextResponse.json({ ok: false, error: "Falha ao inserir despesas" }, { status: 500 })
    }
  }

  if (receitas.length) {
    const { error } = await supabase.from("receitas").insert(receitas)
    if (error) {
      console.error("[integrations] insert receitas error", error)
      return NextResponse.json({ ok: false, error: "Falha ao inserir receitas" }, { status: 500 })
    }
  }

  const importedIds = txs.map((t) => t.id)
  const { error: upErr } = await supabase
    .from("bank_transactions")
    .update({ imported: true, imported_at: now })
    .in("id", importedIds)
    .eq("user_id", user.id)

  if (upErr) {
    console.warn("[integrations] mark imported error", upErr)
  }

  return NextResponse.json({
    ok: true,
    imported: txs.length,
    insertedDespesas: despesas.length,
    insertedReceitas: receitas.length,
  })
}
