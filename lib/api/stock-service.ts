// Multi-API Stock Service with Fallbacks - SOLID Architecture
// Supports: Yahoo Finance, Brapi (with token), Alpha Vantage, HG Brasil, Finnhub
// Implements: Single Responsibility, Open/Closed, Dependency Inversion principles

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || ""
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ""

export interface StockQuote {
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
  timestamp: Date
  source: string
  marketCap?: number
  pe?: number
  eps?: number
}

export interface HistoricalPrice {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose?: number
}

export interface StockIndicators {
  volatility: number
  beta?: number
  sharpeRatio?: number
  maxDrawdown: number
  avgVolume: number
  rsi?: number
  sma20?: number
  sma50?: number
  sma200?: number
  ema12?: number
  ema26?: number
  macd?: number
  macdSignal?: number
  macdHistogram?: number
  bollingerUpper?: number
  bollingerLower?: number
  bollingerMiddle?: number
  atr?: number
  adx?: number
  stdDev?: number
  variance?: number
  dailyReturns?: number[]
  riskLevel: "baixo" | "moderado" | "alto" | "muito_alto"
}

// Interface for API providers (Dependency Inversion)
interface StockAPIProvider {
  name: string
  priority: number
  isAvailable(): boolean
  fetchQuote(ticker: string): Promise<StockQuote | null>
  fetchHistorical(ticker: string, range: string): Promise<HistoricalPrice[]>
}

class YahooFinanceProvider implements StockAPIProvider {
  name = "Yahoo Finance"
  priority = 1

  isAvailable(): boolean {
    return true
  }

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      // Try Brazilian stock first
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?interval=1d&range=1d`

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) {
        // Try without .SA suffix for US stocks
        const usUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`
        const usResponse = await fetch(usUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        })
        if (!usResponse.ok) return null
        const usData = await usResponse.json()
        return this.parseYahooResponse(usData, cleanTicker)
      }

      const data = await response.json()
      return this.parseYahooResponse(data, cleanTicker)
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
    }
  }

  private parseYahooResponse(data: Record<string, unknown>, ticker: string): StockQuote | null {
    const result = (data.chart as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined
    if (!result?.[0]) return null

    const meta = result[0].meta as Record<string, unknown>
    if (!meta) return null

    return {
      symbol: ticker,
      name: (meta.shortName as string) || (meta.symbol as string) || ticker,
      price: (meta.regularMarketPrice as number) || 0,
      change: ((meta.regularMarketPrice as number) || 0) - ((meta.previousClose as number) || 0),
      changePercent:
        meta.regularMarketPrice && meta.previousClose
          ? (((meta.regularMarketPrice as number) - (meta.previousClose as number)) / (meta.previousClose as number)) *
            100
          : 0,
      high: (meta.regularMarketDayHigh as number) || 0,
      low: (meta.regularMarketDayLow as number) || 0,
      open: (meta.regularMarketOpen as number) || 0,
      previousClose: (meta.previousClose as number) || 0,
      volume: (meta.regularMarketVolume as number) || 0,
      timestamp: new Date(((meta.regularMarketTime as number) || Math.floor(Date.now() / 1000)) * 1000),
      source: this.name,
    }
  }

  async fetchHistorical(ticker: string, range: string): Promise<HistoricalPrice[]> {
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?interval=1d&range=${range}`

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        // Try US market
        const usUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=${range}`
        const usResponse = await fetch(usUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        })
        if (!usResponse.ok) return []
        const usData = await usResponse.json()
        return this.parseHistorical(usData)
      }

      const data = await response.json()
      return this.parseHistorical(data)
    } catch (error) {
      console.error(`[v0] ${this.name} Historical error:`, error)
      return []
    }
  }

  private parseHistorical(data: Record<string, unknown>): HistoricalPrice[] {
    const result = (data.chart as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined
    if (!result?.[0]) return []

    const timestamps = (result[0].timestamp as number[]) || []
    const indicators = result[0].indicators as Record<string, unknown>
    const quote = (indicators?.quote as Array<Record<string, number[]>>)?.[0] || {}
    const adjClose = (indicators?.adjclose as Array<{ adjclose: number[] }>)?.[0]?.adjclose || []

    return timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000),
        open: quote.open?.[i] || 0,
        high: quote.high?.[i] || 0,
        low: quote.low?.[i] || 0,
        close: quote.close?.[i] || 0,
        volume: quote.volume?.[i] || 0,
        adjustedClose: adjClose[i] || quote.close?.[i] || 0,
      }))
      .filter((p: HistoricalPrice) => p.close > 0)
  }
}

