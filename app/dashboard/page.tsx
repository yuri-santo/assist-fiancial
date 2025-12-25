import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { getCurrentMonthRange, getMonthName } from "@/lib/utils/date"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  ShieldCheck,
} from "lucide-react"
import type { Despesa, Receita, Categoria, Caixinha, Objetivo, RendaVariavel, RendaFixa } from "@/lib/types"
import { getCotacoes } from "@/lib/api/brapi"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { start, end } = getCurrentMonthRange()
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  // Fetch all data in parallel
  const [
    despesasRes,
    receitasRes,
    categoriasRes,
    caixinhasRes,
    objetivosRes,
    reservaRes,
    cartoesRes,
    rendaVariavelRes,
    rendaFixaRes,
  ] = await Promise.all([
    supabase
      .from("despesas")
      .select("*, categoria:categorias(*)")
      .eq("user_id", user.id)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false }),
    supabase
      .from("receitas")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: false }),
    supabase.from("categorias").select("*").eq("user_id", user.id),
    supabase.from("caixinhas").select("*").eq("user_id", user.id),
    supabase.from("objetivos").select("*").eq("user_id", user.id).neq("tipo", "emergencia"),
    supabase.from("objetivos").select("*").eq("user_id", user.id).eq("tipo", "emergencia").single(),
    supabase.from("cartoes").select("*").eq("user_id", user.id),
    supabase.from("renda_variavel").select("*").eq("user_id", user.id),
    supabase.from("renda_fixa").select("*").eq("user_id", user.id),
  ])

  const despesas = (despesasRes.data || []) as Despesa[]
  const receitas = (receitasRes.data || []) as Receita[]
  const categorias = (categoriasRes.data || []) as Categoria[]
  const caixinhas = (caixinhasRes.data || []) as Caixinha[]
  const objetivos = (objetivosRes.data || []) as Objetivo[]
  const reserva = reservaRes.data as Objetivo | null
  const cartoes = cartoesRes.data || []
  const rendaVariavel = (rendaVariavelRes.data || []) as RendaVariavel[]
  const rendaFixa = (rendaFixaRes.data || []) as RendaFixa[]

  // Calculate totals
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0)
  const saldoMes = totalReceitas - totalDespesas
  const taxaEconomia = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0

  // Caixinhas total
  const totalCaixinhas = caixinhas.reduce((sum, c) => sum + c.saldo, 0)

  // Objetivos
  const totalObjetivos = objetivos.reduce((sum, o) => sum + o.valor_atual, 0)
  const metaObjetivos = objetivos.reduce((sum, o) => sum + o.valor_total, 0)

  // Reserva de emergencia
  const reservaAtual = reserva?.valor_atual || 0
  const reservaMeta = reserva?.valor_total || 0
  const mesesCobertos = totalDespesas > 0 ? reservaAtual / totalDespesas : 0

  // Investimentos - buscar cotacoes
  const tickers = rendaVariavel.map((a) => a.ticker)
  const cotacoes = await getCotacoes(tickers)
  const cotacoesMap = new Map(cotacoes.map((c) => [c.symbol, c]))

  const totalRendaVariavel = rendaVariavel.reduce((sum, a) => {
    const cotacao = cotacoesMap.get(a.ticker)
    const preco = cotacao?.regularMarketPrice || a.preco_medio
    return sum + a.quantidade * preco
  }, 0)
  const totalRendaFixa = rendaFixa.reduce((sum, i) => sum + i.valor_atual, 0)
  const totalInvestimentos = totalRendaVariavel + totalRendaFixa

  // Patrimonio total
  const patrimonioTotal = totalCaixinhas + totalObjetivos + reservaAtual + totalInvestimentos + saldoMes

  // Top despesas por categoria
  const despesasPorCategoria = despesas.reduce(
    (acc, d) => {
      const catId = d.categoria_id || "outros"
      acc[catId] = (acc[catId] || 0) + d.valor
      return acc
    },
    {} as Record<string, number>,
  )

  const topCategorias = Object.entries(despesasPorCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([catId, valor]) => {
      const cat = categorias.find((c) => c.id === catId)
      return {
        nome: cat?.nome || "Outros",
        cor: cat?.cor || "#6b7280",
        valor,
        porcentagem: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Minha Carteira
            </span>
          </h1>
          <p className="text-muted-foreground">
            Visao consolidada de {getMonthName(mesAtual)} {anoAtual}
          </p>
        </div>
      </div>

      {/* Patrimonio Card */}
      <Card className="glass-card overflow-hidden border-primary/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <CardContent className="relative p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patrimonio Total</p>
              <p className="text-4xl font-bold neon-text">{formatCurrency(patrimonioTotal)}</p>
            </div>
            <div className="flex items-center gap-2">
              {saldoMes >= 0 ? (
                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">+{formatCurrency(saldoMes)} este mes</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">{formatCurrency(saldoMes)} este mes</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/receitas">
          <Card className="glass-card hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
              <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalReceitas)}</div>
              <p className="text-xs text-muted-foreground">{receitas.length} lancamentos</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/despesas">
          <Card className="glass-card hover:border-red-500/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
              <ArrowDownCircle className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(totalDespesas)}</div>
              <p className="text-xs text-muted-foreground">{despesas.length} lancamentos</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Mes</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoMes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(saldoMes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {taxaEconomia >= 0 ? `${taxaEconomia.toFixed(0)}% economizado` : "Gastou mais que ganhou"}
            </p>
          </CardContent>
        </Card>

        <Link href="/dashboard/investimentos/carteira">
          <Card className="glass-card hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investimentos</CardTitle>
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{formatCurrency(totalInvestimentos)}</div>
              <p className="text-xs text-muted-foreground">{rendaVariavel.length + rendaFixa.length} ativos</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Middle Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reserva e Objetivos */}
        <div className="space-y-4">
          <Link href="/dashboard/reserva">
            <Card className="glass-card hover:border-emerald-500/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Reserva de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(reservaAtual)}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservaMeta > 0 ? `Meta: ${formatCurrency(reservaMeta)}` : "Configure sua reserva"}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-medium px-2 py-1 rounded ${
                      mesesCobertos >= 6
                        ? "bg-emerald-500/20 text-emerald-400"
                        : mesesCobertos >= 3
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {mesesCobertos.toFixed(1)} meses
                  </div>
                </div>
                {reservaMeta > 0 && (
                  <Progress value={Math.min((reservaAtual / reservaMeta) * 100, 100)} className="h-2" />
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/caixinhas">
            <Card className="glass-card hover:border-amber-500/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-amber-400" />
                  Caixinhas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalCaixinhas)}</p>
                    <p className="text-xs text-muted-foreground">{caixinhas.length} caixinhas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/objetivos">
            <Card className="glass-card hover:border-purple-500/30 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalObjetivos)}</p>
                    <p className="text-xs text-muted-foreground">
                      {metaObjetivos > 0 ? `Meta total: ${formatCurrency(metaObjetivos)}` : "Crie seus objetivos"}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {objetivos.filter((o) => o.valor_atual >= o.valor_total).length}/{objetivos.length} concluidos
                  </div>
                </div>
                {metaObjetivos > 0 && (
                  <Progress value={Math.min((totalObjetivos / metaObjetivos) * 100, 100)} className="h-2" />
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Despesas por Categoria */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategorias.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma despesa este mes</p>
            ) : (
              topCategorias.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                      <span>{cat.nome}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(cat.valor)}</span>
                      <span className="text-muted-foreground ml-2">({cat.porcentagem.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <Progress value={cat.porcentagem} className="h-1.5" style={{ "--progress-color": cat.cor } as any} />
                </div>
              ))
            )}
            <Link href="/dashboard/despesas">
              <Button variant="ghost" className="w-full mt-2 text-muted-foreground hover:text-primary">
                Ver todas as despesas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Transacoes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              ...despesas.slice(0, 3).map((d) => ({ ...d, tipo: "despesa" as const })),
              ...receitas.slice(0, 2).map((r) => ({ ...r, tipo: "receita" as const })),
            ]
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .slice(0, 5)
              .map((item, i) => {
                const isDespesa = item.tipo === "despesa"
                const categoria = isDespesa ? categorias.find((c) => c.id === (item as Despesa).categoria_id) : null
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isDespesa ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}
                      >
                        {isDespesa ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isDespesa
                            ? (item as Despesa).descricao || categoria?.nome || "Despesa"
                            : (item as Receita).fonte}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.data).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${isDespesa ? "text-red-400" : "text-emerald-400"}`}>
                      {isDespesa ? "-" : "+"}
                      {formatCurrency(item.valor)}
                    </p>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
