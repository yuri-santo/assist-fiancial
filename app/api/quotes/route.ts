import { NextResponse } from "next/server"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

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

const TICKER_ALIASES: Record<string, string> = {
  // US Stocks - Nomes populares
  NIKE: "NKE",
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  GOOGLE: "GOOGL",
  AMAZON: "AMZN",
  TESLA: "TSLA",
  FACEBOOK: "META",
  META: "META",
  NETFLIX: "NFLX",
  NVIDIA: "NVDA",
  DISNEY: "DIS",
  JPMORGAN: "JPM",
  JP: "JPM",
  VISA: "V",
  MASTERCARD: "MA",
  JOHNSON: "JNJ",
  COCACOLA: "KO",
  COCA: "KO",
  PEPSI: "PEP",
  WALMART: "WMT",
  MCDONALDS: "MCD",
  INTEL: "INTC",
  AMD: "AMD",
  PAYPAL: "PYPL",
  UBER: "UBER",
  ORACLE: "ORCL",
  IBM: "IBM",
  ADOBE: "ADBE",
  SALESFORCE: "CRM",
  BOEING: "BA",
  EXXON: "XOM",
  CHEVRON: "CVX",
  PFIZER: "PFE",
  BERKSHIRE: "BRK-B",
  PROCTER: "PG",
  GAMBLE: "PG",
  HOMEDEPOT: "HD",
  STARBUCKS: "SBUX",
  SPOTIFY: "SPOT",
  AIRBNB: "ABNB",
  ZOOM: "ZM",
  SNAP: "SNAP",
  TWITTER: "TWTR",
  X: "TWTR",
  SQUARE: "SQ",
  BLOCK: "SQ",
  SHOPIFY: "SHOP",
  ROBLOX: "RBLX",
  COINBASE: "COIN",
  RIVIAN: "RIVN",
  LUCID: "LCID",
  FORD: "F",
  GM: "GM",
  ATT: "T",
  VERIZON: "VZ",
  COMCAST: "CMCSA",
  // Crypto aliases
  BITCOIN: "BTC",
  ETHEREUM: "ETH",
  BINANCE: "BNB",
  RIPPLE: "XRP",
  CARDANO: "ADA",
  DOGECOIN: "DOGE",
  SOLANA: "SOL",
  POLKADOT: "DOT",
  POLYGON: "MATIC",
  LITECOIN: "LTC",
  SHIBAINUIB: "SHIB",
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
  "BA",
  "CAT",
  "GE",
  "MMM",
  "HON",
  "UPS",
  "FDX",
  "RTX",
  "LMT",
  "GS",
  "MS",
  "C",
  "WFC",
  "AXP",
  "BLK",
  "SCHW",
  "USB",
  "PNC",
  "TFC",
  "BK",
  "T",
  "VZ",
  "CMCSA",
  "TMUS",
  "CHTR",
  "SBUX",
  "YUM",
  "CMG",
  "DPZ",
  "QSR",
  "NEM",
  "FCX",
  "VALE",
  "RIO",
  "BHP",
  "SPOT",
  "ABNB",
  "ZM",
  "SNAP",
  "PINS",
  "TWTR",
  "SQ",
  "RBLX",
  "COIN",
  "RIVN",
  "LCID",
  "F",
  "GM",
  "TM",
  "HMC",
  "BRK-A",
  "BRK-B",
  "BRK.A",
  "BRK.B",
])


async function fetchUSDtoBRL(): Promise<number> {
  // AwesomeAPI (última cotação)
  try {
    const r = await fetchWithTimeout(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
      8000
    )
    if (r.ok) {
      const data = await r.json()
      const bid = Number(data?.USDBRL?.bid)
      if (!Number.isNaN(bid) && bid > 0) return bid
    }
  } catch {
    // ignore
  }

  // exchangerate.host (fallback)
  try {
    const r = await fetchWithTimeout(
      "https://api.exchangerate.host/latest?base=USD&symbols=BRL",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
      8000
    )
    if (r.ok) {
      const data = await r.json()
      const rate = Number(data?.rates?.BRL)
      if (!Number.isNaN(rate) && rate > 0) return rate
    }
  } catch {
    // ignore
  }

  return 5.0
}

function resolveAlias(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[^A-Z0-9-]/g, "")
  return TICKER_ALIASES[upper] || upper
}

async function fetchCrypto(symbol: string, currency: "BRL" | "USD"): Promise<QuoteResult | null> {
  const coinId = CRYPTO_MAP[symbol.toUpperCase()]
  if (!coinId) return null

  try {
    const vsCurrency = currency.toLowerCase()
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`

    const response = await fetchWithTimeout(
      url,
      {
        next: { revalidate: 60 },
      },
      5000
    )

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

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      },
      8000
    )

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

    const response = await fetchWithTimeout(
      url,
      {
        headers,
        next: { revalidate: 60 },
      },
      5000
    )

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

  if (CRYPTO_MAP[upperSymbol]) {
    return "crypto"
  }

  if (US_STOCKS.has(upperSymbol)) {
    return "us_stock"
  }

  if (BR_STOCK_PATTERN.test(upperSymbol)) {
    return "br_stock"
  }

  return "unknown"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let symbol = searchParams.get("symbol")?.toUpperCase() || ""
  const forceType = searchParams.get("type") as "crypto" | "stock" | null
  const currency = (searchParams.get("currency") || "BRL") as "BRL" | "USD"

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const originalSymbol = symbol
  symbol = resolveAlias(symbol)

  let quote: QuoteResult | null = null
  const detectedType = detectAssetType(symbol)

  // If forced to crypto or detected as crypto
  if (forceType === "crypto" || detectedType === "crypto") {
    quote = await fetchCrypto(symbol, currency)
    if (quote) {
      quote.symbol = originalSymbol // Keep original for display
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
    // Unknown - try all sources
    else {
      // Try as US stock first
      quote = await fetchFromYahoo(symbol)
      if (!quote) {
        // Try as BR stock
        quote = await fetchFromYahoo(symbol, ".SA")
      }
      if (!quote) {
        quote = await fetchFromBrapi(symbol)
      }
    }
  }

  if (!quote) {
    return NextResponse.json(
      {
        error: "Quote not found",
        symbol,
        originalSymbol,
        suggestion: symbol !== originalSymbol ? `Tentei buscar como ${symbol}` : null,
      },
      { status: 404 },
    )
  }

  // Convert currency if needed
  if (currency === "BRL" && quote.currency === "USD") {
    try {
      const usdToBrl = await fetchUSDtoBRL()
      quote.price = quote.price * usdToBrl
      quote.change = quote.change * usdToBrl
      quote.currency = "BRL"
    } catch {
      // Keep original currency
    }
  }

  return NextResponse.json(quote)
}
