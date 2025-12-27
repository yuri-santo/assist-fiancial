import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Provento } from "@/lib/types"
import { fetchYahooDividends } from "@/lib/api/yahoo-dividends"

type SyncBody = {
  range?: string // e.g. '1y' | '2y'
}

function keyOf(p: { ticker: string; tipo: string; data_pagamento: string; valor: number }) {
  return `${p.ticker}|${p.tipo}|${p.data_pagamento}|${Number(p.valor).toFixed(8)}`
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body: SyncBody = await req.json().catch(() => ({}))
    const range = body.range || "2y"

    // pega tickers atuais
    const { data: rvData, error: rvError } = await supabase
      .from("renda_variavel")
      .select("ticker")
      .eq("user_id", user.id)

    if (rvError) {
      return NextResponse.json({ error: rvError.message }, { status: 400 })
    }

    const tickers = Array.from(new Set((rvData || []).map((r: any) => String(r.ticker || "").trim()).filter(Boolean)))
    if (tickers.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, tickers: 0 })
    }

    // carrega existentes (best-effort). Se a tabela não existir, devolve erro claro.
    const { data: existing, error: existingError } = await supabase
      .from("proventos")
      .select("ticker,tipo,data_pagamento,valor")
      .eq("user_id", user.id)

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    const existingKeys = new Set<string>()
    for (const p of existing || []) {
      existingKeys.add(
        keyOf({
          ticker: String((p as any).ticker || ""),
          tipo: String((p as any).tipo || "dividendo"),
          data_pagamento: String((p as any).data_pagamento || ""),
          valor: Number((p as any).valor || 0),
        }),
      )
    }

    const toInsert: Array<Partial<Provento>> = []
    let skipped = 0

    for (const ticker of tickers) {
      const events = await fetchYahooDividends(ticker, range)
      for (const ev of events) {
        const row = {
          user_id: user.id,
          ticker: ticker.toUpperCase(),
          tipo: "dividendo" as const,
          valor: ev.amount,
          data_pagamento: ev.date,
          data_com: null,
          quantidade_base: null,
          status: new Date(ev.date) < new Date() ? ("pago" as const) : ("confirmado" as const),
          fonte: ev.source,
          raw: ev.raw,
          observacoes: "Importado automaticamente (melhor esforço). Ajuste datas/quantidade se necessário.",
        }
        const k = keyOf({ ticker: row.ticker, tipo: row.tipo, data_pagamento: row.data_pagamento, valor: row.valor })
        if (existingKeys.has(k)) {
          skipped++
          continue
        }
        existingKeys.add(k)
        toInsert.push(row)
      }
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("proventos").insert(toInsert)
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
    }

    return NextResponse.json({ inserted: toInsert.length, skipped, tickers: tickers.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
