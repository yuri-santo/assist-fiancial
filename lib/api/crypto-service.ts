// API de Criptomoedas - CoinGecko como primário, Brapi como fallback
// CoinGecko não precisa de autenticação

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""
const COINGECKO_API = "https://api.coingecko.com/api/v3"

const cryptoCache = new Map<string, { data: CryptoQuote; timestamp: number }>()
const usdBrlCache: { rate: number; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minute cache
const USD_BRL_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for exchange rate

const COINGECKO_IDS: Record<string, string> = {
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
}

export interface CryptoQuote {
  coin: string
  coinName: string
  currency: string
  currencyRateFromUSD: number
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

let cachedUsdBrl: { rate: number; timestamp: number } | null = null

export async function getUSDtoBRL(): Promise<number> {
  // Check cache
  if (cachedUsdBrl && Date.now() - cachedUsdBrl.timestamp < USD_BRL_CACHE_TTL) {
    return cachedUsdBrl.rate
  }

  try {
    // First try Brapi
    if (BRAPI_TOKEN) {
      const url = `${BRAPI_BASE_URL}/v2/currency?currency=USD-BRL`
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.currency && data.currency[0]?.bidPrice) {
          const rate = Number.parseFloat(data.currency[0].bidPrice)
          cachedUsdBrl = { rate, timestamp: Date.now() }
          return rate
        }
      }
    }

    // Fallback to exchangerate-api (free, no auth)
    const fallbackUrl = "https://api.exchangerate-api.com/v4/latest/USD"
    const fallbackResponse = await fetch(fallbackUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json()
      if (data.rates?.BRL) {
        const rate = data.rates.BRL
        cachedUsdBrl = { rate, timestamp: Date.now() }
        return rate
      }
    }
  } catch {
    // Silent fail
  }

  // Fallback rate
  return 5.8
}

async function fetchFromCoinGecko(coin: string, currency: "BRL" | "USD"): Promise<CryptoQuote | null> {
  try {
    const cleanCoin = coin.replace(/-USD|-BRL/gi, "").toUpperCase()
    const coinId = COINGECKO_IDS[cleanCoin]

    if (!coinId) return null // Unknown crypto

    const vsCurrency = currency.toLowerCase()
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_market_cap=true`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const coinData = data[coinId]

    if (!coinData || !coinData[vsCurrency]) return null

    const price = coinData[vsCurrency]
    const change24h = coinData[`${vsCurrency}_24h_change`] || 0
    const high24h = coinData[`${vsCurrency}_24h_high`] || price
    const low24h = coinData[`${vsCurrency}_24h_low`] || price
    const marketCap = coinData[`${vsCurrency}_market_cap`] || 0

    return {
      coin: cleanCoin,
      coinName: cleanCoin,
      currency: currency,
      currencyRateFromUSD: currency === "BRL" ? await getUSDtoBRL() : 1,
      regularMarketPrice: price,
      regularMarketDayHigh: high24h,
      regularMarketDayLow: low24h,
      regularMarketDayRange: `${low24h} - ${high24h}`,
      regularMarketChange: (price * change24h) / 100,
      regularMarketChangePercent: change24h,
      regularMarketTime: new Date().toISOString(),
      circulatingSupply: 0,
      marketCap: marketCap,
    }
  } catch {
    return null
  }
}

export async function getCryptoCotacao(coin: string, currency: "BRL" | "USD" = "BRL"): Promise<CryptoQuote | null> {
  const cleanCoin = coin.replace(/-USD|-BRL/gi, "").toUpperCase()

  // Check cache first
  const cacheKey = `${cleanCoin}-${currency}`
  const cached = cryptoCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const geckoQuote = await fetchFromCoinGecko(cleanCoin, currency)
  if (geckoQuote) {
    cryptoCache.set(cacheKey, { data: geckoQuote, timestamp: Date.now() })
    return geckoQuote
  }

  // Fallback to Brapi only if token exists
  if (BRAPI_TOKEN) {
    try {
      const url = `${BRAPI_BASE_URL}/v2/crypto?coin=${cleanCoin}&currency=USD`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) return null

      const data: CryptoResponse = await response.json()

      if (!data.coins || data.coins.length === 0) return null

      const cryptoData = data.coins[0]

      let result: CryptoQuote

      if (currency === "BRL") {
        const usdToBrl = await getUSDtoBRL()
        result = {
          ...cryptoData,
          currency: "BRL",
          currencyRateFromUSD: usdToBrl,
          regularMarketPrice: cryptoData.regularMarketPrice * usdToBrl,
          regularMarketDayHigh: cryptoData.regularMarketDayHigh * usdToBrl,
          regularMarketDayLow: cryptoData.regularMarketDayLow * usdToBrl,
          regularMarketChange: cryptoData.regularMarketChange * usdToBrl,
          marketCap: cryptoData.marketCap * usdToBrl,
        }
      } else {
        result = cryptoData
      }

      cryptoCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    } catch {
      return null
    }
  }

  return null
}

export async function getAvailableCryptos(): Promise<string[]> {
  // Return static list (more reliable than API call)
  return POPULAR_CRYPTOS
}

export async function searchCryptos(query: string): Promise<{ symbol: string; name: string }[]> {
  const available = await getAvailableCryptos()
  const filtered = available.filter((c) => c.toLowerCase().includes(query.toLowerCase()))

  return filtered.slice(0, 20).map((c) => ({
    symbol: c,
    name: `${c} (${c.toUpperCase()})`,
  }))
}

export async function getCryptoHistorica(
  coin: string,
  date: string,
  currency: "BRL" | "USD" = "BRL",
): Promise<number | null> {
  try {
    // For crypto, if date is recent (within 7 days), use current price
    const targetDate = new Date(date)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 7) {
      const currentQuote = await getCryptoCotacao(coin, currency)
      if (currentQuote) {
        return currentQuote.regularMarketPrice
      }
    }

    // For older dates, try CoinGecko history API
    const cleanCoin = coin.replace(/-USD|-BRL/gi, "").toUpperCase()
    const coinId = COINGECKO_IDS[cleanCoin]

    if (coinId) {
      const formattedDate = `${targetDate.getDate().toString().padStart(2, "0")}-${(targetDate.getMonth() + 1).toString().padStart(2, "0")}-${targetDate.getFullYear()}`
      const url = `${COINGECKO_API}/coins/${coinId}/history?date=${formattedDate}&localization=false`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        const vsCurrency = currency.toLowerCase()
        if (data.market_data?.current_price?.[vsCurrency]) {
          return data.market_data.current_price[vsCurrency]
        }
      }
    }

    // Fallback to current price
    const currentQuote = await getCryptoCotacao(coin, currency)
    return currentQuote?.regularMarketPrice || null
  } catch {
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
