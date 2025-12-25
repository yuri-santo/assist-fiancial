import { NextResponse } from "next/server"

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"

interface YahooQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
}

async function fetchFromYahooFinance(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `${YAHOO_FINANCE_BASE}/${symbol}?interval=1d&range=1d`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result) return null

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]

    const price = meta.regularMarketPrice || 0
    const previousClose = meta.chartPreviousClose || meta.previousClose || price
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.symbol,
      price,
      change,
      changePercent,
      currency: meta.currency || "USD",
      high: quote?.high?.[quote.high.length - 1] || price,
      low: quote?.low?.[quote.low.length - 1] || price,
      open: quote?.open?.[0] || price,
      previousClose,
      volume: quote?.volume?.[quote.volume.length - 1] || 0,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const quote = await fetchFromYahooFinance(symbol.toUpperCase())

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  return NextResponse.json(quote)
}
