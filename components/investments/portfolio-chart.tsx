"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface PortfolioChartProps {
  data: { name: string; value: number; color: string }[]
  title: string
}

export function PortfolioChart({ data, title }: PortfolioChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum ativo cadastrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    className="drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    const percent = ((item.value / total) * 100).toFixed(1)
                    return (
                      <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                        <p className="font-medium" style={{ color: item.color }}>
                          {item.name}
                        </p>
                        <p className="text-sm text-foreground">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">{percent}% do total</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                wrapperStyle={{ paddingTop: "20px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold neon-text">{formatCurrency(total)}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
