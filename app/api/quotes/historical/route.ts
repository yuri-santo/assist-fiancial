import { NextResponse } from "next/server"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

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

/**
 * USD->BRL com fallback e (quando possível) com base na DATA do histórico.
 * - 1) exchangerate.host com data (ex: /2024-12-02)
 * - 2) AwesomeAPI (última)
 * - 3) fallback
 */
async function fetchUSDtoBRL(date?: string): Promise<number> {
  // 1) exchangerate.host (tem endpoint por data)
  try {
    const baseUrl = date ? `https://api.exchangerate.host/${date}` : "https://api.exchangerate.host/latest"
    const r = await fetchWithTimeout(
      `${baseUrl}?base=USD&symbols=BRL`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 },
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

  // 2) AwesomeAPI (última cotação)
  try {
    const r = await fetchWithTimeout(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 },
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

  return 5.0
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function clampToUTCStartEnd(dateStr: string): { start: number; end: number } {
  // YYYY-MM-DD -> [00:00:00Z, 23:59:59Z]
  const [y, m, d] = dateStr.split("-").map((v) => Number(v))
  const start = Date.UTC(y, m - 1, d, 0, 0, 0)
  const end = Date.UTC(y, m - 1, d, 23, 59, 59)
  return { start: Math.floor(start / 1000), end: Math.floor(end / 1000) }
}

async function fetchCryptoHistorical(symbol: string, date: string, currency: "BRL" | "USD"): Promise<number | null> {
  const coinId = CRYPTO_MAP[symbol]
  if (!coinId) return null

  // 1) Tenta o range (mais preciso do que /history, porque traz pontos dentro do dia)
  try {
    const { start, end } = clampToUTCStartEnd(date)
    const vs = currency.toLowerCase()
    const url = `${COINGECKO_API}/coins/${coinId}/market_chart/range?vs_currency=${vs}&from=${start}&to=${end}`

    const response = await fetchWithTimeout(
      url,
      {
        next: { revalidate: 60 * 60 },
      },
      10000
    )

    if (response.ok) {
      const data = await response.json()
      const prices: Array<[number, number]> = Array.isArray(data?.prices) ? data.prices : []
      // pega o último ponto do dia (mais próximo do "fechamento" daquele dia, em UTC)
      const last = prices.length ? prices[prices.length - 1]?.[1] : null
      if (typeof last === "number" && !Number.isNaN(last) && last > 0) return last
    }
  } catch {
    // ignore
  }

  // 2) Fallback: /history (dd-mm-yyyy)
  try {
    const [year, month, day] = date.split("-")
    const formattedDate = `${day}-${month}-${year}`

    const url = `${COINGECKO_API}/coins/${coinId}/history?date=${formattedDate}`

    const response = await fetchWithTimeout(
      url,
      {
        next: { revalidate: 60 * 60 },
      },
      10000
    )

    if (!response.ok) return null

    const data = await response.json()
    const price = currency === "BRL" ? data.market_data?.current_price?.brl : data.market_data?.current_price?.usd

    return typeof price === "number" && !Number.isNaN(price) ? price : null
  } catch {
    return null
  }
}

/**
 * Histórico de ações via Yahoo:
 * - Usa period1/period2 ao redor da data (mais preciso do que escolher range enorme)
 * - Seleciona o CLOSE do dia alvo; se não existir (feriado/fim de semana), pega o último CLOSE ANTES da data.
 */
async function fetchStockHistorical(symbol: string, date: string, suffix = ""): Promise<number | null> {
  try {
    const targetDate = new Date(`${date}T00:00:00Z`)
    const { start, end } = clampToUTCStartEnd(date)

    // janela de busca: 7 dias antes até 3 dias depois (cobre feriado e falta de pregão)
    const period1 = start - 7 * 24 * 60 * 60
    const period2 = end + 3 * 24 * 60 * 60

    // interval 1d + period1/period2 tende a ser mais preciso e rápido
    const url = `${YAHOO_FINANCE_BASE}/${symbol}${suffix}?interval=1d&period1=${period1}&period2=${period2}`

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 60 * 60 },
      },
      10000
    )

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]

    const timestamps: number[] = result?.timestamp || []
    const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close || []

    if (!timestamps.length || !closes.length) return null

    const targetTs = toUnixSeconds(targetDate)

    // Primeiro: tenta achar o próprio dia (timestamp dentro do mesmo dia UTC)
    // Yahoo retorna timestamps em UTC (segundos). Vamos comparar por "dia" UTC.
    const targetDay = new Date(targetDate).toISOString().slice(0, 10)

    let exact: number | null = null
    for (let i = 0; i < timestamps.length; i++) {
      const day = new Date(timestamps[i] * 1000).toISOString().slice(0, 10)
      if (day === targetDay) {
        const p = closes[i]
        if (typeof p === "number" && !Number.isNaN(p)) {
          exact = p
          break
        }
      }
    }
    if (exact !== null) return exact

    // Se não existe dia exato (fim de semana/feriado), pega o último close <= targetTs
    let best: number | null = null
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (timestamps[i] <= targetTs) {
        const p = closes[i]
        if (typeof p === "number" && !Number.isNaN(p)) {
          best = p
          break
        }
      }
    }
    if (best !== null) return best

    // Último fallback: pega o primeiro close após a data (quando não há nada antes na janela)
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] > targetTs) {
        const p = closes[i]
        if (typeof p === "number" && !Number.isNaN(p)) return p
      }
    }

    return null
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
    if (price !== null) {
      return NextResponse.json({ symbol, date, price, currency, source: "coingecko" })
    }
  }

  // Stocks
  if (forceType === "stock" || detectedType !== "crypto") {
    // Para conversão correta, a gente precisa saber de qual mercado veio a cotação.
    let market: "US" | "BR" | "UNKNOWN" = "UNKNOWN"

    if (detectedType === "br_stock") {
      price = await fetchStockHistorical(symbol, date, ".SA")
      if (price !== null) market = "BR"
    } else if (detectedType === "us_stock") {
      price = await fetchStockHistorical(symbol, date)
      if (price !== null) market = "US"
    } else {
      // Try US first, then BR
      price = await fetchStockHistorical(symbol, date)
      if (price !== null) {
        market = "US"
      } else {
        price = await fetchStockHistorical(symbol, date, ".SA")
        if (price !== null) market = "BR"
      }
    }

    if (price !== null) {
      // Convert moeda:
      // - US (Yahoo) vem em USD
      // - BR (.SA) vem em BRL
      if (currency === "BRL" && market === "US") {
        const usdToBrl = await fetchUSDtoBRL(date)
        price = price * usdToBrl
      } else if (currency === "USD" && market === "BR") {
        const usdToBrl = await fetchUSDtoBRL(date)
        price = price / usdToBrl
      }

      return NextResponse.json({ symbol, date, price, currency, source: "yahoo", market })
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
