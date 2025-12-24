"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts"
import { motion } from "framer-motion"

interface FinancialHealthChartProps {
  data: {
    economia: number
    despesasFixas: number
    despesasVariaveis: number
    investimentos: number
    reserva: number
  }
  totalReceitas: number
}

export function FinancialHealthChart({ data, totalReceitas }: FinancialHealthChartProps) {
  const chartData = [
    {
      name: "Economia",
      value: Math.min(data.economia, 100),
      fill: data.economia >= 20 ? "#10b981" : "#f59e0b",
      meta: 20,
    },
    {
      name: "Investimentos",
      value: totalReceitas > 0 ? Math.min((data.investimentos / totalReceitas) * 100, 100) : 0,
      fill: "#3b82f6",
      meta: 30,
    },
    {
      name: "Reserva",
      value: totalReceitas > 0 ? Math.min((data.reserva / totalReceitas) * 100, 100) : 0,
      fill: "#8b5cf6",
      meta: 10,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Saude Financeira</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="30%"
              outerRadius="90%"
              barSize={20}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: "hsl(var(--muted) / 0.3)" }}
                dataKey="value"
                cornerRadius={10}
                animationDuration={1500}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="glass-card rounded-xl border border-primary/30 p-3 shadow-xl">
                        <p className="font-bold" style={{ color: item.fill }}>
                          {item.name}
                        </p>
                        <p className="text-sm">Atual: {item.value.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Meta: {item.meta}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {chartData.map((item) => (
              <div key={item.name} className="space-y-1">
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: item.fill, boxShadow: `0 0 8px ${item.fill}80` }}
                />
                <p className="text-xs font-medium">{item.name}</p>
                <p className="text-lg font-bold" style={{ color: item.fill }}>
                  {item.value.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Meta: {item.meta}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
