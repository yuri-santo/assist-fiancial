"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart,
  Area,
} from "recharts"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface AnnualSummaryChartProps {
  data: Array<{
    month: string
    receitas: number
    despesas: number
    saldo: number
  }>
  ano: number
}

export function AnnualSummaryChart({ data, ano }: AnnualSummaryChartProps) {
  const totalReceitas = data.reduce((sum, d) => sum + d.receitas, 0)
  const totalDespesas = data.reduce((sum, d) => sum + d.despesas, 0)
  const saldoAnual = totalReceitas - totalDespesas
  const mediaReceitas = totalReceitas / Math.max(data.length, 1)
  const mediaDespesas = totalDespesas / Math.max(data.length, 1)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle flex items-center justify-between">
            <span>Resumo Anual - {ano}</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <span className="text-emerald-400">Receitas: {formatCurrency(totalReceitas)}</span>
              <span className="text-red-400">Despesas: {formatCurrency(totalDespesas)}</span>
              <span className={saldoAnual >= 0 ? "text-primary" : "text-amber-400"}>
                Saldo: {saldoAnual >= 0 ? "+" : ""}
                {formatCurrency(saldoAnual)}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="receitasGradAnnual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="despesasGradAnnual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="saldoGradAnnual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const rec = (payload.find((p) => p.dataKey === "receitas")?.value as number) || 0
                    const desp = (payload.find((p) => p.dataKey === "despesas")?.value as number) || 0
                    const saldo = rec - desp
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card rounded-xl border border-primary/30 p-4 shadow-2xl"
                      >
                        <p className="font-bold mb-2">{label}</p>
                        <p className="text-emerald-400">Receitas: {formatCurrency(rec)}</p>
                        <p className="text-red-400">Despesas: {formatCurrency(desp)}</p>
                        <p className={`font-bold mt-1 ${saldo >= 0 ? "text-primary" : "text-amber-400"}`}>
                          Saldo: {saldo >= 0 ? "+" : ""}
                          {formatCurrency(saldo)}
                        </p>
                      </motion.div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo Acumulado"
                fill="url(#saldoGradAnnual)"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Bar dataKey="receitas" name="Receitas" fill="url(#receitasGradAnnual)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="url(#despesasGradAnnual)" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey={() => mediaReceitas}
                name="Media Receitas"
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={() => mediaDespesas}
                name="Media Despesas"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground">Media Receitas/Mes</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(mediaReceitas)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-muted-foreground">Media Despesas/Mes</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(mediaDespesas)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Media Sobra/Mes</p>
              <p
                className={`text-lg font-bold ${mediaReceitas - mediaDespesas >= 0 ? "text-primary" : "text-amber-400"}`}
              >
                {formatCurrency(mediaReceitas - mediaDespesas)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-muted-foreground">Taxa de Economia</p>
              <p className="text-lg font-bold text-purple-400">
                {totalReceitas > 0 ? ((saldoAnual / totalReceitas) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
