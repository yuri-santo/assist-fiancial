"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface EvolucaoChartProps {
  data: { mes: string; patrimonio: number; investido: number }[]
}

export function EvolucaoChart({ data }: EvolucaoChartProps) {
  if (data.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Evolucao Patrimonial</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">Evolucao Patrimonial</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="patrimonioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="investidoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-card rounded-xl border border-primary/30 p-3 shadow-xl">
                        <p className="font-bold text-sm mb-2">{label}</p>
                        {payload.map((item, index) => (
                          <p key={index} className="text-sm" style={{ color: item.color }}>
                            {item.name}: {formatCurrency(item.value as number)}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="patrimonio"
                name="Patrimônio"
                stroke="#00e5ff"
                strokeWidth={2}
                fill="url(#patrimonioGradient)"
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="investido"
                name="Investido"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#investidoGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
