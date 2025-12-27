import { NextRequest, NextResponse } from "next/server"
import { getHistoricalPrice } from "@/lib/api/unified-quote-service"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

export const runtime = "nodejs"

type AssetType = "stock" | "crypto"
type Currency = "BRL" | "USD" | "USDT"

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
    const date = (searchParams.get("date") || "").trim()
    const market = (searchParams.get("market") || "").trim()

    if (!ticker || !date) {
      return NextResponse.json({ error: "Missing ticker/date" }, { status: 400 })
    }
    if (assetType !== "stock" && assetType !== "crypto") {
      return NextResponse.json({ error: "Invalid assetType" }, { status: 400 })
    }
    if (!["BRL", "USD", "USDT"].includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 })
    }

    // 1) Tenta com ticker original
    let price = await getHistoricalPrice(ticker, date, assetType, currency)

    // 2) Se falhar em stock US, tenta resolver símbolo via Yahoo Search
    if ((price == null) && assetType === "stock" && (market === "US" || market === "usa" || market === "NYSE" || market === "NASDAQ")) {
      const resolved = await resolveYahooSymbol(ticker)
      if (resolved && resolved.toUpperCase() !== ticker.toUpperCase()) {
        price = await getHistoricalPrice(resolved, date, assetType, currency)
      }
    }

    return NextResponse.json({ price })
  } catch (error) {
    console.error("[api/market/historical] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
