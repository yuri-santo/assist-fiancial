"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"
import { Target, CheckCircle2 } from "lucide-react"

interface GoalsProgressProps {
  objetivos: Array<{
    id: string
    nome: string
    valor_total: number
    valor_atual: number
    tipo: string
    cor: string
  }>
}

export function GoalsProgress({ objetivos }: GoalsProgressProps) {
  const sortedGoals = [...objetivos]
    .map((o) => ({
      ...o,
      progress: o.valor_total > 0 ? (o.valor_atual / o.valor_total) * 100 : 0,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Progresso dos Objetivos</CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {sortedGoals.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-muted-foreground">Nenhum objetivo cadastrado</p>
            </div>
          ) : (
            sortedGoals.map((objetivo, index) => (
              <motion.div
                key={objetivo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {objetivo.progress >= 100 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Target className="h-4 w-4" style={{ color: objetivo.cor }} />
                    )}
                    <span className="font-medium text-sm">{objetivo.nome}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(objetivo.valor_atual)} / {formatCurrency(objetivo.valor_total)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-background/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(objetivo.progress, 100)}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: objetivo.progress >= 100 ? "#10b981" : objetivo.cor,
                      boxShadow: `0 0 10px ${objetivo.progress >= 100 ? "#10b98160" : objetivo.cor + "60"}`,
                    }}
                  />
                </div>
                <p
                  className="text-xs text-right"
                  style={{ color: objetivo.progress >= 100 ? "#10b981" : objetivo.cor }}
                >
                  {objetivo.progress.toFixed(1)}% concluido
                </p>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
