"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle, TrendingDown, TrendingUp, RefreshCw } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { getMonthRangeFromDate } from "@/lib/utils/date"
import type { Receita } from "@/lib/types"
import { IncomesList } from "@/components/income/incomes-list"
import { AddIncomeDialog } from "@/components/income/add-income-dialog"
import { MonthSelector } from "@/components/ui/month-selector"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface ReceitasClientProps {
  receitas: Receita[]
  userId: string
}

export function ReceitasClient({ receitas, userId }: ReceitasClientProps) {
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

  // Filter income by selected month
  const filteredReceitas = useMemo(() => {
    const { start, end } = getMonthRangeFromDate(currentDate)
    return receitas.filter((r) => {
      const date = r.data.split("T")[0]
      return date >= start && date <= end
    })
  }, [receitas, currentDate])

  // Calculate previous month for comparison
  const previousMonthReceitas = useMemo(() => {
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const { start, end } = getMonthRangeFromDate(prevDate)
    return receitas.filter((r) => {
      const date = r.data.split("T")[0]
      return date >= start && date <= end
    })
  }, [receitas, currentDate])

  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0)
  const totalPreviousMonth = previousMonthReceitas.reduce((sum, r) => sum + r.valor, 0)
  const percentageChange =
    totalPreviousMonth > 0 ? ((totalReceitas - totalPreviousMonth) / totalPreviousMonth) * 100 : 0

  // Recurrent income
  const recurrentIncome = filteredReceitas.filter((r) => r.recorrente).reduce((sum, r) => sum + r.valor, 0)

  // Group by source for chart
  const sourceData = useMemo(() => {
    const grouped = filteredReceitas.reduce(
      (acc, r) => {
        acc[r.fonte] = (acc[r.fonte] || 0) + r.valor
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredReceitas])

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas mensais</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCurrentMonth={handleCurrentMonth}
          />
          <AddIncomeDialog userId={userId} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
              <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
            </CardHeader>
            <CardContent className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={totalReceitas}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-2xl font-bold text-emerald-400"
                >
                  {formatCurrency(totalReceitas)}
                </motion.div>
              </AnimatePresence>
              <p className="text-sm text-muted-foreground">{filteredReceitas.length} transacoes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">vs Mes Anterior</CardTitle>
              {percentageChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-2xl font-bold ${percentageChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {percentageChange >= 0 ? "+" : ""}
                {percentageChange.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {percentageChange >= 0 ? "Aumento" : "Reducao"} na receita
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-3d glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Recorrente</CardTitle>
              <RefreshCw className="h-5 w-5 text-cyan-400" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-cyan-400">{formatCurrency(recurrentIncome)}</div>
              <p className="text-sm text-muted-foreground">Receitas fixas</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="card-3d glass-card overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Por Fonte</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {sourceData.length > 0 ? (
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "rgba(0,0,0,0.8)",
                          border: "1px solid rgba(6,182,212,0.3)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={4} />
                    </BarChart>
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
            <CardTitle className="neon-text-subtle">Todas as Receitas</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <IncomesList receitas={filteredReceitas} userId={userId} />
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}
