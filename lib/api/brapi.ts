// API gratuita para cotações de ações brasileiras
// https://brapi.dev - COM API key para melhor performance
// Fallback para Yahoo Finance quando APIs falham

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

export interface BrapiQuote {
  symbol: string
  shortName: string
  longName: string
  currency: string
  regularMarketPrice: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketTime: string
  regularMarketOpen: number
  regularMarketVolume: number
  regularMarketPreviousClose: number
  logourl?: string
}

export interface BrapiResponse {
  results: BrapiQuote[]
  requestedAt: string
  took: string
}

export interface BrapiHistoricalPrice {
  date: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
}

export interface BrapiHistoricalResponse {
  results: {
    symbol: string
    historicalDataPrice: BrapiHistoricalPrice[]
  }[]
}

async function fetchFromYahoo(ticker: string): Promise<BrapiQuote | null> {
  try {
    const cleanTicker = ticker.replace(".SA", "").toUpperCase()
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?interval=1d&range=1d`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      // Try without .SA for US stocks
      const usUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`
      const usResponse = await fetch(usUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      if (!usResponse.ok) return null
      const usData = await usResponse.json()
      const usMeta = usData.chart?.result?.[0]?.meta
      if (!usMeta || !usMeta.regularMarketPrice) return null

      return {
        symbol: cleanTicker,
        shortName: usMeta.shortName || cleanTicker,
        longName: usMeta.longName || cleanTicker,
        currency: usMeta.currency || "USD",
        regularMarketPrice: usMeta.regularMarketPrice,
        regularMarketDayHigh: usMeta.regularMarketDayHigh || 0,
        regularMarketDayLow: usMeta.regularMarketDayLow || 0,
        regularMarketChange: (usMeta.regularMarketPrice || 0) - (usMeta.previousClose || 0),
        regularMarketChangePercent:
          usMeta.previousClose > 0
            ? ((usMeta.regularMarketPrice - usMeta.previousClose) / usMeta.previousClose) * 100
            : 0,
        regularMarketTime: new Date((usMeta.regularMarketTime || Date.now() / 1000) * 1000).toISOString(),
        regularMarketOpen: usMeta.regularMarketOpen || 0,
        regularMarketVolume: usMeta.regularMarketVolume || 0,
        regularMarketPreviousClose: usMeta.previousClose || 0,
      }
    }

    const data = await response.json()
    const meta = data.chart?.result?.[0]?.meta

    if (!meta || !meta.regularMarketPrice) return null

    return {
      symbol: cleanTicker,
      shortName: meta.shortName || cleanTicker,
      longName: meta.longName || cleanTicker,
      currency: meta.currency || "BRL",
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketDayHigh: meta.regularMarketDayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || 0,
      regularMarketChange: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      regularMarketChangePercent:
        meta.previousClose > 0 ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
      regularMarketTime: new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString(),
      regularMarketOpen: meta.regularMarketOpen || 0,
      regularMarketVolume: meta.regularMarketVolume || 0,
      regularMarketPreviousClose: meta.previousClose || 0,
    }
  } catch (err) {
    console.error(`[v0] Yahoo Finance error for ${ticker}:`, err)
    return null
  }
}

export async function getCotacoes(tickers: string[]): Promise<BrapiQuote[]> {
  if (tickers.length === 0) return []

  const results: BrapiQuote[] = []

  // Try Brapi first if token is available
  if (BRAPI_TOKEN) {
    try {
      const tickerList = tickers.join(",")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const url = `${BRAPI_BASE_URL}/quote/${tickerList}?fundamental=false`
      console.log(`[v0] Brapi: Fetching ${tickers.length} tickers...`)

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data: BrapiResponse = await response.json()
        if (data.results && data.results.length > 0) {
          console.log(`[v0] Brapi: Got ${data.results.length} quotes`)
          return data.results
        }
      } else {
        console.error(`[v0] Brapi API error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[v0] Brapi error response:`, errorText)
      }
    } catch (error) {
      console.error("[v0] Brapi fetch error:", error)
    }
  } else {
    console.log("[v0] Brapi: No token configured, using Yahoo Finance")
  }

  // Fallback to Yahoo Finance
  console.log(`[v0] Falling back to Yahoo Finance for ${tickers.length} tickers...`)
  for (const ticker of tickers.slice(0, 10)) {
    const quote = await fetchFromYahoo(ticker)
    if (quote) {
      results.push(quote)
    }
  }

  console.log(`[v0] Yahoo Finance: Got ${results.length} quotes`)
  return results
}

export async function getCotacao(ticker: string): Promise<BrapiQuote | null> {
  // Try Yahoo first (no API key needed)
  const yahooQuote = await fetchFromYahoo(ticker)
  if (yahooQuote) {
    console.log(`[v0] Got quote from Yahoo Finance for ${ticker}`)
    return yahooQuote
  }

  // Try Brapi if token available
  if (BRAPI_TOKEN) {
    try {
      const url = `${BRAPI_BASE_URL}/quote/${ticker}?fundamental=false`
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (response.ok) {
        const data: BrapiResponse = await response.json()
        if (data.results?.[0]) {
          console.log(`[v0] Got quote from Brapi for ${ticker}`)
          return data.results[0]
        }
      } else {
        console.error(`[v0] Brapi error: ${response.status}`)
      }
    } catch (error) {
      console.error(`[v0] Brapi error for ${ticker}:`, error)
    }
  }

  return null
}

