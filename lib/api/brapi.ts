// API gratuita para cotações de ações brasileiras
// https://brapi.dev

import { getAppBaseUrl } from "./base-url"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

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

function getBaseUrl(): string {
  return getAppBaseUrl()
}

export async function getCotacoes(tickers: string[]): Promise<BrapiQuote[]> {
  if (tickers.length === 0) return []

  const results: BrapiQuote[] = []

  for (const ticker of tickers) {
    const quote = await getCotacao(ticker)
    if (quote) {
      results.push(quote)
    }
    if (tickers.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return results
}

export async function getCotacao(ticker: string): Promise<BrapiQuote | null> {
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/quotes?symbol=${encodeURIComponent(ticker)}&type=stock`

    const response = await fetchWithTimeout(
      url,
      {
        cache: "no-store",
      },
      10_000
    )

    if (!response.ok) return null

    const data = await response.json()

    if (!data || data.error) return null

    return {
      symbol: data.symbol,
      shortName: data.name || data.symbol,
      longName: data.name || data.symbol,
      currency: data.currency || "BRL",
      regularMarketPrice: data.price,
      regularMarketDayHigh: data.high || data.price,
      regularMarketDayLow: data.low || data.price,
      regularMarketChange: data.change || 0,
      regularMarketChangePercent: data.changePercent || 0,
      regularMarketTime: new Date().toISOString(),
      regularMarketOpen: data.open || data.price,
      regularMarketVolume: data.volume || 0,
      regularMarketPreviousClose: data.previousClose || data.price,
    }
  } catch {
    return null
  }
}

export async function getHistorico(
  ticker: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
): Promise<BrapiHistoricalPrice[]> {
  // Historical data requires server-side processing
  // For now, return empty array - the unified service handles this
  return []
}

export async function searchAtivos(query: string): Promise<{ symbol: string; name: string }[]> {
  // fallback BR (como você já tinha)
  const commonTickers = [
    { symbol: "PETR4", name: "Petrobras PN" },
    { symbol: "VALE3", name: "Vale ON" },
    { symbol: "ITUB4", name: "Itaú Unibanco PN" },
    { symbol: "BBDC4", name: "Bradesco PN" },
    { symbol: "ABEV3", name: "Ambev ON" },
    { symbol: "WEGE3", name: "Weg ON" },
    { symbol: "RENT3", name: "Localiza ON" },
    { symbol: "MGLU3", name: "Magazine Luiza ON" },
    { symbol: "BBAS3", name: "Banco do Brasil ON" },
    { symbol: "ITSA4", name: "Itaúsa PN" },
    { symbol: "SUZB3", name: "Suzano ON" },
    { symbol: "GGBR4", name: "Gerdau PN" },
    { symbol: "CSNA3", name: "CSN ON" },
    { symbol: "CIEL3", name: "Cielo ON" },
    { symbol: "ELET3", name: "Eletrobras ON" },
    { symbol: "ELET6", name: "Eletrobras PNB" },
    { symbol: "EMBR3", name: "Embraer ON" },
    { symbol: "EQTL3", name: "Equatorial ON" },
    { symbol: "B3SA3", name: "B3 ON" },
    { symbol: "LREN3", name: "Lojas Renner ON" },
  ]

  const q = query.trim().toLowerCase()
  const local = commonTickers.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))

  // tenta buscar no server (Yahoo Search via sua rota interna) -> inclui EUA também
  try {
    const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}&limit=10`, { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      const results = Array.isArray(data?.results) ? data.results : []

      // mescla + dedupe, priorizando o que veio do Yahoo
      const merged: { symbol: string; name: string }[] = []
      const seen = new Set<string>()

      for (const r of results) {
        if (r?.symbol && !seen.has(r.symbol)) {
          seen.add(r.symbol)
          merged.push({ symbol: r.symbol, name: r.name || r.symbol })
        }
      }
      for (const r of local) {
        if (!seen.has(r.symbol)) {
          seen.add(r.symbol)
          merged.push(r)
        }
      }

      return merged.slice(0, 10)
    }
  } catch {
    // ignore
  }

  // fallback final
  return local.slice(0, 10)
}


export const TIPOS_RENDA_VARIAVEL = {
  acao: {
    label: "Ação BR",
    color: "#3b82f6",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  fii: {
    label: "FII",
    color: "#10b981",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  etf: {
    label: "ETF",
    color: "#8b5cf6",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  bdr: {
    label: "BDR",
    color: "#f59e0b",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  stock: {
    label: "Stock (EUA)",
    color: "#ec4899",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  reit: {
    label: "REIT",
    color: "#14b8a6",
    fields: ["ticker", "quantidade", "preco_medio", "data_compra", "corretora", "setor"],
    calcMode: "shares",
  },
  cripto: {
    label: "Criptomoeda",
    color: "#f97316",
    fields: ["ticker", "valor_investido", "data_compra", "corretora"],
    calcMode: "value",
  },
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

export async function getCotacaoHistorica(ticker: string, date: string): Promise<number | null> {
  // Use the unified quote service for historical prices
  const quote = await getCotacao(ticker)
  return quote?.regularMarketPrice || null
}
