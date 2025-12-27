import { NextRequest, NextResponse } from "next/server"
import { getUnifiedQuote } from "@/lib/api/unified-quote-service"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

export const runtime = "nodejs"

type AssetType = "stock" | "crypto"
type Currency = "BRL" | "USD" | "USDT"

// Resolve símbolos "nomeados" (ex: NIKE) para o ticker real (ex: NKE) via Yahoo Search.
// Faz sentido principalmente para mercado US quando o usuário digita o nome da empresa.
async function resolveYahooSymbol(query: string): Promise<string | null> {
  try {
    const q = query.trim()
    if (!q) return null

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=1&newsCount=0`
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 8000)
    if (!res.ok) return null
    const data = await res.json()
    const symbol = data?.quotes?.[0]?.symbol
    return typeof symbol === "string" && symbol.length > 0 ? symbol : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const ticker = (searchParams.get("ticker") || "").trim()
    const assetType = (searchParams.get("assetType") || "stock") as AssetType
    const currency = (searchParams.get("currency") || "BRL") as Currency
    const market = (searchParams.get("market") || "").trim()

    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker" }, { status: 400 })
    }
    if (assetType !== "stock" && assetType !== "crypto") {
      return NextResponse.json({ error: "Invalid assetType" }, { status: 400 })
    }
    if (!["BRL", "USD", "USDT"].includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 })
    }

    // 1) Tenta com o ticker original
    let quote = await getUnifiedQuote(ticker, assetType, currency)

    // 2) Se falhar em stock US, tenta resolver via Yahoo Search (ex: NIKE -> NKE)
    if (!quote && assetType === "stock" && (market === "US" || market === "usa" || market === "NYSE" || market === "NASDAQ")) {
      const resolved = await resolveYahooSymbol(ticker)
      if (resolved && resolved.toUpperCase() !== ticker.toUpperCase()) {
        quote = await getUnifiedQuote(resolved, assetType, currency)
        if (quote) {
          return NextResponse.json({
            quote: { ...quote, resolvedSymbol: resolved },
          })
        }
      }
    }

    if (!quote) {
      return NextResponse.json({ quote: null }, { status: 200 })
    }

    return NextResponse.json({ quote })
  } catch (error) {
    console.error("[api/market/quote] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
