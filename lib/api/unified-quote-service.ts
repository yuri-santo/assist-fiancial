// Serviço unificado com fallback entre múltiplas APIs
// Ordem de prioridade: CoinGecko (crypto) -> Brapi -> US Stocks APIs

import { getCotacao as getBrapiCotacao, getCotacaoHistorica as getBrapiHistorica } from "./brapi"
import { getCryptoCotacao, getCryptoHistorica, getUSDtoBRL } from "./crypto-service"
import { getUSStockQuote } from "./us-stocks-service"

const COINGECKO_API = "https://api.coingecko.com/api/v3"

const quoteCache = new Map<string, { data: UnifiedQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute cache

export interface UnifiedQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  source: "yahoo" | "brapi" | "coingecko" | "alphavantage" | "fallback"
}

async function fetchFromCoinGecko(ticker: string, currency: "BRL" | "USD"): Promise<UnifiedQuote | null> {
  try {
    // Map common crypto tickers to CoinGecko IDs
    const coinIdMap: Record<string, string> = {
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

    const coinId = coinIdMap[ticker.toUpperCase()] || ticker.toLowerCase()

    // Check if it's a valid crypto ticker
    if (!coinIdMap[ticker.toUpperCase()] && ticker.length > 5) {
      return null // Likely not a crypto
    }

    const vsCurrency = currency.toLowerCase()
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const coinData = data[coinId]

    if (!coinData) return null

    const price = coinData[vsCurrency]
    const change24h = coinData[`${vsCurrency}_24h_change`] || 0

    return {
      symbol: ticker.toUpperCase(),
      name: ticker.toUpperCase(),
      price,
      change: (price * change24h) / 100,
      changePercent: change24h,
      currency: currency,
      source: "coingecko",
    }
  } catch {
    // Silent fail
    return null
  }
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

  let result: UnifiedQuote | null = null

  if (assetType === "crypto") {
    const geckoQuote = await fetchFromCoinGecko(ticker, currency)
    if (geckoQuote) {
      result = geckoQuote
    } else {
      // Fallback to Brapi only if CoinGecko fails
      const cryptoQuote = await getCryptoCotacao(ticker, currency)
      if (cryptoQuote) {
        result = {
          symbol: ticker.toUpperCase(),
          name: cryptoQuote.coinName,
          price: cryptoQuote.regularMarketPrice,
          change: cryptoQuote.regularMarketChange,
          changePercent: cryptoQuote.regularMarketChangePercent,
          currency: currency,
          source: "brapi",
        }
      }
    }

    if (result) {
      quoteCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }
    return result
  }

  // For stocks
  const brapiQuote = await getBrapiCotacao(ticker)
  if (brapiQuote) {
    let price = brapiQuote.regularMarketPrice
    let change = brapiQuote.regularMarketChange
    let resultCurrency = brapiQuote.currency

    if (brapiQuote.currency === "USD" && currency === "BRL") {
      const usdToBrl = await getUSDtoBRL()
      price = brapiQuote.regularMarketPrice * usdToBrl
      change = brapiQuote.regularMarketChange * usdToBrl
      resultCurrency = "BRL"
    }

    result = {
      symbol: brapiQuote.symbol,
      name: brapiQuote.shortName,
      price,
      change,
      changePercent: brapiQuote.regularMarketChangePercent,
      currency: resultCurrency,
      source: "brapi",
    }
  }

  if (!result) {
    const usStockQuote = await getUSStockQuote(ticker)
    if (usStockQuote) {
      if (currency === "BRL" && usStockQuote.currency === "USD") {
        const usdToBrl = await getUSDtoBRL()
        result = {
          symbol: usStockQuote.symbol,
          name: usStockQuote.name,
          price: usStockQuote.price * usdToBrl,
          change: usStockQuote.change * usdToBrl,
          changePercent: usStockQuote.changePercent,
          currency: "BRL",
          source: usStockQuote.source,
        }
      } else {
        result = {
          symbol: usStockQuote.symbol,
          name: usStockQuote.name,
          price: usStockQuote.price,
          change: usStockQuote.change,
          changePercent: usStockQuote.changePercent,
          currency: usStockQuote.currency,
          source: usStockQuote.source,
        }
      }
    }
  }

  if (result) {
    quoteCache.set(cacheKey, { data: result, timestamp: Date.now() })
  }

  return result
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
    const cryptoPrice = await getCryptoHistorica(ticker, date, currency)
    if (cryptoPrice) result = cryptoPrice
  } else {
    const stockPrice = await getBrapiHistorica(ticker, date)
    if (stockPrice) result = stockPrice
  }

  // If historical price not available, try current price
  if (!result) {
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
