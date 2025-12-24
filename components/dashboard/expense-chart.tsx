"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { Despesa, Categoria } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"

interface ExpenseChartProps {
  despesas: Despesa[]
  categorias: Categoria[]
}

export function ExpenseChart({ despesas, categorias }: ExpenseChartProps) {
  const categoryTotals = despesas.reduce(
    (acc, despesa) => {
      const categoryId = despesa.categoria_id || "outros"
      acc[categoryId] = (acc[categoryId] || 0) + despesa.valor
      return acc
    },
    {} as Record<string, number>,
  )

  const data = Object.entries(categoryTotals)
    .map(([categoryId, value]) => {
      const categoria = categorias.find((c) => c.id === categoryId)
      return {
        name: categoria?.nome || "Outros",
        value,
        color: categoria?.cor || "#6b7280",
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Nenhuma despesa registrada</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
