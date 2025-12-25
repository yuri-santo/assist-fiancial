import { type NextRequest, NextResponse } from "next/server"
import { getHistorico } from "@/lib/api/brapi"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ticker = searchParams.get("ticker")
  const range = searchParams.get("range") as "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | undefined

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 })
  }

  const historico = await getHistorico(ticker, range || "1mo")
  return NextResponse.json(historico)
}
