import { type NextRequest, NextResponse } from "next/server"
import { getHistoricalPrices, calculateIndicators } from "@/lib/api/stock-service"

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"] as const
type ValidRange = (typeof VALID_RANGES)[number]

function isValidRange(range: string): range is ValidRange {
  return VALID_RANGES.includes(range as ValidRange)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ticker = searchParams.get("ticker")
    const range = searchParams.get("range")
    const withIndicators = searchParams.get("indicators") === "true"

    if (!ticker || ticker.trim() === "") {
      return NextResponse.json({ error: "Ticker is required" }, { status: 400 })
    }

    const sanitizedTicker = ticker.trim().toUpperCase()

    if (!/^[A-Z0-9.]+$/.test(sanitizedTicker)) {
      return NextResponse.json({ error: "Invalid ticker format" }, { status: 400 })
    }

    const rangeMap: Record<string, "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"> = {
      "1d": "1mo",
      "5d": "1mo",
      "1mo": "1mo",
      "3mo": "3mo",
      "6mo": "6mo",
      "1y": "1y",
      "2y": "2y",
      "5y": "5y",
    }

    const validatedRange = range && isValidRange(range) ? rangeMap[range] : "1mo"
    const historico = await getHistoricalPrices(sanitizedTicker, validatedRange)

    if (withIndicators && historico.length > 0) {
      const indicators = calculateIndicators(historico)
      return NextResponse.json({
        historico: historico.map((h) => ({
          ...h,
          date: h.date.getTime() / 1000, // Convert to timestamp for frontend
        })),
        indicators,
      })
    }

    // Return in timestamp format for compatibility
    return NextResponse.json(
      historico.map((h) => ({
        date: h.date.getTime() / 1000,
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume,
        adjustedClose: h.adjustedClose,
      })),
    )
  } catch (error) {
    console.error("[v0] Error in historico route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
