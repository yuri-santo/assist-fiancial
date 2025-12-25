"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils/currency"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { motion } from "framer-motion"

interface MonthlyExpensesTableProps {
  data: Array<{
    month: string
    monthNum: number
    receitas: number
    despesas: number
    saldo: number
  }>
  ano: number
}

export function MonthlyExpensesTable({ data, ano }: MonthlyExpensesTableProps) {
  const totalReceitas = data.reduce((sum, d) => sum + d.receitas, 0)
  const totalDespesas = data.reduce((sum, d) => sum + d.despesas, 0)
  const totalSaldo = totalReceitas - totalDespesas

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Despesas e Receitas por Mes - {ano}</CardTitle>
        </CardHeader>
        <CardContent className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Mes</TableHead>
                <TableHead className="text-right text-muted-foreground">Receitas</TableHead>
                <TableHead className="text-right text-muted-foreground">Despesas</TableHead>
                <TableHead className="text-right text-muted-foreground">Saldo</TableHead>
                <TableHead className="text-right text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => {
                const isPositive = row.saldo > 0
                const isNeutral = row.saldo === 0
                return (
                  <motion.tr
                    key={row.monthNum}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="border-primary/10 hover:bg-primary/5 transition-colors"
                  >
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right text-emerald-400">{formatCurrency(row.receitas)}</TableCell>
                    <TableCell className="text-right text-red-400">{formatCurrency(row.despesas)}</TableCell>
                    <TableCell
                      className={`text-right font-bold ${isPositive ? "text-emerald-400" : isNeutral ? "text-muted-foreground" : "text-red-400"}`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(row.saldo)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400 inline" />
                      ) : isNeutral ? (
                        <Minus className="h-4 w-4 text-muted-foreground inline" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400 inline" />
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })}
              {/* Total row */}
              <TableRow className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                <TableCell>Total Anual</TableCell>
                <TableCell className="text-right text-emerald-400">{formatCurrency(totalReceitas)}</TableCell>
                <TableCell className="text-right text-red-400">{formatCurrency(totalDespesas)}</TableCell>
                <TableCell className={`text-right ${totalSaldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalSaldo >= 0 ? "+" : ""}
                  {formatCurrency(totalSaldo)}
                </TableCell>
                <TableCell className="text-right">
                  {totalSaldo > 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400 inline" />
                  ) : totalSaldo === 0 ? (
                    <Minus className="h-4 w-4 text-muted-foreground inline" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400 inline" />
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}
