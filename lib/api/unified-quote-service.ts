// Serviço unificado que usa a API route para buscar cotações
// Funciona tanto no cliente quanto no servidor

import { getCryptoCotacao, getCryptoHistorica, getUSDtoBRL } from "./crypto-service"
import { getAppBaseUrl } from "./base-url"
import { fetchWithTimeout } from "@/lib/utils/fetch-timeout"

const quoteCache = new Map<string, { data: UnifiedQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

const historicalCache = new Map<string, { price: number; timestamp: number }>()
const HISTORICAL_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (historical prices don't change)

const errorCache = new Map<string, number>()
const ERROR_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
  return getAppBaseUrl()
}

export async function getUnifiedQuote(
  ticker: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<UnifiedQuote | null> {
  const cacheKey = `${ticker}-${assetType}-${currency}`

  const errorTime = errorCache.get(cacheKey)
  if (errorTime && Date.now() - errorTime < ERROR_CACHE_TTL) {
    return null // Skip if recently failed
  }

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
    errorCache.set(cacheKey, Date.now())
    return null
  }

  // For stocks, use the API route
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/quotes?symbol=${encodeURIComponent(ticker)}&type=stock&currency=${currency}`

    const response = await fetchWithTimeout(
      url,
      {
        cache: "no-store",
      },
      10_000
    )

    if (!response.ok) {
      errorCache.set(cacheKey, Date.now())
      return null
    }

    const data = await response.json()

    if (!data || data.error) {
      errorCache.set(cacheKey, Date.now())
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
    errorCache.set(cacheKey, Date.now())
    return null
  }
}

export async function getHistoricalPrice(
  ticker: string,
  date: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<number | null> {
  const cacheKey = `hist-${ticker}-${date}-${assetType}-${currency}`

  // Check cache
  const cached = historicalCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < HISTORICAL_CACHE_TTL) {
    return cached.price
  }

  // Check error cache
  const errorTime = errorCache.get(cacheKey)
  if (errorTime && Date.now() - errorTime < ERROR_CACHE_TTL) {
    return null
  }

  let result: number | null = null

  if (assetType === "crypto") {
    result = await getCryptoHistorica(ticker, date, currency)
  } else {
    // Use the new historical API route for stocks
    try {
      const baseUrl = getBaseUrl()
      const url = `${baseUrl}/api/quotes/historical?symbol=${encodeURIComponent(ticker)}&date=${date}&type=stock&currency=${currency}`

      const response = await fetchWithTimeout(
        url,
        {
          cache: "no-store",
        },
        15_000
      )

      if (response.ok) {
        const data = await response.json()
        if (data && data.price) {
          result = data.price
        }
      }
    } catch {
      // Fallback to current price
    }

    // If historical fails, fallback to current price
    if (!result) {
      const currentQuote = await getUnifiedQuote(ticker, assetType, currency)
      if (currentQuote) {
        result = currentQuote.price
      }
    }
  }

  if (result) {
    historicalCache.set(cacheKey, { price: result, timestamp: Date.now() })
  } else {
    errorCache.set(cacheKey, Date.now())
  }

  return result
}

// Re-export for convenience
export { getUSDtoBRL }
