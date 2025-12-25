import { NextResponse } from "next/server"

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
const COINGECKO_API = "https://api.coingecko.com/api/v3"

// Mapeamento de aliases para tickers corretos
const TICKER_ALIASES: Record<string, string> = {
  NIKE: "NKE",
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  GOOGLE: "GOOGL",
  AMAZON: "AMZN",
  TESLA: "TSLA",
  FACEBOOK: "META",
  NETFLIX: "NFLX",
  NVIDIA: "NVDA",
  DISNEY: "DIS",
  JPMORGAN: "JPM",
  JP: "JPM",
  VISA: "V",
  MASTERCARD: "MA",
  INTEL: "INTC",
  BITCOIN: "BTC",
  ETHEREUM: "ETH",
}

// Mapeamento de criptomoedas para CoinGecko
const CRYPTO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  SOL: "solana",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  UNI: "uniswap",
  LINK: "chainlink",
}

const BR_STOCK_PATTERN = /^[A-Z]{4}\d{1,2}$/

const US_STOCKS = new Set([
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "NFLX",
  "NKE",
  "DIS",
  "JPM",
  "V",
  "MA",
  "JNJ",
  "PG",
  "KO",
  "PEP",
  "WMT",
  "HD",
  "BAC",
  "XOM",
  "CVX",
  "ABBV",
  "PFE",
  "MRK",
  "COST",
  "AVGO",
  "CSCO",
  "MCD",
  "ABT",
  "ORCL",
  "AMD",
  "INTC",
  "QCOM",
  "IBM",
  "CRM",
  "ADBE",
  "PYPL",
  "SQ",
  "SHOP",
  "UBER",
  "BA",
  "GE",
])

function resolveAlias(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[^A-Z0-9-]/g, "")
  return TICKER_ALIASES[upper] || upper
}

function detectAssetType(symbol: string): "crypto" | "br_stock" | "us_stock" | "unknown" {
  if (CRYPTO_MAP[symbol]) return "crypto"
  if (US_STOCKS.has(symbol)) return "us_stock"
  if (BR_STOCK_PATTERN.test(symbol)) return "br_stock"
  return "unknown"
}

async function fetchCryptoHistorical(symbol: string, date: string, currency: "BRL" | "USD"): Promise<number | null> {
  const coinId = CRYPTO_MAP[symbol]
  if (!coinId) return null

  try {
    // CoinGecko requires date in dd-mm-yyyy format
    const [year, month, day] = date.split("-")
    const formattedDate = `${day}-${month}-${year}`

    const url = `${COINGECKO_API}/coins/${coinId}/history?date=${formattedDate}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const price = currency === "BRL" ? data.market_data?.current_price?.brl : data.market_data?.current_price?.usd

    return price || null
  } catch {
    return null
  }
}

async function fetchStockHistorical(symbol: string, date: string, suffix = ""): Promise<number | null> {
  try {
    const targetDate = new Date(date)
    const now = new Date()

    // Calculate days between dates
    const diffTime = Math.abs(now.getTime() - targetDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Yahoo Finance range options
    let range = "1mo"
    if (diffDays > 30) range = "3mo"
    if (diffDays > 90) range = "6mo"
    if (diffDays > 180) range = "1y"
    if (diffDays > 365) range = "2y"
    if (diffDays > 730) range = "5y"
    if (diffDays > 1825) range = "max"

    const url = `${YAHOO_FINANCE_BASE}/${symbol}${suffix}?interval=1d&range=${range}`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      return null
    }

    const timestamps = result.timestamp
    const closes = result.indicators.quote[0].close

    // Find the closest date
    const targetTimestamp = targetDate.getTime() / 1000

    let closestIndex = 0
    let closestDiff = Math.abs(timestamps[0] - targetTimestamp)

    for (let i = 1; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetTimestamp)
      if (diff < closestDiff) {
        closestDiff = diff
        closestIndex = i
      }
    }

    const price = closes[closestIndex]
    return price && !isNaN(price) ? price : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let symbol = searchParams.get("symbol")?.toUpperCase() || ""
  const date = searchParams.get("date") || ""
  const forceType = searchParams.get("type") as "crypto" | "stock" | null
  const currency = (searchParams.get("currency") || "BRL") as "BRL" | "USD"

  if (!symbol || !date) {
    return NextResponse.json({ error: "Symbol and date are required" }, { status: 400 })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must be in YYYY-MM-DD format" }, { status: 400 })
  }

  // Resolve alias
  symbol = resolveAlias(symbol)
  const detectedType = detectAssetType(symbol)

  let price: number | null = null

  // Crypto
  if (forceType === "crypto" || detectedType === "crypto") {
    price = await fetchCryptoHistorical(symbol, date, currency)
    if (price) {
      return NextResponse.json({ symbol, date, price, currency, source: "coingecko" })
    }
  }

  // Stocks
  if (forceType === "stock" || detectedType !== "crypto") {
    if (detectedType === "br_stock") {
      price = await fetchStockHistorical(symbol, date, ".SA")
    } else if (detectedType === "us_stock") {
      price = await fetchStockHistorical(symbol, date)
    } else {
      // Try US first, then BR
      price = await fetchStockHistorical(symbol, date)
      if (!price) {
        price = await fetchStockHistorical(symbol, date, ".SA")
      }
    }

    if (price) {
      // Convert to BRL if needed
      if (currency === "BRL" && detectedType === "us_stock") {
        try {
          const usdResponse = await fetch(`${COINGECKO_API}/simple/price?ids=usd&vs_currencies=brl`)
          if (usdResponse.ok) {
            const usdData = await usdResponse.json()
            const usdToBrl = usdData.usd?.brl || 5.0
            price = price * usdToBrl
          }
        } catch {
          // Keep USD price
        }
      }
      return NextResponse.json({ symbol, date, price, currency, source: "yahoo" })
    }
  }

  return NextResponse.json(
    {
      error: "Historical price not found",
      symbol,
      date,
    },
    { status: 404 },
  )
}
