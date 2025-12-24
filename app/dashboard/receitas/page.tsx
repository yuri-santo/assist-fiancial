import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { getCurrentMonthRange, formatMonthYear } from "@/lib/utils/date"
import type { Receita } from "@/lib/types"
import { IncomesList } from "@/components/income/incomes-list"
import { AddIncomeDialog } from "@/components/income/add-income-dialog"
import { PageAnimation } from "@/components/animations/page-animation"

export default async function ReceitasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { start, end } = getCurrentMonthRange()

  const { data: receitas } = await supabase
    .from("receitas")
    .select("*")
    .eq("user_id", user.id)
    .gte("data", start)
    .lte("data", end)
    .order("data", { ascending: false })

  const receitasList = (receitas || []) as Receita[]
  const totalReceitas = receitasList.reduce((sum, r) => sum + r.valor, 0)

  return (
    <div className="space-y-6">
      <PageAnimation type="receitas" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text">Receitas</h1>
          <p className="text-muted-foreground">{formatMonthYear(new Date())}</p>
        </div>
        <AddIncomeDialog userId={user.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-3d glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalReceitas)}</div>
            <p className="text-sm text-muted-foreground">{receitasList.length} transacoes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Todas as Receitas</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <IncomesList receitas={receitasList} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
