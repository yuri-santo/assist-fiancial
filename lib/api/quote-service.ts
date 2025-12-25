import { BrapiStrategy } from "./quote-strategies/brapi-strategy"
import { CryptoStrategy } from "./quote-strategies/crypto-strategy"
import { USStocksStrategy } from "./quote-strategies/us-stocks-strategy"
import type { QuoteStrategy, QuoteData } from "./quote-strategies/quote-strategy.interface"

class QuoteService {
  private strategies: QuoteStrategy[] = []

  constructor() {
    this.strategies = [new CryptoStrategy(), new BrapiStrategy(), new USStocksStrategy()]
    this.strategies.sort((a, b) => a.getPriority() - b.getPriority())
  }

  async getQuote(
    ticker: string,
    assetType: "stock" | "crypto",
    currency: "BRL" | "USD" = "BRL",
  ): Promise<QuoteData | null> {
    console.log(`[v0] [QuoteService] Getting quote for ${ticker} (${assetType}) in ${currency}`)

    for (const strategy of this.strategies) {
      if (strategy.canHandle(ticker, assetType)) {
        console.log(`[v0] [QuoteService] Trying strategy: ${strategy.name}`)
        const quote = await strategy.getQuote(ticker, assetType, currency)
        if (quote) {
          console.log(`[v0] [QuoteService] ✓ Success with ${strategy.name}`)
          return quote
        }
        console.log(`[v0] [QuoteService] ✗ ${strategy.name} failed, trying next...`)
      }
    }

    console.error(`[v0] [QuoteService] All strategies failed for ${ticker}`)
    return null
  }

  async getHistoricalPrice(
    ticker: string,
    date: string,
    assetType: "stock" | "crypto",
    currency: "BRL" | "USD" = "BRL",
  ): Promise<number | null> {
    console.log(`[v0] [QuoteService] Getting historical price for ${ticker} on ${date}`)

    for (const strategy of this.strategies) {
      if (strategy.canHandle(ticker, assetType)) {
        const price = await strategy.getHistoricalPrice(ticker, date, currency)
        if (price) {
          console.log(`[v0] [QuoteService] ✓ Historical price from ${strategy.name}: ${price}`)
          return price
        }
      }
    }

    console.log(`[v0] [QuoteService] Historical price not found, trying current price`)
    const currentQuote = await this.getQuote(ticker, assetType, currency)
    if (currentQuote) {
      console.log(`[v0] [QuoteService] Using current price as fallback: ${currentQuote.price}`)
      return currentQuote.price
    }

    return null
  }
}

export const quoteService = new QuoteService()