class BrapiProvider implements StockAPIProvider {
  name = "Brapi"
  priority = 2

  isAvailable(): boolean {
    return !!BRAPI_TOKEN && BRAPI_TOKEN.length > 0
  }

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    if (!BRAPI_TOKEN) {
      console.log("[v0] Brapi: No token configured, skipping")
      return null
    }

    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = `https://brapi.dev/api/quote/${cleanTicker}?fundamental=true`

      console.log(`[v0] Brapi: Fetching ${cleanTicker}...`)

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.error(`[v0] Brapi API error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[v0] Brapi error response:`, errorText)
        return null
      }

      const data = await response.json()

      if (data.error) {
        console.error(`[v0] Brapi API error response: ${data.message || data.error}`)
        return null
      }

      const result = data.results?.[0]
      if (!result) {
        console.error("[v0] Brapi: No results returned")
        return null
      }

      console.log(`[v0] Brapi: Success for ${cleanTicker} - Price: ${result.regularMarketPrice}`)

      return {
        symbol: result.symbol,
        name: result.longName || result.shortName || cleanTicker,
        price: result.regularMarketPrice || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        high: result.regularMarketDayHigh || 0,
        low: result.regularMarketDayLow || 0,
        open: result.regularMarketOpen || 0,
        previousClose: result.regularMarketPreviousClose || 0,
        volume: result.regularMarketVolume || 0,
        timestamp: new Date(result.regularMarketTime || Date.now()),
        source: this.name,
        marketCap: result.marketCap,
        pe: result.priceEarnings,
        eps: result.earningsPerShare,
      }
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
    }
  }

  async fetchHistorical(ticker: string, range: string): Promise<HistoricalPrice[]> {
    if (!BRAPI_TOKEN) return []

    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = `https://brapi.dev/api/quote/${cleanTicker}?range=${range}&interval=1d`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) return []

      const data = await response.json()
      const prices = data.results?.[0]?.historicalDataPrice || []

      return prices
        .map(
          (p: {
            date: number
            open: number
            high: number
            low: number
            close: number
            volume: number
            adjustedClose?: number
          }) => ({
            date: new Date(p.date * 1000),
            open: p.open || 0,
            high: p.high || 0,
            low: p.low || 0,
            close: p.close || 0,
            volume: p.volume || 0,
            adjustedClose: p.adjustedClose || p.close || 0,
          }),
        )
        .filter((p: HistoricalPrice) => p.close > 0)
    } catch (error) {
      console.error(`[v0] ${this.name} Historical error:`, error)
      return []
    }
  }
}

class HGBrasilProvider implements StockAPIProvider {
  name = "HG Brasil"
  priority = 3

