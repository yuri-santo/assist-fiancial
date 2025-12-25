export interface QuoteStrategy {
  name: string
  getPriority(): number
  canHandle(ticker: string, assetType: "stock" | "crypto"): boolean
  getQuote(ticker: string, assetType: "stock" | "crypto", currency: "BRL" | "USD"): Promise<QuoteData | null>
  getHistoricalPrice(ticker: string, date: string, currency: "BRL" | "USD"): Promise<number | null>
}

export interface QuoteData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  source: string
  timestamp: number
}
