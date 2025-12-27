import type { QuoteStrategy, QuoteData } from "./quote-strategy.interface"

const BRAPI_BASE_URL = "https://brapi.dev/api"
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

export class CryptoStrategy implements QuoteStrategy {
  name = "Crypto (Brapi v2)"

  getPriority(): number {
    return 1
  }

  canHandle(ticker: string, assetType: "stock" | "crypto"): boolean {
    return assetType === "crypto"
  }

  async getQuote(ticker: string, assetType: "stock" | "crypto", currency: "BRL" | "USD"): Promise<QuoteData | null> {
    try {
      const cleanCoin = ticker.replace(/-USD|-BRL/gi, "").toUpperCase()

      console.log(`[Crypto] Fetching ${cleanCoin} in USD first`)

      const url = `${BRAPI_BASE_URL}/v2/crypto?coin=${cleanCoin}&currency=USD`

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${BRAPI_TOKEN}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.log(`[Crypto] Brapi error ${response.status}`)
        return null
      }

      const data = await response.json()

      if (!data.coins || data.coins.length === 0) {
        console.log(`[Crypto] No data for ${cleanCoin}`)
        return null
      }

      const cryptoData = data.coins[0]
      let price = cryptoData.regularMarketPrice
      let change = cryptoData.regularMarketChange

      if (currency === "BRL") {
        const usdToBrl = await this.getUSDtoBRL()
        price = cryptoData.regularMarketPrice * usdToBrl
        change = cryptoData.regularMarketChange * usdToBrl

        console.log(
          `[Crypto] ${cleanCoin}: ${cryptoData.regularMarketPrice} USD → ${price.toFixed(2)} BRL (taxa: ${usdToBrl})`,
        )
      } else {
        console.log(`[Crypto] ${cleanCoin}: ${price} USD`)
      }

      return {
        symbol: cleanCoin,
        name: cryptoData.coinName,
        price,
        change,
        changePercent: cryptoData.regularMarketChangePercent,
        currency,
        source: "brapi-crypto",
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error(`[Crypto] Exception:`, error)
      return null
    }
  }

  async getHistoricalPrice(ticker: string, date: string, currency: "BRL" | "USD"): Promise<number | null> {
    const targetDate = new Date(date)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 7) {
      console.log(`[Crypto] Using current price for recent date (${daysDiff} days ago)`)
      const quote = await this.getQuote(ticker, "crypto", currency)
      return quote?.price || null
    }

    // Brapi não oferece histórico de crypto, usar preço atual como fallback
    console.log(`[Crypto] Historical data not available, using current price`)
    const quote = await this.getQuote(ticker, "crypto", currency)
    return quote?.price || null
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
          const rate = Number.parseFloat(data.currency[0].bidPrice)
          console.log(`[Crypto] USD/BRL rate: ${rate}`)
          return rate
        }
      }
    } catch (error) {
      console.log("[Crypto] Failed to get USD/BRL, using fallback")
    }
    return 5.8
  }
}
