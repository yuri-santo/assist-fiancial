"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts"
import { formatPercent } from "@/lib/utils/currency"
import type { RendaVariavel } from "@/lib/types"
import { motion } from "framer-motion"

interface VariacaoChartProps {
  ativos: RendaVariavel[]
}

export function VariacaoChart({ ativos }: VariacaoChartProps) {
  const data = ativos
    .filter((a) => a.variacao !== undefined)
    .sort((a, b) => (b.variacao || 0) - (a.variacao || 0))
    .slice(0, 10)
    .map((a) => ({
      ticker: a.ticker,
      variacao: a.variacao || 0,
    }))

  if (data.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Variacao do Dia</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">Variacao do Dia</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis dataKey="ticker" type="category" width={60} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                        <p className="font-bold">{item.ticker}</p>
                        <p className={`text-sm ${item.variacao >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {item.variacao >= 0 ? "+" : ""}
                          {formatPercent(item.variacao)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="variacao" radius={[0, 4, 4, 0]} animationDuration={1000}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.variacao >= 0 ? "#10b981" : "#ef4444"}
                    className={
                      entry.variacao >= 0
                        ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
