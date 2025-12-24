import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { getCurrentMonthRange, formatMonthYear } from "@/lib/utils/date"
import type { Despesa, Categoria, Cartao } from "@/lib/types"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { PageAnimation } from "@/components/animations/page-animation"

export default async function DespesasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { start, end } = getCurrentMonthRange()

  const [despesasRes, categoriasRes, cartoesRes] = await Promise.all([
    supabase
      .from("despesas")
      .select("*, categoria:categorias(*), cartao:cartoes(*)")
      .eq("user_id", user.id)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false }),
    supabase.from("categorias").select("*").eq("user_id", user.id).eq("tipo", "despesa"),
    supabase.from("cartoes").select("*").eq("user_id", user.id),
  ])

  const despesas = (despesasRes.data || []) as Despesa[]
  const categorias = (categoriasRes.data || []) as Categoria[]
  const cartoes = (cartoesRes.data || []) as Cartao[]

  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)

  return (
    <div className="space-y-6">
      <PageAnimation type="despesas" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text">Despesas</h1>
          <p className="text-muted-foreground">{formatMonthYear(new Date())}</p>
        </div>
        <AddExpenseDialog userId={user.id} categorias={categorias} cartoes={cartoes} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-3d glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalDespesas)}</div>
            <p className="text-sm text-muted-foreground">{despesas.length} transacoes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="neon-text-subtle">Todas as Despesas</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ExpensesList despesas={despesas} categorias={categorias} cartoes={cartoes} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
