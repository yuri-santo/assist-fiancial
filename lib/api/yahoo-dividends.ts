// Yahoo chart endpoint can return dividend events (when available).
// We use it as a best-effort provider for a "sync" button.
// NOTE: For B3, dividend events can be incomplete; user can ajustar manualmente.

export interface YahooDividendEvent {
  ticker: string
  date: string // YYYY-MM-DD
  amount: number
  raw: unknown
  source: string
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase()
}

async function fetchChart(symbol: string, range: string): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${encodeURIComponent(
    range,
  )}&events=div`

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "application/json",
    },
  })
  if (!res.ok) return null
  return res.json()
}

function parseDividendEvents(data: any, ticker: string): YahooDividendEvent[] {
  const result = data?.chart?.result?.[0]
  const divs = result?.events?.dividends
  if (!divs || typeof divs !== "object") return []

  const out: YahooDividendEvent[] = []
  for (const key of Object.keys(divs)) {
    const ev = divs[key]
    const ts = Number(ev?.date)
    const amount = Number(ev?.amount)
    if (!isFinite(ts) || !isFinite(amount) || amount <= 0) continue
    const d = new Date(ts * 1000)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(d.getUTCDate()).padStart(2, "0")
    out.push({
      ticker,
      date: `${yyyy}-${mm}-${dd}`,
      amount,
      raw: ev,
      source: "Yahoo Finance",
    })
  }
  return out.sort((a, b) => (a.date > b.date ? 1 : -1))
}

export async function fetchYahooDividends(ticker: string, range: string = "2y"): Promise<YahooDividendEvent[]> {
  const t = normalizeTicker(ticker)

  // tenta Brasil (.SA) e depois EUA (sem sufixo)
  const candidates = t.endsWith(".SA") ? [t] : [`${t}.SA`, t]

  for (const symbol of candidates) {
    try {
      const data = await fetchChart(symbol, range)
      if (!data) continue
      const events = parseDividendEvents(data, t)
      if (events.length > 0) return events
    } catch {
      // ignore
    }
  }

  return []
}
