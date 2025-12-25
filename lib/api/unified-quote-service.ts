// Serviço unificado com fallback entre múltiplas APIs
// Ordem de prioridade: Brapi -> US Stocks APIs -> CoinGecko

import { getCotacao as getBrapiCotacao, getCotacaoHistorica as getBrapiHistorica } from "./brapi"
import { getCryptoCotacao, getCryptoHistorica, getUSDtoBRL } from "./crypto-service"
import { getUSStockQuote } from "./us-stocks-service"

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
    }

    const coinId = coinIdMap[ticker.toUpperCase()] || ticker.toLowerCase()
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

export async function getUnifiedQuote(
  ticker: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" | "USDT" = "BRL",
): Promise<UnifiedQuote | null> {
  console.log(`[v0] Fetching unified quote for ${ticker} (${assetType}) in ${currency}`)

  if (assetType === "crypto") {
    const cryptoQuote = await getCryptoCotacao(ticker, currency)
    if (cryptoQuote) {
      console.log(`[v0] Crypto quote found: ${cryptoQuote.regularMarketPrice} ${currency}`)
      return {
        symbol: ticker.toUpperCase(),
        name: cryptoQuote.coinName,
        price: cryptoQuote.regularMarketPrice,
        change: cryptoQuote.regularMarketChange,
        changePercent: cryptoQuote.regularMarketChangePercent,
        currency: currency,
        source: "brapi",
      }
    }

    console.log(`[v0] Trying CoinGecko as fallback for ${ticker}`)
    const geckoQuote = await fetchFromCoinGecko(ticker, currency)
    if (geckoQuote) return geckoQuote

    console.error(`[v0] No crypto quote found for ${ticker} from any source`)
    return null
  }

  const brapiQuote = await getBrapiCotacao(ticker)
  if (brapiQuote) {
    console.log(`[v0] Brapi quote found: ${brapiQuote.regularMarketPrice} ${brapiQuote.currency}`)

    // Se o ativo está em USD mas o usuário quer BRL, converter
    let price = brapiQuote.regularMarketPrice
    let change = brapiQuote.regularMarketChange
    let resultCurrency = brapiQuote.currency

    if (brapiQuote.currency === "USD" && currency === "BRL") {
      const usdToBrl = await getUSDtoBRL()
      price = brapiQuote.regularMarketPrice * usdToBrl
      change = brapiQuote.regularMarketChange * usdToBrl
      resultCurrency = "BRL"
      console.log(`[v0] Converted stock from USD to BRL: ${brapiQuote.regularMarketPrice} -> ${price}`)
    }

    return {
      symbol: brapiQuote.symbol,
      name: brapiQuote.shortName,
      price,
      change,
      changePercent: brapiQuote.regularMarketChangePercent,
      currency: resultCurrency,
      source: "brapi",
    }
  }

  console.log(`[v0] Brapi failed, trying US stock APIs for ${ticker}`)
  const usStockQuote = await getUSStockQuote(ticker)
  if (usStockQuote) {
    // Converter para BRL se necessário
    if (currency === "BRL" && usStockQuote.currency === "USD") {
      const usdToBrl = await getUSDtoBRL()
      return {
        symbol: usStockQuote.symbol,
        name: usStockQuote.name,
        price: usStockQuote.price * usdToBrl,
        change: usStockQuote.change * usdToBrl,
        changePercent: usStockQuote.changePercent,
        currency: "BRL",
        source: usStockQuote.source,
      }
    }

    return {
      symbol: usStockQuote.symbol,
      name: usStockQuote.name,
      price: usStockQuote.price,
      change: usStockQuote.change,
      changePercent: usStockQuote.changePercent,
      currency: usStockQuote.currency,
      source: usStockQuote.source,
    }
  }

  console.error(`[v0] No quote found for ${ticker} from any source`)
  return null
}

export async function getHistoricalPrice(
  ticker: string,
  date: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" | "USDT" = "BRL",
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
