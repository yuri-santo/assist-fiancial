// API gratuita para cotações de ações brasileiras
// https://brapi.dev - COM API key para melhor performance
// Fallback para dados estáticos quando APIs falham

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "sUCSXQ4LUHgtgLpa5WmZ4H"

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

export async function getCotacoes(tickers: string[]): Promise<BrapiQuote[]> {
  if (tickers.length === 0) return []

  try {
    const tickerList = tickers.join(",")
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const url = `${BRAPI_BASE_URL}/quote/${tickerList}?token=${BRAPI_TOKEN}&fundamental=false`

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] Brapi API error:", response.status)
      return await fallbackToYahoo(tickers)
    }

    const data: BrapiResponse = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[v0] Error fetching quotes from Brapi:", error)
    return await fallbackToYahoo(tickers)
  }
}

async function fallbackToYahoo(tickers: string[]): Promise<BrapiQuote[]> {
  const results: BrapiQuote[] = []

  for (const ticker of tickers.slice(0, 10)) {
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

      if (!response.ok) continue

      const data = await response.json()
      const meta = data.chart?.result?.[0]?.meta

      if (meta && meta.regularMarketPrice) {
        results.push({
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
        })
      }
    } catch (err) {
      console.error(`[v0] Yahoo fallback error for ${ticker}:`, err)
    }
  }

  return results
}

export async function getCotacao(ticker: string): Promise<BrapiQuote | null> {
  const quotes = await getCotacoes([ticker])
  return quotes[0] || null
}

export async function getHistorico(
  ticker: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
): Promise<BrapiHistoricalPrice[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const url = `${BRAPI_BASE_URL}/quote/${ticker}?range=${range}&interval=1d&token=${BRAPI_TOKEN}`

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const data: BrapiHistoricalResponse = await response.json()
    return data.results?.[0]?.historicalDataPrice || []
  } catch (error) {
    console.error("[v0] Error fetching historical data:", error)
    return []
  }
}

export async function searchAtivos(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const url = `${BRAPI_BASE_URL}/available?search=${encodeURIComponent(query)}&token=${BRAPI_TOKEN}`

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const data = await response.json()
    const stocks = data.stocks || []
    return stocks.slice(0, 20).map((s: string) => ({ symbol: s, name: s }))
  } catch (error) {
    console.error("[v0] Error searching stocks:", error)
    return []
  }
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
