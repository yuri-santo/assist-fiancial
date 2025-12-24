"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface PatrimonioChartProps {
  data: { name: string; value: number; color: string }[]
}

export function PatrimonioChart({ data }: PatrimonioChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Alocacao do Patrimonio</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">Alocacao do Patrimonio</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="relative">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                      className="drop-shadow-[0_0_10px_rgba(0,229,255,0.4)] hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      const percent = ((item.value / total) * 100).toFixed(1)
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card rounded-xl border border-primary/30 p-4 shadow-2xl"
                        >
                          <p className="font-bold text-lg" style={{ color: item.color }}>
                            {item.name}
                          </p>
                          <p className="text-xl font-bold text-foreground">{formatCurrency(item.value)}</p>
                          <p className="text-sm text-muted-foreground">{percent}% do patrimonio</p>
                        </motion.div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-2xl font-bold neon-text"
              >
                {formatCurrency(total)}
              </motion.p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-2"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }}
                />
                <span className="text-sm">{item.name}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
