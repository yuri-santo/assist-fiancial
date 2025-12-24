import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDate } from "@/lib/utils/date"
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import type { Despesa, Receita } from "@/lib/types"

interface Transaction {
  id: string
  type: "despesa" | "receita"
  description: string
  value: number
  date: string
  category?: string
}

interface RecentTransactionsProps {
  despesas: Despesa[]
  receitas: Receita[]
}

export function RecentTransactions({ despesas, receitas }: RecentTransactionsProps) {
  const transactions: Transaction[] = [
    ...despesas.map((d) => ({
      id: d.id,
      type: "despesa" as const,
      description: d.descricao || d.categoria?.nome || "Despesa",
      value: d.valor,
      date: d.data,
      category: d.categoria?.nome,
    })),
    ...receitas.map((r) => ({
      id: r.id,
      type: "receita" as const,
      description: r.descricao || r.fonte,
      value: r.valor,
      date: r.data,
      category: r.fonte,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacoes Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma transacao registrada</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    transaction.type === "receita" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {transaction.type === "receita" ? (
                    <ArrowUpCircle className="h-5 w-5" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>
                <div
                  className={`text-right font-semibold ${
                    transaction.type === "receita" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {transaction.type === "receita" ? "+" : "-"}
                  {formatCurrency(transaction.value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
