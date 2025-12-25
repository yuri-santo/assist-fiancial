import { NextResponse } from "next/server"

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"

async function fetchHistoricalPrice(symbol: string, date: string): Promise<number | null> {
  try {
    const targetDate = new Date(date)
    const startTime = Math.floor(targetDate.getTime() / 1000) - 86400
    const endTime = Math.floor(targetDate.getTime() / 1000) + 86400

    const url = `${YAHOO_FINANCE_BASE}/${symbol}?period1=${startTime}&period2=${endTime}&interval=1d`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result) return null

    const quote = result.indicators?.quote?.[0]
    const close = quote?.close?.[0]

    return close || result.meta?.regularMarketPrice || null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const date = searchParams.get("date")

  if (!symbol || !date) {
    return NextResponse.json({ error: "Symbol and date are required" }, { status: 400 })
  }

  const price = await fetchHistoricalPrice(symbol.toUpperCase(), date)

  if (price === null) {
    return NextResponse.json({ error: "Price not found" }, { status: 404 })
  }

  return NextResponse.json({ symbol: symbol.toUpperCase(), date, price })
}
