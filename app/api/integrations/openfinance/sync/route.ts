import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { pluggyGetApiKey, pluggyListAccounts, pluggyListTransactions } from "@/lib/integrations/pluggy"

const QuerySchema = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
})

function normalizeDateOnly(s: string): string {
  if (!s) return s
  // aceita ISO datetime -> pega a parte da data
  return s.split("T")[0]
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const parsedQuery = QuerySchema.safeParse({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    })
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }
    const { from, to } = parsedQuery.data

    const { data: conn, error: connErr } = await supabase
      .from("bank_connections")
      .select("access_token,scope")
      .eq("user_id", user.id)
      .eq("provider", "openfinance")
      .maybeSingle()

    if (connErr) throw connErr
    if (!conn?.access_token) {
      return NextResponse.json({ error: "Open Finance não conectado." }, { status: 400 })
    }

    const itemId = String(conn.access_token)

    const apiKey = await pluggyGetApiKey()
    const accounts = await pluggyListAccounts(apiKey, itemId)

    let insertedOrUpdated = 0
    let scanned = 0
    const errors: string[] = []

    for (const acc of accounts) {
      try {
        const txs = await pluggyListTransactions(apiKey, acc.id, {
          from,
          to,
          pageSize: 500,
        })

        for (const tx of txs) {
          scanned++
          const amount = Number(tx.amount)
          if (!Number.isFinite(amount)) continue
          const direction = amount < 0 ? "debit" : "credit"
          const occurred_at = normalizeDateOnly(tx.date)
          const description = (tx.description || "").toString().slice(0, 240)
          const currency = (tx.currencyCode || "BRL").toString().slice(0, 10)

          const external_id = `pluggy:${tx.id}`

          const { error } = await supabase
            .from("bank_transactions")
            .upsert(
              {
                user_id: user.id,
                provider: "openfinance",
                external_id,
                direction,
                amount: Math.abs(amount),
                currency,
                occurred_at,
                description,
                raw: {
                  ...tx,
                  __accountId: acc.id,
                  __accountName: acc.name,
                  __itemId: itemId,
                },
              } as any,
              { onConflict: "user_id,provider,external_id" }
            )

          if (error) {
            errors.push(error.message)
            continue
          }
          insertedOrUpdated++
        }
      } catch (e: any) {
        errors.push(e?.message || "Falha ao ler transações")
      }
    }

    return NextResponse.json({
      ok: true,
      provider: "openfinance",
      scope: conn.scope,
      accounts: accounts.length,
      scanned,
      upserted: insertedOrUpdated,
      errors,
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Falha ao sincronizar Open Finance.",
      },
      { status: 500 }
    )
  }
}
