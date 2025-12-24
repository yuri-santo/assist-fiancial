"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import type { Despesa, Categoria } from "@/lib/types"
import { motion } from "framer-motion"

interface CategoryBreakdownProps {
  despesas: Despesa[]
  categorias: Categoria[]
}

export function CategoryBreakdown({ despesas, categorias }: CategoryBreakdownProps) {
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)

  const categoryTotals = despesas.reduce(
    (acc, despesa) => {
      const categoryId = despesa.categoria_id || "outros"
      acc[categoryId] = (acc[categoryId] || 0) + despesa.valor
      return acc
    },
    {} as Record<string, number>,
  )

  const sortedCategories = Object.entries(categoryTotals)
    .map(([categoryId, value]) => {
      const categoria = categorias.find((c) => c.id === categoryId)
      return {
        id: categoryId,
        name: categoria?.nome || "Outros",
        value,
        color: categoria?.cor || "#6b7280",
        percentage: totalDespesas > 0 ? (value / totalDespesas) * 100 : 0,
      }
    })
    .sort((a, b) => b.value - a.value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {sortedCategories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma despesa no periodo</p>
          ) : (
            <div className="space-y-4">
              {sortedCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: category.color,
                          boxShadow: `0 0 8px ${category.color}80`,
                        }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(category.value)}</span>
                      <span className="ml-2 text-muted-foreground">({category.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${category.percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: category.color,
                        boxShadow: `0 0 10px ${category.color}60`,
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
