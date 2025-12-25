import { NextResponse } from "next/server"

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

interface QuoteResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  source: string
}

async function fetchFromYahooFinance(symbol: string, suffix = ""): Promise<QuoteResult | null> {
  try {
    const url = `${YAHOO_FINANCE_BASE}/${symbol}${suffix}?interval=1d&range=1d`

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

    if (!meta.regularMarketPrice) return null

    const price = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose || meta.previousClose || price
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    return {
      symbol: meta.symbol?.replace(".SA", "") || symbol,
      name: meta.shortName || meta.symbol || symbol,
      price,
      change,
      changePercent,
      currency: meta.currency || "USD",
      source: "yahoo",
    }
  } catch {
    return null
  }
}

async function fetchFromBrapi(symbol: string): Promise<QuoteResult | null> {
  if (!BRAPI_TOKEN) return null

  try {
    const url = `${BRAPI_BASE_URL}/quote/${symbol}?fundamental=false`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${BRAPI_TOKEN}`,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    const quote = data.results?.[0]

    if (!quote) return null

    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      currency: quote.currency || "BRL",
      source: "brapi",
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const type = searchParams.get("type") || "stock" // stock, br_stock, us_stock

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  let quote: QuoteResult | null = null

  if (type === "br_stock" || symbol.match(/^\d+$/)) {
    // Brazilian stock - try with .SA suffix first
    quote = await fetchFromYahooFinance(symbol, ".SA")
    if (!quote) {
      quote = await fetchFromBrapi(symbol)
    }
  } else if (type === "us_stock") {
    // US stock - try without suffix
    quote = await fetchFromYahooFinance(symbol)
  } else {
    // Generic - try Brazilian first, then US
    quote = await fetchFromBrapi(symbol)
    if (!quote) {
      quote = await fetchFromYahooFinance(symbol, ".SA")
    }
    if (!quote) {
      quote = await fetchFromYahooFinance(symbol)
    }
  }

  if (!quote) {
    return NextResponse.json({ error: "Quote not found", symbol }, { status: 404 })
  }

  return NextResponse.json(quote)
}
