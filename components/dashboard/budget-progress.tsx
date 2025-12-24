import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/currency"
import type { Orcamento, Despesa } from "@/lib/types"

interface BudgetProgressProps {
  orcamentos: Orcamento[]
  despesas: Despesa[]
}

export function BudgetProgress({ orcamentos, despesas }: BudgetProgressProps) {
  const budgetData = orcamentos.slice(0, 4).map((orcamento) => {
    const spent = despesas.filter((d) => d.categoria_id === orcamento.categoria_id).reduce((sum, d) => sum + d.valor, 0)

    const percentage = Math.min((spent / orcamento.valor_limite) * 100, 100)
    const isOverBudget = spent > orcamento.valor_limite

    return {
      id: orcamento.id,
      category: orcamento.categoria?.nome || "Categoria",
      spent,
      limit: orcamento.valor_limite,
      percentage,
      isOverBudget,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orcamento do Mes</CardTitle>
      </CardHeader>
      <CardContent>
        {budgetData.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum orcamento definido</p>
        ) : (
          <div className="space-y-6">
            {budgetData.map((budget) => (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{budget.category}</span>
                  <span className={budget.isOverBudget ? "text-red-600" : "text-muted-foreground"}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                  </span>
                </div>
                <Progress value={budget.percentage} className={budget.isOverBudget ? "[&>div]:bg-red-500" : ""} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
