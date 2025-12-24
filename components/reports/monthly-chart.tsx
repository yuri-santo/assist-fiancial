"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface MonthlyChartProps {
  data: Array<{
    month: string
    despesas: number
    receitas: number
  }>
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Evolucao Mensal</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <defs>
                <linearGradient id="receitasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="despesasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card rounded-xl border border-primary/30 p-4 shadow-2xl"
                      >
                        <p className="font-bold mb-2">{label}</p>
                        {payload.map((item, index) => (
                          <p
                            key={index}
                            className="flex items-center gap-2"
                            style={{ color: item.name === "Receitas" ? "#10b981" : "#ef4444" }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}: {formatCurrency(item.value as number)}
                          </p>
                        ))}
                      </motion.div>
                    )
                  }
                  return null
                }}
              />
              <Legend formatter={(value) => <span className="text-sm">{value}</span>} />
              <Bar
                dataKey="receitas"
                name="Receitas"
                fill="url(#receitasGrad)"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              />
              <Bar
                dataKey="despesas"
                name="Despesas"
                fill="url(#despesasGrad)"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
                className="drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
