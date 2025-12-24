"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"
import { TrendingUp, Landmark } from "lucide-react"

interface InvestmentsOverviewProps {
  rendaVariavel: number
  rendaFixa: number
  total: number
}

export function InvestmentsOverview({ rendaVariavel, rendaFixa, total }: InvestmentsOverviewProps) {
  const data = [
    { name: "Renda Variável", value: rendaVariavel, color: "#3b82f6" },
    { name: "Renda Fixa", value: rendaFixa, color: "#10b981" },
  ].filter((d) => d.value > 0)

  const percentRV = total > 0 ? (rendaVariavel / total) * 100 : 0
  const percentRF = total > 0 ? (rendaFixa / total) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Visao de Investimentos</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {total === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-muted-foreground">Nenhum investimento cadastrado</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={1200}
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload
                          return (
                            <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                              <p className="font-bold" style={{ color: item.color }}>
                                {item.name}
                              </p>
                              <p className="text-sm">{formatCurrency(item.value)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Renda Variavel</p>
                    <p className="text-lg font-bold">{formatCurrency(rendaVariavel)}</p>
                    <p className="text-xs text-blue-400">{percentRV.toFixed(1)}% do total</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Landmark className="h-8 w-8 text-emerald-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Renda Fixa</p>
                    <p className="text-lg font-bold">{formatCurrency(rendaFixa)}</p>
                    <p className="text-xs text-emerald-400">{percentRF.toFixed(1)}% do total</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
