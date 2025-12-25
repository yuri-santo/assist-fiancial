"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { LineChart, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { BrapiHistoricalPrice } from "@/lib/api/brapi"

interface PriceEvolutionChartProps {
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

export function PriceEvolutionChart({ ticker, precoMedio }: PriceEvolutionChartProps) {
  const [range, setRange] = useState<RangeOption>("1mo")
  const [data, setData] = useState<{ date: string; price: number; precoMedio?: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistorico = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/investments/historico?ticker=${ticker}&range=${range}`)
        if (response.ok) {
          const historico: BrapiHistoricalPrice[] = await response.json()
          const chartData = historico.map((item) => ({
            date: new Date(item.date * 1000).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            }),
            price: item.close,
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

  const minPrice = Math.min(...data.map((d) => d.price), precoMedio || Number.POSITIVE_INFINITY) * 0.95
  const maxPrice = Math.max(...data.map((d) => d.price), precoMedio || 0) * 1.05

  const lastPrice = data[data.length - 1]?.price || 0
  const firstPrice = data[0]?.price || 0
  const variacao = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
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
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Dados historicos nao disponiveis
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ultimo preco</p>
                <p className="text-xl font-bold">{formatCurrency(lastPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variacao no periodo</p>
                <p className={`text-xl font-bold ${variacao >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {variacao >= 0 ? "+" : ""}
                  {variacao.toFixed(2)}%
                </p>
              </div>
              {precoMedio && (
                <div>
                  <p className="text-sm text-muted-foreground">Preco medio</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(precoMedio)}</p>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value.toFixed(0)}`}
                  domain={[minPrice, maxPrice]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-card rounded-lg border border-primary/20 p-3">
                          <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                          <p className="font-semibold text-primary">{formatCurrency(payload[0].value as number)}</p>
                          {precoMedio && <p className="text-xs text-amber-400">PM: {formatCurrency(precoMedio)}</p>}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {precoMedio && (
                  <Area
                    type="monotone"
                    dataKey="precoMedio"
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    fill="none"
                    name="Preço Médio"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#00e5ff"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  name="Preço"
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
