import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { refreshAccessToken, searchPayments } from "@/lib/integrations/mercadopago"

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const daysParam = Number(searchParams.get("days") || "30")
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30

  const end = new Date()
  const begin = new Date()
  begin.setDate(end.getDate() - days)

  const beginDate = `${toIsoDate(begin)}T00:00:00.000-00:00`
  const endDate = `${toIsoDate(end)}T23:59:59.999-00:00`

  const { data: conn, error: connErr } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "mercadopago")
    .maybeSingle()

  if (connErr) {
    console.error("[MP sync] read connection error", connErr)
    return NextResponse.json({ ok: false, error: "Erro ao ler conexão" }, { status: 500 })
  }

  if (!conn) {
    return NextResponse.json({ ok: false, error: "Conecte o Mercado Pago antes de sincronizar." }, { status: 409 })
  }

  let accessToken = String(conn.access_token)
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : null

  // refresh se expirado (se existir refresh_token) :contentReference[oaicite:1]{index=1}
  if (expiresAt && expiresAt <= Date.now() && conn.refresh_token) {
    try {
      const token = await refreshAccessToken(String(conn.refresh_token))
      accessToken = token.access_token
      const newExpiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null

      const { error: upErr } = await supabase
        .from("bank_connections")
        .update({
          access_token: token.access_token,
          refresh_token: token.refresh_token || conn.refresh_token,
          expires_at: newExpiresAt,
          scope: token.scope || conn.scope,
          updated_at: new Date().toISOString(),
          status: "connected",
        })
        .eq("id", conn.id)

      if (upErr) console.warn("[MP sync] failed updating refreshed token", upErr)
    } catch (e) {
      console.error("[MP sync] refresh token failed", e)
      return NextResponse.json({ ok: false, error: "Token expirou e não foi possível renovar." }, { status: 401 })
    }
  }

  try {
    const { results } = await searchPayments(accessToken, { beginDate, endDate })
    const now = new Date().toISOString()

    const toUpsert = results
      .filter((p) => typeof p.id === "number" && typeof p.transaction_amount === "number")
      .map((p) => {
        const occurred = p.date_approved || p.date_created || now
        const occurredDate = occurred.slice(0, 10)

        // MVP: entra como gasto; você ajusta na mini planilha antes de importar.
        const direction: "debit" | "credit" = "debit"
        const description = p.description || p.statement_descriptor || p.payment_method_id || `Pagamento ${p.id}`

        return {
          user_id: user.id,
          provider: "mercadopago",
          external_id: String(p.id),
          direction,
          amount: Number(p.transaction_amount || 0),
          currency: p.currency_id || "BRL",
          occurred_at: occurredDate,
          description,
          raw: p,
          created_at: now,
        }
      })

    if (!toUpsert.length) {
      return NextResponse.json({ ok: true, synced: 0, message: "Nenhuma transação encontrada no período." })
    }

    const { error: upErr, data: upData } = await supabase
      .from("bank_transactions")
      .upsert(toUpsert, { onConflict: "user_id,provider,external_id" })
      .select("id")

    if (upErr) {
      console.error("[MP sync] upsert bank_transactions error", upErr)
      return NextResponse.json({ ok: false, error: "Falha ao salvar transações" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, synced: upData?.length || 0 })
  } catch (e: any) {
    console.error("[MP sync] sync error", e)
    return NextResponse.json({ ok: false, error: e?.message || "Erro ao sincronizar" }, { status: 500 })
  }
}
