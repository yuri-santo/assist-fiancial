// API de Criptomoedas - Brapi v2
// https://brapi.dev/docs#tag/Criptomoedas/operation/get-v2-crypto

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

export interface CryptoQuote {
  coin: string
  currency: string
  currencyRateFromUSD: number
  coinName: string
  regularMarketPrice: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketDayRange: string
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketTime: string
  circulatingSupply: number
  marketCap: number
}

export interface CryptoResponse {
  coins: CryptoQuote[]
  availableCoins: string[]
  requestedAt: string
  took: string
}

export async function getCryptoCotacao(coin: string, currency: "BRL" | "USD" = "BRL"): Promise<CryptoQuote | null> {
  try {
    const url = `${BRAPI_BASE_URL}/v2/crypto?coin=${coin}&currency=${currency}`
    console.log(`[v0] Fetching crypto: ${coin} in ${currency}`)

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${BRAPI_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`[v0] Brapi Crypto API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: CryptoResponse = await response.json()

    if (!data.coins || data.coins.length === 0) {
      console.error(`[v0] No crypto data found for ${coin}`)
      return null
    }

    console.log(`[v0] Got crypto quote for ${coin}: ${data.coins[0].regularMarketPrice}`)
    return data.coins[0]
  } catch (error) {
    console.error(`[v0] Crypto API error for ${coin}:`, error)
    return null
  }
}

export async function getAvailableCryptos(): Promise<string[]> {
  try {
    const url = `${BRAPI_BASE_URL}/v2/crypto/available`

    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 86400 }, // Cache por 24 horas
      headers: {
        Authorization: `Bearer ${BRAPI_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.coins || []
  } catch (error) {
    console.error("[v0] Error fetching available cryptos:", error)
    return []
  }
}

export async function searchCryptos(query: string): Promise<{ symbol: string; name: string }[]> {
  const available = await getAvailableCryptos()
  const filtered = available.filter((c) => c.toLowerCase().includes(query.toLowerCase()))

  return filtered.slice(0, 20).map((c) => ({
    symbol: c,
    name: c.toUpperCase(),
  }))
}

export async function getCryptoHistorica(
  coin: string,
  date: string,
  currency: "BRL" | "USD" = "BRL",
): Promise<number | null> {
  try {
    console.log(`[v0] Fetching historical crypto price for ${coin} on ${date} in ${currency}`)

    // For crypto, if date is recent (within 7 days), use current price
    const targetDate = new Date(date)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 7) {
      const currentQuote = await getCryptoCotacao(coin, currency)
      if (currentQuote) {
        console.log(`[v0] Using current price for recent date: ${currentQuote.regularMarketPrice}`)
        return currentQuote.regularMarketPrice
      }
    }

    // For older dates, return null (Brapi doesn't provide historical crypto data in free tier)
    console.log(`[v0] Historical crypto data not available for date ${date}`)
    return null
  } catch (error) {
    console.error(`[v0] Error fetching historical crypto price:`, error)
    return null
  }
}

// Criptomoedas mais populares para fallback
export const POPULAR_CRYPTOS = [
  "BTC",
  "ETH",
  "BNB",
  "XRP",
  "ADA",
  "DOGE",
  "SOL",
  "TRX",
  "DOT",
  "MATIC",
  "LTC",
  "SHIB",
  "AVAX",
  "UNI",
  "LINK",
  "ATOM",
  "XLM",
  "ETC",
  "FIL",
  "HBAR",
]
