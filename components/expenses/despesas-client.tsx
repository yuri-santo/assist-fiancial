"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownCircle, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { getMonthRangeFromDate } from "@/lib/utils/date"
import type { Despesa, Categoria, Cartao } from "@/lib/types"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { MonthSelector } from "@/components/ui/month-selector"
import { motion, AnimatePresence } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface DespesasClientProps {
  despesas: Despesa[]
  categorias: Categoria[]
  cartoes: Cartao[]
  userId: string
}

const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"]

export function DespesasClient({ despesas, categorias, cartoes, userId }: DespesasClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  // Filter expenses by selected month
  const filteredDespesas = useMemo(() => {
    const { start, end } = getMonthRangeFromDate(currentDate)
    return despesas.filter((d) => {
      const date = d.data.split("T")[0]
      return date >= start && date <= end
    })
  }, [despesas, currentDate])

  // Calculate previous month for comparison
  const previousMonthDespesas = useMemo(() => {
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const { start, end } = getMonthRangeFromDate(prevDate)
    return despesas.filter((d) => {
      const date = d.data.split("T")[0]
      return date >= start && date <= end
    })
  }, [despesas, currentDate])

  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0)
  const totalPreviousMonth = previousMonthDespesas.reduce((sum, d) => sum + d.valor, 0)
  const percentageChange =
    totalPreviousMonth > 0 ? ((totalDespesas - totalPreviousMonth) / totalPreviousMonth) * 100 : 0

  // Group by category for chart
  const categoryData = useMemo(() => {
    const grouped = filteredDespesas.reduce(
      (acc, d) => {
        const catName = d.categoria?.nome || "Sem categoria"
        acc[catName] = (acc[catName] || 0) + d.valor
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredDespesas])

  // Average daily expense
  const avgDaily = filteredDespesas.length > 0 ? totalDespesas / 30 : 0

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text">Despesas</h1>
          <p className="text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCurrentMonth={handleCurrentMonth}
          />
          <AddExpenseDialog userId={userId} categorias={categorias} cartoes={cartoes} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
              <ArrowDownCircle className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={totalDespesas}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-2xl font-bold text-red-400"
                >
                  {formatCurrency(totalDespesas)}
                </motion.div>
              </AnimatePresence>
              <p className="text-sm text-muted-foreground">{filteredDespesas.length} transacoes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">vs Mes Anterior</CardTitle>
              {percentageChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-red-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-emerald-400" />
              )}
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-2xl font-bold ${percentageChange >= 0 ? "text-red-400" : "text-emerald-400"}`}>
                {percentageChange >= 0 ? "+" : ""}
                {percentageChange.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {percentageChange >= 0 ? "Aumento" : "Reducao"} nos gastos
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Media Diaria</CardTitle>
              <Wallet className="h-5 w-5 text-amber-400" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-amber-400">{formatCurrency(avgDaily)}</div>
              <p className="text-sm text-muted-foreground">Por dia no mes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="card-3d glass-card overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {categoryData.length > 0 ? (
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.slice(0, 5).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "rgba(0,0,0,0.8)",
                          border: "1px solid rgba(6,182,212,0.3)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="card-3d glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="neon-text-subtle">Todas as Despesas</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <ExpensesList despesas={filteredDespesas} categorias={categorias} cartoes={cartoes} userId={userId} />
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}
