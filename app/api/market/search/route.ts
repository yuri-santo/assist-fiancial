import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function normalizeSymbol(sym: string): string {
  // Yahoo BR vem como PETR4.SA -> PETR4
  if (sym.toUpperCase().endsWith(".SA")) return sym.slice(0, -3).toUpperCase()
  return sym.toUpperCase()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim()
  const limit = Math.min(Number(searchParams.get("limit") || 10), 20)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] }, { status: 200 })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0`
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 200 })
    }

    const data = await res.json()
    const quotes = Array.isArray(data?.quotes) ? data.quotes : []

    const results = quotes
      .map((it: any) => {
        const rawSymbol = String(it?.symbol || "").trim()
        if (!rawSymbol) return null

        // evita opções/contratos e coisas estranhas com muitos pontos
        // mantém BRK-B e similares (tem "-"), mas evita coisas com vários "."
        if (rawSymbol.includes(".") && !rawSymbol.toUpperCase().endsWith(".SA")) return null

        const symbol = normalizeSymbol(rawSymbol)
        const name = String(it?.shortname || it?.longname || it?.name || symbol).trim()

        // aceita ações/ETFs/fundos
        const qt = String(it?.quoteType || "").toUpperCase()
        const allowed = qt === "EQUITY" || qt === "ETF" || qt === "MUTUALFUND"
        if (!allowed) return null

        return { symbol, name }
      })
      .filter(Boolean)

    // dedupe
    const seen = new Set<string>()
    const deduped = []
    for (const r of results) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol)
        deduped.push(r)
      }
      if (deduped.length >= limit) break
    }

    return NextResponse.json({ results: deduped }, { status: 200 })
  } catch (e) {
    console.error("[api/market/search] error:", e)
    return NextResponse.json({ results: [] }, { status: 200 })
  }
}
