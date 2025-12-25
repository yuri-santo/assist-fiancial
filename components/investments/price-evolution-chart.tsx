"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid } from "recharts"
import { LineChart, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface PriceEvolutionChartProps {
  ticker: string
  precoMedio?: number
}

type RangeOption = "1mo" | "3mo" | "6mo" | "1y" | "2y"

const rangeOptions: { value: RangeOption; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1A" },
  { value: "2y", label: "2A" },
]

export function PriceEvolutionChart({ ticker, precoMedio }: PriceEvolutionChartProps) {
  const [range, setRange] = useState<RangeOption>("3mo")
  const [data, setData] = useState<{ date: string; price: number; precoMedio?: number; high: number; low: number }[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistorico = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/investments/historico?ticker=${ticker}&range=${range}`)
        if (response.ok) {
          const historico = await response.json()
          const chartData = historico.map((item: any) => ({
            date: new Date(item.date * 1000).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            }),
            fullDate: new Date(item.date * 1000).toLocaleDateString("pt-BR"),
            price: item.close,
            high: item.high,
            low: item.low,
            volume: item.volume,
            precoMedio: precoMedio,
          }))
          setData(chartData)
        }
      } catch (error) {
        console.error("[v0] Error fetching historico:", error)
      }
      setIsLoading(false)
    }

    fetchHistorico()
  }, [ticker, range, precoMedio])

  const minPrice =
    data.length > 0 ? Math.min(...data.map((d) => d.low), precoMedio || Number.POSITIVE_INFINITY) * 0.95 : 0
  const maxPrice = data.length > 0 ? Math.max(...data.map((d) => d.high), precoMedio || 0) * 1.05 : 100

  const lastPrice = data[data.length - 1]?.price || 0
  const firstPrice = data[0]?.price || 0
  const variacao = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0
  const isPositive = variacao >= 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Evolucao do Preco - {ticker}
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
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              Dados historicos nao disponiveis
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="mb-4 flex flex-wrap items-center gap-4 p-3 rounded-lg bg-background/30 border border-primary/10">
                <div>
                  <p className="text-xs text-muted-foreground">Ultimo preco</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(lastPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variacao no periodo</p>
                  <div
                    className={`flex items-center gap-1 text-xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {isPositive ? "+" : ""}
                    {variacao.toFixed(2)}%
                  </div>
                </div>
                {precoMedio && (
                  <div>
                    <p className="text-xs text-muted-foreground">Preco medio</p>
                    <p className="text-xl font-bold text-amber-400">{formatCurrency(precoMedio)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Maxima</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(Math.max(...data.map((d) => d.high)))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Minima</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatCurrency(Math.min(...data.map((d) => d.low)))}
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
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
                      strokeWidth={2}
                      label={{
                        value: `PM: R$${precoMedio.toFixed(2)}`,
                        position: "left",
                        fill: "#f59e0b",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                            <p className="text-xs text-muted-foreground mb-1">{item.fullDate}</p>
                            <p className="font-bold text-primary text-lg">{formatCurrency(item.price)}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                              <p className="text-muted-foreground">Max:</p>
                              <p className="text-emerald-400">{formatCurrency(item.high)}</p>
                              <p className="text-muted-foreground">Min:</p>
                              <p className="text-red-400">{formatCurrency(item.low)}</p>
                            </div>
                            {precoMedio && (
                              <p className="text-xs text-amber-400 mt-2">PM: {formatCurrency(precoMedio)}</p>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#00e5ff"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    name="Preco"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
