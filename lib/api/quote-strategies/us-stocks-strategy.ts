import type { QuoteStrategy, QuoteData } from "./quote-strategy.interface"

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ""
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || ""
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || ""

export class USStocksStrategy implements QuoteStrategy {
  name = "US Stocks"

  getPriority(): number {
    return 2
  }

  canHandle(ticker: string, assetType: "stock" | "crypto"): boolean {
    // Handle US stocks, ETFs, REITs
    return assetType === "stock" && !ticker.endsWith("4") && !ticker.endsWith("3")
  }

  async getQuote(ticker: string, assetType: "stock" | "crypto", currency: "BRL" | "USD"): Promise<QuoteData | null> {
    // Try Finnhub first
    let quote = await this.fetchFromFinnhub(ticker)
    if (quote) {
      return await this.convertIfNeeded(quote, currency)
    }

    // Try Twelve Data
    quote = await this.fetchFromTwelveData(ticker)
    if (quote) {
      return await this.convertIfNeeded(quote, currency)
    }

    // Try Alpha Vantage
    quote = await this.fetchFromAlphaVantage(ticker)
    if (quote) {
      return await this.convertIfNeeded(quote, currency)
    }

    console.log(`[v0] [US Stocks] All APIs failed for ${ticker}`)
    return null
  }

  async getHistoricalPrice(ticker: string, date: string, currency: "BRL" | "USD"): Promise<number | null> {
    // Use current price as fallback for US stocks
    const quote = await this.getQuote(ticker, "stock", currency)
    return quote?.price || null
  }

  private async fetchFromFinnhub(symbol: string): Promise<QuoteData | null> {
    if (!FINNHUB_API_KEY) return null

    try {
      console.log(`[v0] [Finnhub] Trying ${symbol}`)
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return null

      const data = await response.json()

      if (!data.c || data.c === 0) return null

      console.log(`[Finnhub] Success: ${symbol} = $${data.c}`)

      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        currency: "USD",
        source: "finnhub",
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`[Finnhub] Error:`, error)
      return null
    }
  }

  private async fetchFromTwelveData(symbol: string): Promise<QuoteData | null> {
    if (!TWELVE_DATA_KEY) return null

    try {
      console.log(`[Twelve Data] Trying ${symbol}`)
      const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return null

      const data = await response.json()

      if (!data.close || data.code === 429) return null

      console.log(`[Twelve Data] Success: ${symbol} = $${data.close}`)

      return {
        symbol: data.symbol,
        name: data.name || data.symbol,
        price: Number.parseFloat(data.close),
        change: Number.parseFloat(data.change),
        changePercent: Number.parseFloat(data.percent_change),
        currency: "USD",
        source: "twelvedata",
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`[Twelve Data] Error:`, error)
      return null
    }
  }

  private async fetchFromAlphaVantage(symbol: string): Promise<QuoteData | null> {
    if (!ALPHA_VANTAGE_KEY) return null

    try {
      console.log(`[Alpha Vantage] Trying ${symbol}`)
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) return null

      const data = await response.json()
      const quote = data["Global Quote"]

      if (!quote || !quote["05. price"]) return null

      console.log(`[Alpha Vantage] Success: ${symbol} = $${quote["05. price"]}`)

      return {
        symbol: quote["01. symbol"],
        name: quote["01. symbol"],
        price: Number.parseFloat(quote["05. price"]),
        change: Number.parseFloat(quote["09. change"]),
        changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
        currency: "USD",
        source: "alphavantage",
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`[Alpha Vantage] Error:`, error)
      return null
    }
  }

  private async convertIfNeeded(quote: QuoteData, targetCurrency: "BRL" | "USD"): Promise<QuoteData> {
    if (quote.currency === targetCurrency) {
      return quote
    }

    if (quote.currency === "USD" && targetCurrency === "BRL") {
      const rate = await this.getUSDtoBRL()
      return {
        ...quote,
        price: quote.price * rate,
        change: quote.change * rate,
        currency: "BRL",
      }
    }

    return quote
  }

  private async getUSDtoBRL(): Promise<number> {
    try {
      const BRAPI_BASE_URL = "https://brapi.dev/api"
      const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

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
          return Number.parseFloat(data.currency[0].bidPrice)
        }
      }
    } catch (error) {
      console.log("[US Stocks] USD/BRL fallback")
    }
    return 5.8
  }
}
