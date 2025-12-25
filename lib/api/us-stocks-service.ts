// Serviço para buscar ações americanas (stocks, ETFs, REITs)
// Usa múltiplas APIs gratuitas com fallback

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ""
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || ""
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || ""
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || ""

const stockCache = new Map<string, { data: USStockQuote; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

export interface USStockQuote {
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
  currency: string
  source: "finnhub" | "alphavantage" | "twelvedata" | "brapi" | "yahoo"
}

async function fetchFromFinnhub(symbol: string): Promise<USStockQuote | null> {
  if (!FINNHUB_API_KEY) return null

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()

    if (!data.c || data.c === 0) return null

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      volume: 0,
      currency: "USD",
      source: "finnhub",
    }
  } catch {
    return null
  }
}

async function fetchFromTwelveData(symbol: string): Promise<USStockQuote | null> {
  if (!TWELVE_DATA_KEY) return null

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json()

    if (!data.close || data.code === 429) return null

    return {
      symbol: data.symbol,
      name: data.name || data.symbol,
      price: Number.parseFloat(data.close),
      change: Number.parseFloat(data.change),
      changePercent: Number.parseFloat(data.percent_change),
      high: Number.parseFloat(data.high),
      low: Number.parseFloat(data.low),
      open: Number.parseFloat(data.open),
      previousClose: Number.parseFloat(data.previous_close),
      volume: Number.parseInt(data.volume),
      currency: "USD",
      source: "twelvedata",
    }
  } catch {
    return null
  }
}

async function fetchFromAlphaVantage(symbol: string): Promise<USStockQuote | null> {
  if (!ALPHA_VANTAGE_KEY) return null

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const quote = data["Global Quote"]

    if (!quote || !quote["05. price"]) return null

    return {
      symbol: quote["01. symbol"],
      name: quote["01. symbol"],
      price: Number.parseFloat(quote["05. price"]),
      change: Number.parseFloat(quote["09. change"]),
      changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
      high: Number.parseFloat(quote["03. high"]),
      low: Number.parseFloat(quote["04. low"]),
      open: Number.parseFloat(quote["02. open"]),
      previousClose: Number.parseFloat(quote["08. previous close"]),
      volume: Number.parseInt(quote["06. volume"]),
      currency: "USD",
      source: "alphavantage",
    }
  } catch {
    return null
  }
}

async function fetchFromBrapi(symbol: string): Promise<USStockQuote | null> {
  if (!BRAPI_TOKEN) return null

  try {
    const url = `https://brapi.dev/api/quote/${symbol}`

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${BRAPI_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) return null

    const data = await response.json()

    if (!data.results || data.results.length === 0) return null

    const result = data.results[0]

    return {
      symbol: result.symbol,
      name: result.shortName || result.symbol,
      price: result.regularMarketPrice,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      high: result.regularMarketDayHigh,
      low: result.regularMarketDayLow,
      open: result.regularMarketOpen || result.regularMarketPrice,
      previousClose: result.regularMarketPreviousClose,
      volume: result.regularMarketVolume,
      currency: result.currency || "USD",
      source: "brapi",
    }
  } catch {
    return null
  }
}

export async function getUSStockQuote(symbol: string): Promise<USStockQuote | null> {
  const cached = stockCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Try all sources in order
  let quote = await fetchFromFinnhub(symbol)
  if (!quote) quote = await fetchFromTwelveData(symbol)
  if (!quote) quote = await fetchFromBrapi(symbol)
  if (!quote) quote = await fetchFromAlphaVantage(symbol)

  if (quote) {
    stockCache.set(symbol, { data: quote, timestamp: Date.now() })
  }

  return quote
}

export async function searchUSStocks(query: string): Promise<{ symbol: string; name: string; type: string }[]> {
  // Lista estática de ETFs e REITs populares
  const popularAssets = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETF" },
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF" },
    { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF" },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "ETF" },
    { symbol: "IWM", name: "iShares Russell 2000 ETF", type: "ETF" },
    { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF", type: "ETF" },
    { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", type: "ETF" },
    { symbol: "AAPL", name: "Apple Inc.", type: "Stock" },
    { symbol: "MSFT", name: "Microsoft Corporation", type: "Stock" },
    { symbol: "GOOGL", name: "Alphabet Inc.", type: "Stock" },
    { symbol: "AMZN", name: "Amazon.com Inc.", type: "Stock" },
    { symbol: "TSLA", name: "Tesla Inc.", type: "Stock" },
    { symbol: "NVDA", name: "NVIDIA Corporation", type: "Stock" },
    { symbol: "META", name: "Meta Platforms Inc.", type: "Stock" },
    { symbol: "NFLX", name: "Netflix Inc.", type: "Stock" },
    { symbol: "NKE", name: "Nike Inc.", type: "Stock" },
    { symbol: "O", name: "Realty Income Corporation", type: "REIT" },
    { symbol: "PLD", name: "Prologis Inc.", type: "REIT" },
    { symbol: "AMT", name: "American Tower Corporation", type: "REIT" },
    { symbol: "EQIX", name: "Equinix Inc.", type: "REIT" },
    { symbol: "PSA", name: "Public Storage", type: "REIT" },
  ]

  const filtered = popularAssets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
      asset.name.toLowerCase().includes(query.toLowerCase()),
  )

  return filtered.slice(0, 20)
}
