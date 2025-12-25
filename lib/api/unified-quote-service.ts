// Serviço unificado com fallback entre múltiplas APIs
// Ordem de prioridade: Yahoo Finance (grátis) -> Brapi (com token) -> Fallback mock

import { getCotacao as getBrapiCotacao, getCotacaoHistorica as getBrapiHistorica } from "./brapi"
import { getCryptoCotacao, getCryptoHistorica } from "./crypto-service"

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || ""
const COINGECKO_API = "https://api.coingecko.com/api/v3"

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
    console.log(`[v0] Trying CoinGecko for ${ticker}`)
    const coinId = ticker.toLowerCase()
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
  } catch (error) {
    console.error(`[v0] CoinGecko error for ${ticker}:`, error)
    return null
  }
}

async function fetchFromAlphaVantage(ticker: string): Promise<UnifiedQuote | null> {
  if (!ALPHA_VANTAGE_KEY) return null

  try {
    console.log(`[v0] Trying Alpha Vantage for ${ticker}`)
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const quote = data["Global Quote"]

    if (!quote || !quote["05. price"]) return null

    return {
      symbol: ticker.toUpperCase(),
      name: quote["01. symbol"] || ticker,
      price: Number.parseFloat(quote["05. price"]),
      change: Number.parseFloat(quote["09. change"]),
      changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
      currency: "USD",
      source: "alphavantage",
    }
  } catch (error) {
    console.error(`[v0] Alpha Vantage error for ${ticker}:`, error)
    return null
  }
}

export async function getUnifiedQuote(
  ticker: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<UnifiedQuote | null> {
  console.log(`[v0] Fetching unified quote for ${ticker} (${assetType})`)

  // Para criptomoedas
  if (assetType === "crypto") {
    // Tenta Brapi primeiro
    const brapiQuote = await getCryptoCotacao(ticker, currency)
    if (brapiQuote) {
      return {
        symbol: ticker.toUpperCase(),
        name: brapiQuote.coinName,
        price: brapiQuote.regularMarketPrice,
        change: brapiQuote.regularMarketChange,
        changePercent: brapiQuote.regularMarketChangePercent,
        currency: currency,
        source: "brapi",
      }
    }

    // Fallback para CoinGecko
    const geckoQuote = await fetchFromCoinGecko(ticker, currency)
    if (geckoQuote) return geckoQuote

    console.error(`[v0] No crypto quote found for ${ticker}`)
    return null
  }

  // Para ações/stocks
  // Tenta Yahoo/Brapi primeiro
  const brapiQuote = await getBrapiCotacao(ticker)
  if (brapiQuote) {
    return {
      symbol: brapiQuote.symbol,
      name: brapiQuote.shortName,
      price: brapiQuote.regularMarketPrice,
      change: brapiQuote.regularMarketChange,
      changePercent: brapiQuote.regularMarketChangePercent,
      currency: brapiQuote.currency,
      source: "brapi",
    }
  }

  // Fallback para Alpha Vantage (stocks dos EUA)
  const alphaQuote = await fetchFromAlphaVantage(ticker)
  if (alphaQuote) return alphaQuote

  console.error(`[v0] No quote found for ${ticker}`)
  return null
}

export async function getHistoricalPrice(
  ticker: string,
  date: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL",
): Promise<number | null> {
  console.log(`[v0] Fetching historical price for ${ticker} on ${date} (${assetType})`)

  if (assetType === "crypto") {
    const cryptoPrice = await getCryptoHistorica(ticker, date, currency)
    if (cryptoPrice) return cryptoPrice
  } else {
    const stockPrice = await getBrapiHistorica(ticker, date)
    if (stockPrice) return stockPrice
  }

  // If historical price not available, try current price
  console.log(`[v0] Historical price not found, trying current price`)
  const currentQuote = await getUnifiedQuote(ticker, assetType, currency)
  if (currentQuote) {
    console.log(`[v0] Using current price as fallback: ${currentQuote.price}`)
    return currentQuote.price
  }

  return null
}
