"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts"
import { CandlestickChartIcon as CandlestickIcon, Loader2, Volume2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface CandlestickChartProps {
  ticker: string
  precoMedio?: number
}

type RangeOption = "1mo" | "3mo" | "6mo" | "1y"

const rangeOptions: { value: RangeOption; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1A" },
]

interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  isUp: boolean
  body: [number, number]
  wick: [number, number]
}

export function CandlestickChart({ ticker, precoMedio }: CandlestickChartProps) {
  const [range, setRange] = useState<RangeOption>("1mo")
  const [data, setData] = useState<CandleData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistorico = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/investments/historico?ticker=${ticker}&range=${range}`)
        if (response.ok) {
          const historico = await response.json()
          const chartData: CandleData[] = historico.map((item: any) => {
            const isUp = item.close >= item.open
            return {
              date: new Date(item.date * 1000).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              }),
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume,
              isUp,
              body: isUp ? [item.open, item.close] : [item.close, item.open],
              wick: [item.low, item.high],
            }
          })
          setData(chartData)
        }
      } catch (error) {
        console.error("[v0] Error fetching candlestick data:", error)
      }
      setIsLoading(false)
    }

    fetchHistorico()
  }, [ticker, range])

  const minPrice = data.length > 0 ? Math.min(...data.map((d) => d.low)) * 0.98 : 0
  const maxPrice = data.length > 0 ? Math.max(...data.map((d) => d.high)) * 1.02 : 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CandlestickIcon className="h-4 w-4 text-amber-400" />
            Grafico OHLC - {ticker}
          </CardTitle>
          <div className="flex gap-1">
            {rangeOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={range === opt.value ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs ${range === opt.value ? "neon-glow" : ""}`}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="relative">
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Dados nao disponiveis</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value.toFixed(0)}`}
                  domain={[minPrice, maxPrice]}
                  orientation="right"
                />
                {precoMedio && (
                  <ReferenceLine
                    y={precoMedio}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    label={{
                      value: `PM: R$${precoMedio.toFixed(2)}`,
                      position: "left",
                      fill: "#f59e0b",
                      fontSize: 10,
                    }}
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as CandleData
                      return (
                        <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                          <p className="font-bold mb-2">{item.date}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p className="text-muted-foreground">Abertura:</p>
                            <p className="text-right">{formatCurrency(item.open)}</p>
                            <p className="text-muted-foreground">Maxima:</p>
                            <p className="text-right text-emerald-400">{formatCurrency(item.high)}</p>
                            <p className="text-muted-foreground">Minima:</p>
                            <p className="text-right text-red-400">{formatCurrency(item.low)}</p>
                            <p className="text-muted-foreground">Fechamento:</p>
                            <p className={`text-right font-bold ${item.isUp ? "text-emerald-400" : "text-red-400"}`}>
                              {formatCurrency(item.close)}
                            </p>
                            <p className="text-muted-foreground">Volume:</p>
                            <p className="text-right">{(item.volume / 1000000).toFixed(2)}M</p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Candlestick bodies */}
                <Bar dataKey="body" barSize={8}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`body-${index}`}
                      fill={entry.isUp ? "#10b981" : "#ef4444"}
                      stroke={entry.isUp ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Volume subplot */}
          {data.length > 0 && !isLoading && (
            <div className="mt-2 border-t border-primary/10 pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Volume2 className="h-3 w-3" />
                Volume
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <ComposedChart data={data}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Bar dataKey="volume" barSize={6}>
                    {data.map((entry, index) => (
                      <Cell key={`vol-${index}`} fill={entry.isUp ? "#10b98140" : "#ef444440"} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