  isAvailable(): boolean {
    return true
  }

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const response = await fetch(`https://api.hgbrasil.com/finance/stock_price?key=demo&symbol=${cleanTicker}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return null

      const data = await response.json()
      const result = data.results?.[cleanTicker]
      if (!result || !result.price) return null

      return {
        symbol: cleanTicker,
        name: result.name || cleanTicker,
        price: result.price || 0,
        change: result.change_price || 0,
        changePercent: result.change_percent || 0,
        high: result.price || 0,
        low: result.price || 0,
        open: result.price || 0,
        previousClose: result.price - (result.change_price || 0),
        volume: result.volume || 0,
        timestamp: new Date(result.updated_at || Date.now()),
        source: this.name,
      }
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
    }
  }

  async fetchHistorical(): Promise<HistoricalPrice[]> {
    return []
  }
}

class AlphaVantageProvider implements StockAPIProvider {
  name = "Alpha Vantage"
  priority = 4

  isAvailable(): boolean {
    return !!ALPHA_VANTAGE_KEY && ALPHA_VANTAGE_KEY !== "demo"
  }

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    if (!ALPHA_VANTAGE_KEY) return null

    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const symbolForAV = cleanTicker.match(/^\d/) ? `${cleanTicker}.SAO` : cleanTicker

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbolForAV}&apikey=${ALPHA_VANTAGE_KEY}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        },
      )

      if (!response.ok) return null

      const data = await response.json()
      const quote = data["Global Quote"]
      if (!quote || Object.keys(quote).length === 0) return null

      const price = Number.parseFloat(quote["05. price"]) || 0
      const prevClose = Number.parseFloat(quote["08. previous close"]) || 0

      return {
        symbol: cleanTicker,
        name: cleanTicker,
        price,
        change: Number.parseFloat(quote["09. change"]) || 0,
        changePercent: Number.parseFloat(quote["10. change percent"]?.replace("%", "")) || 0,
        high: Number.parseFloat(quote["03. high"]) || 0,
        low: Number.parseFloat(quote["04. low"]) || 0,
        open: Number.parseFloat(quote["02. open"]) || 0,
        previousClose: prevClose,
        volume: Number.parseInt(quote["06. volume"]) || 0,
        timestamp: new Date(),
        source: this.name,
      }
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
    }
  }

  async fetchHistorical(ticker: string): Promise<HistoricalPrice[]> {
    if (!ALPHA_VANTAGE_KEY) return []

    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const symbolForAV = cleanTicker.match(/^\d/) ? `${cleanTicker}.SAO` : cleanTicker

      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbolForAV}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        },
      )

      if (!response.ok) return []

      const data = await response.json()
      const timeSeries = data["Time Series (Daily)"]
      if (!timeSeries) return []

      return Object.entries(timeSeries)
        .slice(0, 100)
        .map(([date, values]: [string, unknown]) => {
          const v = values as Record<string, string>
          return {
            date: new Date(date),
            open: Number.parseFloat(v["1. open"]) || 0,
            high: Number.parseFloat(v["2. high"]) || 0,
            low: Number.parseFloat(v["3. low"]) || 0,
            close: Number.parseFloat(v["4. close"]) || 0,
            volume: Number.parseInt(v["5. volume"]) || 0,
            adjustedClose: Number.parseFloat(v["4. close"]) || 0,
          }
        })
        .filter((p) => p.close > 0)
        .reverse()
    } catch (error) {
      console.error(`[v0] ${this.name} Historical error:`, error)
      return []
    }
  }
}

class FinnhubProvider implements StockAPIProvider {
  name = "Finnhub"
  priority = 5

  isAvailable(): boolean {
    return !!FINNHUB_KEY
  }

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    if (!FINNHUB_KEY) return null

    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()

      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanTicker}&token=${FINNHUB_KEY}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (!data.c || data.c === 0) return null

      return {
        symbol: cleanTicker,
        name: cleanTicker,
        price: data.c || 0,
        change: data.d || 0,
        changePercent: data.dp || 0,
        high: data.h || 0,
        low: data.l || 0,
        open: data.o || 0,
        previousClose: data.pc || 0,
        volume: 0,
        timestamp: new Date(data.t * 1000),
        source: this.name,
      }
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
    }
  }

  async fetchHistorical(): Promise<HistoricalPrice[]> {
    return []
  }
}

// Stock Service - Orchestrator (Single Responsibility)
class StockService {
  private providers: StockAPIProvider[]

  constructor() {
    const allProviders = [
      new YahooFinanceProvider(),
      new BrapiProvider(),
      new HGBrasilProvider(),
      new AlphaVantageProvider(),
      new FinnhubProvider(),
    ]

    this.providers = allProviders.filter((p) => p.isAvailable()).sort((a, b) => a.priority - b.priority)

    console.log(
      `[v0] Stock Service initialized with ${this.providers.length} providers:`,
      this.providers.map((p) => p.name).join(", "),
    )
  }

  async getQuote(ticker: string): Promise<StockQuote | null> {
    for (const provider of this.providers) {
      try {
        console.log(`[v0] Trying ${provider.name} for ${ticker}...`)
        const quote = await provider.fetchQuote(ticker)
        if (quote && quote.price > 0) {
          console.log(`[v0] Success: Got quote from ${provider.name} for ${ticker} - Price: ${quote.price}`)
          return quote
        }
        console.log(`[v0] ${provider.name} returned no valid data for ${ticker}, trying next...`)
      } catch (error) {
        console.error(`[v0] ${provider.name} failed for ${ticker}:`, error)
      }
    }
    console.error(`[v0] All ${this.providers.length} APIs failed for ticker: ${ticker}`)
    return null
  }

  async getHistorical(
    ticker: string,
    range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
  ): Promise<HistoricalPrice[]> {
    for (const provider of this.providers) {
      try {
        const prices = await provider.fetchHistorical(ticker, range)
        if (prices.length > 0) {
          console.log(`[v0] Got ${prices.length} historical prices from ${provider.name} for ${ticker}`)
          return prices
        }
      } catch (error) {
        console.error(`[v0] ${provider.name} historical failed for ${ticker}:`, error)
      }
    }
    return []
  }

  async getBatchQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>()
    const batchSize = 5

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize)
      const promises = batch.map(async (ticker) => {
        const quote = await this.getQuote(ticker)
        if (quote) results.set(ticker, quote)
      })
      await Promise.all(promises)

      if (i + batchSize < tickers.length) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    return results
  }
}

// Singleton instance
const stockService = new StockService()

// Public API functions
export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  return stockService.getQuote(ticker)
}

export async function getStockQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  return stockService.getBatchQuotes(tickers)
}

export async function getHistoricalPrices(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
): Promise<HistoricalPrice[]> {
  return stockService.getHistorical(ticker, range)
}

export function calculateIndicators(prices: HistoricalPrice[]): StockIndicators {
  if (prices.length < 2) {
    return {
      volatility: 0,
      maxDrawdown: 0,
      avgVolume: 0,
      riskLevel: "baixo",
    }
  }

  // Calculate daily returns
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const prevClose = prices[i - 1].close
    const currClose = prices[i].close
    if (prevClose > 0) {
      returns.push((currClose - prevClose) / prevClose)
    }
  }

  // Volatility (annualized standard deviation)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const volatility = stdDev * Math.sqrt(252) * 100

  // Max Drawdown
  let peak = prices[0].close
  let maxDrawdown = 0
  for (const price of prices) {
    if (price.close > peak) peak = price.close
    const drawdown = ((peak - price.close) / peak) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  // Average Volume
  const avgVolume = prices.reduce((sum, p) => sum + p.volume, 0) / prices.length

  // RSI (14 periods)
  let rsi: number | undefined
  if (prices.length >= 14) {
    let gains = 0
    let losses = 0
    for (let i = prices.length - 14; i < prices.length; i++) {
      const change = prices[i].close - prices[i - 1].close
      if (change > 0) gains += change
      else losses -= change
    }
    const avgGain = gains / 14
    const avgLoss = losses / 14
    if (avgLoss > 0) {
      const rs = avgGain / avgLoss
      rsi = 100 - 100 / (1 + rs)
    } else {
      rsi = 100
    }
  }

  // Simple Moving Averages
  const closePrices = prices.map((p) => p.close)
  const sma20 = closePrices.length >= 20 ? closePrices.slice(-20).reduce((a, b) => a + b, 0) / 20 : undefined
  const sma50 = closePrices.length >= 50 ? closePrices.slice(-50).reduce((a, b) => a + b, 0) / 50 : undefined
  const sma200 = closePrices.length >= 200 ? closePrices.slice(-200).reduce((a, b) => a + b, 0) / 200 : undefined

  // EMA calculation helper
  const calculateEMA = (data: number[], period: number): number | undefined => {
    if (data.length < period) return undefined
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    return ema
  }

  const ema12 = calculateEMA(closePrices, 12)
  const ema26 = calculateEMA(closePrices, 26)
  const macd = ema12 && ema26 ? ema12 - ema26 : undefined

  // Bollinger Bands (20 periods, 2 std dev)
  let bollingerUpper: number | undefined
  let bollingerLower: number | undefined
  let bollingerMiddle: number | undefined
  if (closePrices.length >= 20) {
    const last20 = closePrices.slice(-20)
    bollingerMiddle = last20.reduce((a, b) => a + b, 0) / 20
    const bbStdDev = Math.sqrt(last20.reduce((sum, p) => sum + Math.pow(p - bollingerMiddle!, 2), 0) / 20)
    bollingerUpper = bollingerMiddle + 2 * bbStdDev
    bollingerLower = bollingerMiddle - 2 * bbStdDev
  }

  // ATR (14 periods)
  let atr: number | undefined
  if (prices.length >= 15) {
    const trueRanges: number[] = []
    for (let i = prices.length - 14; i < prices.length; i++) {
      const high = prices[i].high
      const low = prices[i].low
      const prevClose = prices[i - 1].close
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
      trueRanges.push(tr)
    }
    atr = trueRanges.reduce((a, b) => a + b, 0) / 14
  }

  // Risk Level based on volatility
  let riskLevel: "baixo" | "moderado" | "alto" | "muito_alto"
  if (volatility < 15) riskLevel = "baixo"
  else if (volatility < 25) riskLevel = "moderado"
  else if (volatility < 40) riskLevel = "alto"
  else riskLevel = "muito_alto"

  return {
    volatility,
    maxDrawdown,
    avgVolume,
    rsi,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    macd,
    bollingerUpper,
    bollingerLower,
    bollingerMiddle,
    atr,
    stdDev: stdDev * 100,
    variance: variance * 10000,
    dailyReturns: returns.map((r) => r * 100),
    riskLevel,
  }
}
