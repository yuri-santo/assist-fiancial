"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface CashFlowChartProps {
  monthlyData: Array<{
    month: string
    despesas: number
    receitas: number
  }>
}

export function CashFlowChart({ monthlyData }: CashFlowChartProps) {
  const data = monthlyData.map((m) => ({
    ...m,
    saldo: m.receitas - m.despesas,
    acumulado: 0,
  }))

  // Calcular saldo acumulado
  let acumulado = 0
  data.forEach((d) => {
    acumulado += d.saldo
    d.acumulado = acumulado
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-card rounded-xl border border-primary/30 p-3 shadow-xl">
                        <p className="font-bold mb-2">{label}</p>
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
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo Mensal"
                stroke="#00e5ff"
                strokeWidth={3}
                dot={{ fill: "#00e5ff", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#00e5ff", strokeWidth: 2, fill: "#000" }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="acumulado"
                name="Acumulado"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
