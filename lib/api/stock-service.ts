// Multi-API Stock Service with Fallbacks - SOLID Architecture
// Supports: Yahoo Finance, Brapi (with token), Alpha Vantage, HG Brasil
// Implements: Single Responsibility, Open/Closed, Dependency Inversion principles

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "sUCSXQ4LUHgtgLpa5WmZ4H"

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
  fetchQuote(ticker: string): Promise<StockQuote | null>
  fetchHistorical(ticker: string, range: string): Promise<HistoricalPrice[]>
}

// Yahoo Finance Provider
class YahooFinanceProvider implements StockAPIProvider {
  name = "Yahoo Finance"
  priority = 1

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?interval=1d&range=1d`

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) return null

      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (!result) return null

      const meta = result.meta
      return {
        symbol: cleanTicker,
        name: meta.shortName || meta.symbol || cleanTicker,
        price: meta.regularMarketPrice || 0,
        change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
        changePercent:
          meta.regularMarketPrice && meta.previousClose
            ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
            : 0,
        high: meta.regularMarketDayHigh || 0,
        low: meta.regularMarketDayLow || 0,
        open: meta.regularMarketOpen || 0,
        previousClose: meta.previousClose || 0,
        volume: meta.regularMarketVolume || 0,
        timestamp: new Date(meta.regularMarketTime * 1000),
        source: this.name,
      }
    } catch (error) {
      console.error(`[v0] ${this.name} error:`, error)
      return null
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

      if (!response.ok) return []

      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (!result) return []

      const timestamps = result.timestamp || []
      const quote = result.indicators?.quote?.[0] || {}
      const adjClose = result.indicators?.adjclose?.[0]?.adjclose || []

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
    } catch (error) {
      console.error(`[v0] ${this.name} Historical error:`, error)
      return []
    }
  }
}

// Brapi Provider with Token
class BrapiProvider implements StockAPIProvider {
  name = "Brapi"
  priority = 2

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = BRAPI_TOKEN
        ? `https://brapi.dev/api/quote/${cleanTicker}?token=${BRAPI_TOKEN}&fundamental=true`
        : `https://brapi.dev/api/quote/${cleanTicker}?fundamental=false`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) return null

      const data = await response.json()
      const result = data.results?.[0]
      if (!result) return null

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
    try {
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = BRAPI_TOKEN
        ? `https://brapi.dev/api/quote/${cleanTicker}?range=${range}&interval=1d&token=${BRAPI_TOKEN}`
        : `https://brapi.dev/api/quote/${cleanTicker}?range=${range}&interval=1d&fundamental=false`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return []

      const data = await response.json()
      const prices = data.results?.[0]?.historicalDataPrice || []

      return prices
        .map((p: any) => ({
          date: new Date(p.date * 1000),
          open: p.open || 0,
          high: p.high || 0,
          low: p.low || 0,
          close: p.close || 0,
          volume: p.volume || 0,
          adjustedClose: p.adjustedClose || p.close || 0,
        }))
        .filter((p: HistoricalPrice) => p.close > 0)
    } catch (error) {
      console.error(`[v0] ${this.name} Historical error:`, error)
      return []
    }
  }
}

// HG Brasil Provider (Free tier fallback)
class HGBrasilProvider implements StockAPIProvider {
  name = "HG Brasil"
  priority = 3

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
      if (!result) return null

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
    // HG Brasil doesn't provide historical data in free tier
    return []
  }
}

// Investing.com Brasil Scraper (backup)
class InvestingBRProvider implements StockAPIProvider {
  name = "Investing BR"
  priority = 4

  async fetchQuote(ticker: string): Promise<StockQuote | null> {
    try {
      // This is a simple simulation - in production would need proper scraping
      const cleanTicker = ticker.replace(".SA", "").toUpperCase()

      // Try alternative API endpoint
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cleanTicker}.SAO&apikey=demo`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
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

  async fetchHistorical(): Promise<HistoricalPrice[]> {
    return []
  }
}

// Stock Service - Orchestrator (Single Responsibility)
class StockService {
  private providers: StockAPIProvider[]

  constructor() {
    this.providers = [
      new YahooFinanceProvider(),
      new BrapiProvider(),
      new HGBrasilProvider(),
      new InvestingBRProvider(),
    ].sort((a, b) => a.priority - b.priority)
  }

  async getQuote(ticker: string): Promise<StockQuote | null> {
    for (const provider of this.providers) {
      const quote = await provider.fetchQuote(ticker)
      if (quote) {
        console.log(`[v0] Got quote from ${provider.name} for ${ticker}`)
        return quote
      }
    }
    console.error(`[v0] All APIs failed for ticker: ${ticker}`)
    return null
  }

  async getHistorical(
    ticker: string,
    range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1mo",
  ): Promise<HistoricalPrice[]> {
    for (const provider of this.providers) {
      const prices = await provider.fetchHistorical(ticker, range)
      if (prices.length > 0) {
        console.log(`[v0] Got historical from ${provider.name} for ${ticker}`)
        return prices
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

  // Closes array for moving averages
  const closes = prices.map((p) => p.close)

  // Simple Moving Averages
  const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : undefined
  const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : undefined
  const sma200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : undefined

  // Exponential Moving Averages (for MACD)
  const calculateEMA = (data: number[], period: number): number | undefined => {
    if (data.length < period) return undefined
    const k = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k)
    }
    return ema
  }

  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const macd = ema12 && ema26 ? ema12 - ema26 : undefined

  // RSI (14 days)
  let rsi: number | undefined
  if (returns.length >= 14) {
    const gains = returns.slice(-14).filter((r) => r > 0)
    const losses = returns
      .slice(-14)
      .filter((r) => r < 0)
      .map((r) => Math.abs(r))
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0
    if (avgLoss > 0) {
      const rs = avgGain / avgLoss
      rsi = 100 - 100 / (1 + rs)
    } else {
      rsi = 100
    }
  }

  // Bollinger Bands (20-day SMA ± 2σ)
  let bollingerUpper: number | undefined
  let bollingerLower: number | undefined
  let bollingerMiddle: number | undefined
  if (closes.length >= 20) {
    const last20 = closes.slice(-20)
    bollingerMiddle = last20.reduce((a, b) => a + b, 0) / 20
    const bb_variance = last20.reduce((sum, c) => sum + Math.pow(c - bollingerMiddle!, 2), 0) / 20
    const bb_stdDev = Math.sqrt(bb_variance)
    bollingerUpper = bollingerMiddle + 2 * bb_stdDev
    bollingerLower = bollingerMiddle - 2 * bb_stdDev
  }

  // ATR (Average True Range) - 14 days
  let atr: number | undefined
  if (prices.length >= 15) {
    const trueRanges: number[] = []
    for (let i = 1; i < Math.min(15, prices.length); i++) {
      const high = prices[i].high
      const low = prices[i].low
      const prevClose = prices[i - 1].close
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
      trueRanges.push(tr)
    }
    atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length
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
    dailyReturns: returns.slice(-30).map((r) => r * 100),
    riskLevel,
  }
}

// Search stocks
export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const url = BRAPI_TOKEN
      ? `https://brapi.dev/api/available?search=${encodeURIComponent(query)}&token=${BRAPI_TOKEN}`
      : `https://brapi.dev/api/available?search=${encodeURIComponent(query)}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.stocks || []).slice(0, 20).map((s: string) => ({
      symbol: s,
      name: s,
    }))
  } catch (error) {
    console.error("[v0] Search error:", error)
    return []
  }
}
