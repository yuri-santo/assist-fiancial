// API gratuita para cotações de ações brasileiras
// https://brapi.dev - sem necessidade de API key para uso básico
// Fallback para dados estáticos quando APIs falham

const BRAPI_BASE_URL = "https://brapi.dev/api"

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
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(`${BRAPI_BASE_URL}/quote/${tickerList}?fundamental=false`, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] Brapi API error:", response.status)
      return []
    }

    const data: BrapiResponse = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[v0] Error fetching quotes:", error)
    return []
  }
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
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${BRAPI_BASE_URL}/quote/${ticker}?range=${range}&interval=1d&fundamental=false`, {
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

    const response = await fetch(`${BRAPI_BASE_URL}/available?search=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const data = await response.json()
    return data.stocks?.slice(0, 20) || []
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
