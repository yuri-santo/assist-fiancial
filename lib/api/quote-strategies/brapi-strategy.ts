import type { QuoteStrategy, QuoteData } from "./quote-strategy.interface"

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

export class BrapiStrategy implements QuoteStrategy {
  name = "Brapi"

  getPriority(): number {
    return 1 // Alta prioridade
  }

  canHandle(ticker: string, assetType: "stock" | "crypto"): boolean {
    // Brapi funciona para ações brasileiras e algumas internacionais
    return assetType === "stock"
  }

  async getQuote(ticker: string, assetType: "stock" | "crypto", currency: "BRL" | "USD"): Promise<QuoteData | null> {
    try {
      console.log(`[v0] [Brapi] Fetching ${ticker}`)

      const url = `${BRAPI_BASE_URL}/quote/${ticker.toUpperCase()}?fundamental=false`
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.log(`[v0] [Brapi] Error ${response.status}`)
        return null
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        console.log(`[v0] [Brapi] No results for ${ticker}`)
        return null
      }

      const result = data.results[0]

      // Se está em USD mas precisa BRL, converter
      let price = result.regularMarketPrice
      let change = result.regularMarketChange

      if (result.currency === "USD" && currency === "BRL") {
        const usdRate = await this.getUSDtoBRL()
        price *= usdRate
        change *= usdRate
      }

      console.log(`[v0] [Brapi] Success: ${ticker} = ${price} ${currency}`)

      return {
        symbol: result.symbol,
        name: result.shortName || result.symbol,
        price,
        change,
        changePercent: result.regularMarketChangePercent,
        currency: currency,
        source: "brapi",
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`[v0] [Brapi] Exception:`, error)
      return null
    }
  }

  async getHistoricalPrice(ticker: string, date: string, currency: "BRL" | "USD"): Promise<number | null> {
    try {
      const targetDate = new Date(date)
      const startTimestamp = Math.floor(targetDate.getTime() / 1000)
      const endDate = new Date(targetDate)
      endDate.setDate(endDate.getDate() + 1)
      const endTimestamp = Math.floor(endDate.getTime() / 1000)

      console.log(`[v0] [Brapi] Fetching historical ${ticker} on ${date}`)

      const cleanTicker = ticker.replace(".SA", "").toUpperCase()
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.SA?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.chart?.result?.[0]
        if (result) {
          const quote = result.indicators?.quote?.[0]
          const closePrice = quote?.close?.[0]
          if (closePrice && closePrice > 0) {
            console.log(`[v0] [Brapi] Historical price found: ${closePrice}`)
            return closePrice
          }
        }
      }

      return null
    } catch (error) {
      console.error(`[v0] [Brapi] Historical error:`, error)
      return null
    }
  }

  private async getUSDtoBRL(): Promise<number> {
    try {
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
      console.log("[v0] [Brapi] USD/BRL fallback")
    }
    return 5.8 // Fallback
  }
}