export async function getHistorico(
  ticker: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
): Promise<BrapiHistoricalPrice[]> {
  // Try Yahoo Finance first
  try {
    const cleanTicker = ticker.replace(".SA", "").toUpperCase()
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?range=${range}&interval=1d`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (result) {
        const timestamps = result.timestamp || []
        const quote = result.indicators?.quote?.[0] || {}
        const adjClose = result.indicators?.adjclose?.[0]?.adjclose || []

        const prices = timestamps
          .map((ts: number, i: number) => ({
            date: ts,
            open: quote.open?.[i] || 0,
            high: quote.high?.[i] || 0,
            low: quote.low?.[i] || 0,
            close: quote.close?.[i] || 0,
            volume: quote.volume?.[i] || 0,
            adjustedClose: adjClose[i] || quote.close?.[i] || 0,
          }))
          .filter((p: BrapiHistoricalPrice) => p.close > 0)

        if (prices.length > 0) {
          console.log(`[v0] Got ${prices.length} historical prices from Yahoo for ${ticker}`)
          return prices
        }
      }
    }
  } catch (error) {
    console.error(`[v0] Yahoo historical error for ${ticker}:`, error)
  }

  // Fallback to Brapi
  if (BRAPI_TOKEN) {
    try {
      const url = `${BRAPI_BASE_URL}/quote/${ticker}?range=${range}&interval=1d`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (response.ok) {
        const data: BrapiHistoricalResponse = await response.json()
        const prices = data.results?.[0]?.historicalDataPrice || []
        if (prices.length > 0) {
          console.log(`[v0] Got ${prices.length} historical prices from Brapi for ${ticker}`)
        }
        return prices
      }
    } catch (error) {
      console.error("[v0] Brapi historical error:", error)
    }
  }

  return []
}

export async function searchAtivos(query: string): Promise<{ symbol: string; name: string }[]> {
  // Try Brapi search first
  if (BRAPI_TOKEN) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const url = `${BRAPI_BASE_URL}/available?search=${encodeURIComponent(query)}`

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const stocks = data.stocks || []
        if (stocks.length > 0) {
          return stocks.slice(0, 20).map((s: string) => ({ symbol: s, name: s }))
        }
      }
    } catch (error) {
      console.error("[v0] Brapi search error:", error)
    }
  }

  // Return common Brazilian tickers as fallback
  const commonTickers = [
    "PETR4",
    "VALE3",
    "ITUB4",
    "BBDC4",
    "ABEV3",
    "WEGE3",
    "RENT3",
    "MGLU3",
    "BBAS3",
    "ITSA4",
    "SUZB3",
    "GGBR4",
    "CSNA3",
    "CIEL3",
    "COGN3",
    "CVCB3",
    "ELET3",
    "ELET6",
    "EMBR3",
    "EQTL3",
  ]

  const filtered = commonTickers.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
  return filtered.slice(0, 10).map((s) => ({ symbol: s, name: s }))
}

export const TIPOS_RENDA_VARIAVEL = {
  acao: { label: "Ação BR", color: "#3b82f6" },
  fii: { label: "FII", color: "#10b981" },
  etf: { label: "ETF", color: "#8b5cf6" },
  bdr: { label: "BDR", color: "#f59e0b" },
  stock: { label: "Stock (EUA)", color: "#ec4899" },
  reit: { label: "REIT", color: "#14b8a6" },
  cripto: { label: "Criptomoeda", color: "#f97316" },
} as const

export const MOEDAS = {
  BRL: { label: "Real (R$)", symbol: "R$" },
  USD: { label: "Dólar (US$)", symbol: "US$" },
  EUR: { label: "Euro (€)", symbol: "€" },
} as const

export const MERCADOS = {
  b3: { label: "B3 (Brasil)", country: "BR" },
  nyse: { label: "NYSE (EUA)", country: "US" },
  nasdaq: { label: "NASDAQ (EUA)", country: "US" },
  crypto: { label: "Cripto", country: "GLOBAL" },
} as const

export const TIPOS_RENDA_FIXA = {
  cdb: { label: "CDB", color: "#3b82f6" },
  lci: { label: "LCI", color: "#10b981" },
  lca: { label: "LCA", color: "#22c55e" },
  tesouro_selic: { label: "Tesouro Selic", color: "#f59e0b" },
  tesouro_ipca: { label: "Tesouro IPCA+", color: "#ef4444" },
  tesouro_prefixado: { label: "Tesouro Prefixado", color: "#8b5cf6" },
  debenture: { label: "Debênture", color: "#ec4899" },
  cri: { label: "CRI", color: "#06b6d4" },
  cra: { label: "CRA", color: "#14b8a6" },
  poupanca: { label: "Poupança", color: "#6b7280" },
} as const

export const INDEXADORES = {
  cdi: { label: "CDI", symbol: "%" },
  ipca: { label: "IPCA+", symbol: "% a.a." },
  selic: { label: "Selic", symbol: "%" },
  prefixado: { label: "Prefixado", symbol: "% a.a." },
  poupanca: { label: "Poupança", symbol: "" },
} as const

export const SETORES = [
  "Financeiro",
  "Energia Elétrica",
  "Saneamento",
  "Varejo",
  "Tecnologia",
  "Saúde",
  "Construção Civil",
  "Telecomunicações",
  "Petróleo e Gás",
  "Mineração",
  "Alimentos e Bebidas",
  "Papel e Celulose",
  "Siderurgia",
  "Transporte",
  "Imobiliário",
  "Agronegócio",
  "Outros",
] as const
