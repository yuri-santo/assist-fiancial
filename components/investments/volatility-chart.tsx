"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts"
import { Activity, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

interface VolatilityChartProps {
  dailyReturns: number[]
  volatility: number
  ticker: string
}

export function VolatilityChart({ dailyReturns, volatility, ticker }: VolatilityChartProps) {
  if (dailyReturns.length === 0) {
    return null
  }

  const data = dailyReturns.map((ret, i) => ({
    day: i + 1,
    retorno: ret,
  }))

  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-400" />
            Distribuicao de Retornos - {ticker}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <AlertTriangle
                className={`h-4 w-4 ${volatility > 30 ? "text-red-400" : volatility > 20 ? "text-amber-400" : "text-emerald-400"}`}
              />
              <span className="text-sm">
                Volatilidade: <span className="font-bold">{volatility.toFixed(1)}%</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Retorno medio:{" "}
              <span className={`font-bold ${avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {avgReturn >= 0 ? "+" : ""}
                {avgReturn.toFixed(2)}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="returnGradientPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="returnGradientNeg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value as number
                    return (
                      <div className="glass-card rounded-lg border border-primary/20 p-2">
                        <p className={`font-bold ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {value >= 0 ? "+" : ""}
                          {value.toFixed(2)}%
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area type="monotone" dataKey="retorno" stroke="#8b5cf6" strokeWidth={2} fill="url(#returnGradientPos)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
