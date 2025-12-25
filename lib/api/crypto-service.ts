// API de Criptomoedas - usa API route unificada

const COINGECKO_API = "https://api.coingecko.com/api/v3"

const cryptoCache = new Map<string, { data: CryptoQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute cache
const USD_BRL_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for exchange rate

export const COINGECKO_IDS: Record<string, string> = {
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
  USDT: "tether",
  USDC: "usd-coin",
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

let cachedUsdBrl: { rate: number; timestamp: number } | null = null

export async function getUSDtoBRL(): Promise<number> {
  if (cachedUsdBrl && Date.now() - cachedUsdBrl.timestamp < USD_BRL_CACHE_TTL) {
    return cachedUsdBrl.rate
  }

  try {
    const response = await fetch(`${COINGECKO_API}/simple/price?ids=usd&vs_currencies=brl`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.usd?.brl) {
        const rate = data.usd.brl
        cachedUsdBrl = { rate, timestamp: Date.now() }
        return rate
      }
    }
  } catch {
    // Silent fail
  }

  // Fallback to exchangerate-api
  try {
    const fallbackResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
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

  return 5.8
}

export async function getCryptoCotacao(coin: string, currency: "BRL" | "USD" = "BRL"): Promise<CryptoQuote | null> {
  const cleanCoin = coin.replace(/-USD|-BRL/gi, "").toUpperCase()

  const cacheKey = `${cleanCoin}-${currency}`
  const cached = cryptoCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const coinId = COINGECKO_IDS[cleanCoin]
  if (!coinId) return null

  try {
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

    const result: CryptoQuote = {
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

    cryptoCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return null
  }
}

export async function getAvailableCryptos(): Promise<string[]> {
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
    const targetDate = new Date(date)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 7) {
      const currentQuote = await getCryptoCotacao(coin, currency)
      if (currentQuote) {
        return currentQuote.regularMarketPrice
      }
    }

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

    const currentQuote = await getCryptoCotacao(coin, currency)
    return currentQuote?.regularMarketPrice || null
  } catch {
    return null
  }
}

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
