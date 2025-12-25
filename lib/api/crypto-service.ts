// API de Criptomoedas - Brapi v2
// https://brapi.dev/docs#tag/Criptomoedas/operation/get-v2-crypto

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

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


// Fallback via CoinGecko (sem API key)
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

const COINGECKO_ID_MAP: Record<string, string> = {
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
}

function resolveCoinGeckoId(coin: string): string {
  const clean = coin.replace(/-USD|-BRL|-USDT/gi, "").toUpperCase()
  return COINGECKO_ID_MAP[clean] || clean.toLowerCase()
}

async function fetchCoinGeckoCurrent(coin: string, currency: "BRL" | "USD" | "USDT"): Promise<number | null> {
  try {
    const id = resolveCoinGeckoId(coin)
    const vs = currency === "USDT" ? "usd" : currency.toLowerCase()
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(vs)}`
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const data = await response.json()
    const price = data?.[id]?.[vs]
    return typeof price === "number" ? price : null
  } catch {
    return null
  }
}

async function fetchCoinGeckoHistorical(coin: string, dateISO: string, currency: "BRL" | "USD" | "USDT"): Promise<number | null> {
  try {
    const id = resolveCoinGeckoId(coin)
    const dt = new Date(dateISO)
    if (Number.isNaN(dt.getTime())) return null

    // CoinGecko espera DD-MM-YYYY
    const dd = String(dt.getUTCDate()).padStart(2, "0")
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
    const yyyy = String(dt.getUTCFullYear())
    const dateParam = `${dd}-${mm}-${yyyy}`

    const vs = currency === "USDT" ? "usd" : currency.toLowerCase()
    const url = `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(id)}/history?date=${encodeURIComponent(dateParam)}&localization=false`
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const data = await response.json()
    const price = data?.market_data?.current_price?.[vs]
    return typeof price === "number" ? price : null
  } catch {
    return null
  }
}
export interface CryptoResponse {
  coins: CryptoQuote[]
  availableCoins: string[]
  requestedAt: string
  took: string
}

export async function getUSDtoBRL(): Promise<number> {
  try {
    // Tenta buscar cotação do dólar via Brapi
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
        console.log(`[v0] USD to BRL rate: ${data.currency[0].bidPrice}`)
        return Number.parseFloat(data.currency[0].bidPrice)
      }
    }
  } catch (error) {
    console.log("[v0] Failed to fetch USD/BRL rate, using fallback")
  }

  // Fallback para taxa estimada (atualizar manualmente ou usar outro serviço)
  return 5.8
}

export async function getCryptoCotacao(coin: string, currency: "BRL" | "USD" | "USDT" = "BRL"): Promise<CryptoQuote | null> {
  // Se não houver token do Brapi, usa CoinGecko diretamente
  if (!BRAPI_TOKEN) {
    const price = await fetchCoinGeckoCurrent(coin, currency)
    if (price != null) {
      return {
        coin: coin.toUpperCase().replace(/-USD|-BRL|-USDT/gi, ""),
        coinName: coin.toUpperCase(),
        currency: currency === "USDT" ? "USDT" : currency,
        currencyRateFromUSD: 1,
        regularMarketPrice: price,
        regularMarketDayHigh: price,
        regularMarketDayLow: price,
        regularMarketDayRange: "",
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        regularMarketPreviousClose: price,
        regularMarketVolume: 0,
        marketCap: 0,
        circulatingSupply: 0,
        regularMarketTime: new Date().toISOString(),
      }
    }
    return null
  }
  try {
    // Remove any suffix like -USD or -BRL
    const cleanCoin = coin.replace(/-USD|-BRL|-USDT/gi, "").toUpperCase()

    const url = `${BRAPI_BASE_URL}/v2/crypto?coin=${cleanCoin}&currency=USD`

    console.log(`[v0] Fetching crypto from Brapi v2: ${cleanCoin} in USD`)

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${BRAPI_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] Brapi Crypto API error: ${response.status} ${response.statusText}`)
      console.error(`[v0] Error response:`, errorText)
      return null
    }

    const data: CryptoResponse = await response.json()

    if (!data.coins || data.coins.length === 0) {
      console.error(`[v0] No crypto data found for ${cleanCoin}`)
      return null
    }

    const cryptoData = data.coins[0]

    if (currency === "BRL") {
      const usdToBrl = await getUSDtoBRL()
      const priceInBRL = cryptoData.regularMarketPrice * usdToBrl
      const changeInBRL = cryptoData.regularMarketChange * usdToBrl

      console.log(
        `[v0] Converted ${cleanCoin}: ${cryptoData.regularMarketPrice} USD -> ${priceInBRL} BRL (rate: ${usdToBrl})`,
      )

      return {
        ...cryptoData,
        currency: "BRL",
        currencyRateFromUSD: usdToBrl,
        regularMarketPrice: priceInBRL,
        regularMarketDayHigh: cryptoData.regularMarketDayHigh * usdToBrl,
        regularMarketDayLow: cryptoData.regularMarketDayLow * usdToBrl,
        regularMarketChange: changeInBRL,
        marketCap: cryptoData.marketCap * usdToBrl,
      }
    }

    if (currency === "USDT") {
      console.log(`[v0] Got crypto quote for ${cleanCoin}: ${cryptoData.regularMarketPrice} USDT (via USD)`)
      return { ...cryptoData, currency: "USDT" }
    }

    console.log(`[v0] Got crypto quote for ${cleanCoin}: ${cryptoData.regularMarketPrice} USD`)
    return cryptoData
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
      console.log("[v0] Using fallback crypto list")
      return POPULAR_CRYPTOS
    }

    const data = await response.json()
    return data.coins || POPULAR_CRYPTOS
  } catch (error) {
    console.error("[v0] Error fetching available cryptos:", error)
    return POPULAR_CRYPTOS
  }
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
  currency: "BRL" | "USD" | "USDT" = "BRL",
): Promise<number | null> {
  try {
    console.log(`[v0] Fetching historical crypto price for ${coin} on ${date} in ${currency}`)

    // Se a data for muito recente, a melhor aproximação é a cotação atual (evita lacunas de fechamento)
    const targetDate = new Date(date)
    if (!Number.isNaN(targetDate.getTime())) {
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 1) {
        const currentQuote = await getCryptoCotacao(coin, currency)
        if (currentQuote) return currentQuote.regularMarketPrice
      }
    }

    // Histórico por dia via CoinGecko (DD-MM-YYYY)
    const historical = await fetchCoinGeckoHistorical(coin, date, currency)
    if (historical != null) return historical

    // Fallback: cotação atual
    const currentQuote = await getCryptoCotacao(coin, currency)
    if (currentQuote) return currentQuote.regularMarketPrice

    return null
  } catch (error) {
    console.error(`[v0] Error fetching historical crypto price for ${coin}:`, error)
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
