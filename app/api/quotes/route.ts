import { NextResponse } from "next/server"

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
const BRAPI_BASE_URL = "https://brapi.dev/api"
const COINGECKO_API = "https://api.coingecko.com/api/v3"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

interface QuoteResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  source: string
  type: "stock" | "crypto"
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
  TRX: "tron",
  ATOM: "cosmos",
  XLM: "stellar",
  ETC: "ethereum-classic",
  FIL: "filecoin",
  HBAR: "hedera-hashgraph",
  USDT: "tether",
  USDC: "usd-coin",
}

// Lista de ações brasileiras conhecidas (sufixo numérico)
const BR_STOCK_PATTERN = /^[A-Z]{4}\d{1,2}$/

// Lista de ações americanas conhecidas
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
  "TMO",
  "COST",
  "AVGO",
  "CSCO",
  "ACN",
  "MCD",
  "ABT",
  "DHR",
  "TXN",
  "NEE",
  "PM",
  "UNH",
  "LIN",
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
  "SPY",
  "VOO",
  "QQQ",
  "VTI",
  "IWM",
  "EEM",
  "VWO",
  "GLD",
  "SLV",
  "TLT",
  "O",
  "PLD",
  "AMT",
  "EQIX",
  "PSA",
  "SPG",
  "VNQ",
  "SCHD",
  "VYM",
  "JEPI",
])

async function fetchCrypto(symbol: string, currency: "BRL" | "USD"): Promise<QuoteResult | null> {
  const coinId = CRYPTO_MAP[symbol.toUpperCase()]
  if (!coinId) return null

  try {
    const vsCurrency = currency.toLowerCase()
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`

    const response = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const coinData = data[coinId]

    if (!coinData) return null

    const price = coinData[vsCurrency]
    const change24h = coinData[`${vsCurrency}_24h_change`] || 0

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price,
      change: (price * change24h) / 100,
      changePercent: change24h,
      currency: currency,
      source: "coingecko",
      type: "crypto",
    }
  } catch {
    return null
  }
}

async function fetchFromYahoo(symbol: string, suffix = ""): Promise<QuoteResult | null> {
  try {
    const url = `${YAHOO_FINANCE_BASE}/${symbol}${suffix}?interval=1d&range=1d`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
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
      type: "stock",
    }
  } catch {
    return null
  }
}

async function fetchFromBrapi(symbol: string): Promise<QuoteResult | null> {
  try {
    const url = BRAPI_TOKEN
      ? `${BRAPI_BASE_URL}/quote/${symbol}?fundamental=false`
      : `${BRAPI_BASE_URL}/quote/${symbol}`

    const headers: HeadersInit = { Accept: "application/json" }
    if (BRAPI_TOKEN) {
      headers.Authorization = `Bearer ${BRAPI_TOKEN}`
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const quote = data.results?.[0]

    if (!quote || !quote.regularMarketPrice) return null

    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      currency: quote.currency || "BRL",
      source: "brapi",
      type: "stock",
    }
  } catch {
    return null
  }
}

function detectAssetType(symbol: string): "crypto" | "br_stock" | "us_stock" | "unknown" {
  const upperSymbol = symbol.toUpperCase()

  // Check if it's a known crypto
  if (CRYPTO_MAP[upperSymbol]) {
    return "crypto"
  }

  // Check if it's a known US stock
  if (US_STOCKS.has(upperSymbol)) {
    return "us_stock"
  }

  // Check Brazilian stock pattern (4 letters + 1-2 numbers)
  if (BR_STOCK_PATTERN.test(upperSymbol)) {
    return "br_stock"
  }

  return "unknown"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const forceType = searchParams.get("type") as "crypto" | "stock" | null
  const currency = (searchParams.get("currency") || "BRL") as "BRL" | "USD"

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  let quote: QuoteResult | null = null
  const detectedType = detectAssetType(symbol)

  // If forced to crypto or detected as crypto
  if (forceType === "crypto" || detectedType === "crypto") {
    quote = await fetchCrypto(symbol, currency)
    if (quote) {
      return NextResponse.json(quote)
    }
  }

  // If forced to stock or not crypto
  if (forceType === "stock" || detectedType !== "crypto") {
    // Brazilian stock
    if (detectedType === "br_stock") {
      quote = await fetchFromBrapi(symbol)
      if (!quote) {
        quote = await fetchFromYahoo(symbol, ".SA")
      }
    }
    // US stock
    else if (detectedType === "us_stock") {
      quote = await fetchFromYahoo(symbol)
      if (!quote) {
        quote = await fetchFromBrapi(symbol)
      }
    }
    // Unknown - try all
    else {
      quote = await fetchFromBrapi(symbol)
      if (!quote) {
        quote = await fetchFromYahoo(symbol, ".SA")
      }
      if (!quote) {
        quote = await fetchFromYahoo(symbol)
      }
    }
  }

  if (!quote) {
    return NextResponse.json({ error: "Quote not found", symbol }, { status: 404 })
  }

  // Convert currency if needed
  if (currency === "BRL" && quote.currency === "USD") {
    try {
      const usdResponse = await fetch(`${COINGECKO_API}/simple/price?ids=usd&vs_currencies=brl`, {
        next: { revalidate: 300 },
      })
      if (usdResponse.ok) {
        const usdData = await usdResponse.json()
        const usdToBrl = usdData.usd?.brl || 5.0
        quote.price = quote.price * usdToBrl
        quote.change = quote.change * usdToBrl
        quote.currency = "BRL"
      }
    } catch {
      // Keep original currency
    }
  }

  return NextResponse.json(quote)
}
