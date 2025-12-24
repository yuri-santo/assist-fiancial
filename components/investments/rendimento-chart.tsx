"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import type { RendaFixa } from "@/lib/types"
import { motion } from "framer-motion"

interface RendimentoChartProps {
  investimentos: RendaFixa[]
}

export function RendimentoChart({ investimentos }: RendimentoChartProps) {
  const data = investimentos
    .filter((inv) => inv.rendimento !== undefined)
    .sort((a, b) => (b.rendimento || 0) - (a.rendimento || 0))
    .slice(0, 8)
    .map((inv) => ({
      nome: inv.nome.length > 15 ? inv.nome.substring(0, 15) + "..." : inv.nome,
      rendimento: inv.rendimento || 0,
      percent: inv.rendimento_percent || 0,
    }))

  if (data.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Rendimento por Aplicacao</CardTitle>
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">Rendimento por Aplicacao</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => formatCurrency(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis dataKey="nome" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                        <p className="font-bold">{item.nome}</p>
                        <p className="text-sm text-emerald-400">+{formatCurrency(item.rendimento)}</p>
                        <p className="text-xs text-muted-foreground">+{formatPercent(item.percent)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="rendimento" radius={[0, 4, 4, 0]} animationDuration={1000}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
