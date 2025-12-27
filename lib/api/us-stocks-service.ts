// Serviço para buscar ações americanas via API route

import { getAppBaseUrl } from "./base-url"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

export interface USStockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  currency: string
  source: string
}

function getBaseUrl(): string {
  return getAppBaseUrl()
}

const stockCache = new Map<string, { data: USStockQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000

export async function getUSStockQuote(symbol: string): Promise<USStockQuote | null> {
  const cached = stockCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/quotes?symbol=${encodeURIComponent(symbol)}&type=stock`

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

    const result: USStockQuote = {
      symbol: data.symbol,
      name: data.name || data.symbol,
      price: data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      high: data.high || data.price,
      low: data.low || data.price,
      open: data.open || data.price,
      previousClose: data.previousClose || data.price,
      volume: data.volume || 0,
      currency: data.currency || "USD",
      source: data.source || "api",
    }

    stockCache.set(symbol, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return null
  }
}

export async function getUSStockHistoricalPrice(symbol: string, date: string): Promise<number | null> {
  const quote = await getUSStockQuote(symbol)
  return quote?.price || null
}

export async function searchUSStocks(query: string): Promise<{ symbol: string; name: string; type: string }[]> {
  const popularAssets = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETF" },
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF" },
    { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF" },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "ETF" },
    { symbol: "IWM", name: "iShares Russell 2000 ETF", type: "ETF" },
    { symbol: "AAPL", name: "Apple Inc.", type: "Stock" },
    { symbol: "MSFT", name: "Microsoft Corporation", type: "Stock" },
    { symbol: "GOOGL", name: "Alphabet Inc.", type: "Stock" },
    { symbol: "AMZN", name: "Amazon.com Inc.", type: "Stock" },
    { symbol: "TSLA", name: "Tesla Inc.", type: "Stock" },
    { symbol: "NVDA", name: "NVIDIA Corporation", type: "Stock" },
    { symbol: "META", name: "Meta Platforms Inc.", type: "Stock" },
    { symbol: "NFLX", name: "Netflix Inc.", type: "Stock" },
    { symbol: "NKE", name: "Nike Inc.", type: "Stock" },
    { symbol: "DIS", name: "Walt Disney Company", type: "Stock" },
    { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "Stock" },
    { symbol: "V", name: "Visa Inc.", type: "Stock" },
    { symbol: "MA", name: "Mastercard Inc.", type: "Stock" },
    { symbol: "JNJ", name: "Johnson & Johnson", type: "Stock" },
    { symbol: "PG", name: "Procter & Gamble", type: "Stock" },
    { symbol: "KO", name: "Coca-Cola Company", type: "Stock" },
    { symbol: "WMT", name: "Walmart Inc.", type: "Stock" },
    { symbol: "O", name: "Realty Income Corporation", type: "REIT" },
    { symbol: "PLD", name: "Prologis Inc.", type: "REIT" },
    { symbol: "AMT", name: "American Tower Corporation", type: "REIT" },
  ]

  const filtered = popularAssets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
      asset.name.toLowerCase().includes(query.toLowerCase()),
  )

  return filtered.slice(0, 20)
}
