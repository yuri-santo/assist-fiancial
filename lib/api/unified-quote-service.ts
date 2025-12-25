// Serviço unificado que usa a API route para buscar cotações
// Funciona tanto no cliente quanto no servidor

import { getCryptoCotacao, getCryptoHistorica, getUSDtoBRL } from "./crypto-service"

const quoteCache = new Map<string, { data: UnifiedQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

export interface UnifiedQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  source: string
  type?: "stock" | "crypto"
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "" // Client-side: use relative URL
  }
  // Server-side
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

export async function getUnifiedQuote(
  ticker: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<UnifiedQuote | null> {
  const cacheKey = `${ticker}-${assetType}-${currency}`
  const cached = quoteCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // For crypto, use the crypto service directly (CoinGecko doesn't have CORS issues)
  if (assetType === "crypto") {
    const cryptoQuote = await getCryptoCotacao(ticker, currency)
    if (cryptoQuote) {
      const result: UnifiedQuote = {
        symbol: cryptoQuote.coin,
        name: cryptoQuote.coinName,
        price: cryptoQuote.regularMarketPrice,
        change: cryptoQuote.regularMarketChange,
        changePercent: cryptoQuote.regularMarketChangePercent,
        currency: cryptoQuote.currency,
        source: "coingecko",
        type: "crypto",
      }
      quoteCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }
    return null
  }

  // For stocks, use the API route
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/quotes?symbol=${encodeURIComponent(ticker)}&type=stock&currency=${currency}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data || data.error) {
      return null
    }

    const result: UnifiedQuote = {
      symbol: data.symbol,
      name: data.name,
      price: data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      currency: data.currency || currency,
      source: data.source || "api",
      type: "stock",
    }

    quoteCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return null
  }
}

const historicalCache = new Map<string, { price: number; timestamp: number }>()
const HISTORICAL_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getHistoricalPrice(
  ticker: string,
  date: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<number | null> {
  const cacheKey = `hist-${ticker}-${date}-${assetType}-${currency}`
  const cached = historicalCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < HISTORICAL_CACHE_TTL) {
    return cached.price
  }

  let result: number | null = null

  if (assetType === "crypto") {
    result = await getCryptoHistorica(ticker, date, currency)
  } else {
    // For stocks, use current price as fallback
    const currentQuote = await getUnifiedQuote(ticker, assetType, currency)
    if (currentQuote) {
      result = currentQuote.price
    }
  }

  if (result) {
    historicalCache.set(cacheKey, { price: result, timestamp: Date.now() })
  }

  return result
}

// Re-export for convenience
export { getUSDtoBRL }
