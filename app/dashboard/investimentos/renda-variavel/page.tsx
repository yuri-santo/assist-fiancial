import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import type { RendaVariavel } from "@/lib/types"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"
import { getUnifiedQuote } from "@/lib/api/unified-quote-service"
import { RendaVariavelList } from "@/components/investments/renda-variavel-list"
import { AddRendaVariavelDialog } from "@/components/investments/add-renda-variavel-dialog"
import { PortfolioChart } from "@/components/investments/portfolio-chart"
import { VariacaoChart } from "@/components/investments/variacao-chart"

export default async function RendaVariavelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: ativos } = await supabase
    .from("renda_variavel")
    .select("*")
    .eq("user_id", user.id)
    .order("ticker", { ascending: true })

  const rendaVariavel = (ativos || []) as RendaVariavel[]

  // Buscar cotações em tempo real
  // Buscar cotações atuais (server-side, sem CORS) e calcular valores
  const ativosComCotacao = await Promise.all(
    rendaVariavel.map(async (ativo) => {
      const assetType = ativo.tipo === "cripto" || ativo.mercado === "crypto" ? "crypto" : "stock"
      const currency = (ativo.moeda === "USD" || ativo.moeda === "USDT" ? ativo.moeda : "BRL") as "BRL" | "USD" | "USDT"

      const quote = await getUnifiedQuote(ativo.ticker, assetType, currency)

      const cotacaoAtual = quote?.price ?? ativo.preco_medio
      const valorAtual = cotacaoAtual * ativo.quantidade
      const valorInvestido = ativo.preco_medio * ativo.quantidade
      const variacaoTotal = valorInvestido > 0 ? ((valorAtual - valorInvestido) / valorInvestido) * 100 : 0
      const lucroPrejuizo = valorAtual - valorInvestido

      return {
        ...ativo,
        cotacao_atual: cotacaoAtual,
        valor_atual: valorAtual,
        variacao_total: variacaoTotal,
        lucro_prejuizo: lucroPrejuizo,
        variacao_diaria: quote?.changePercent ?? 0,
        ultima_atualizacao: new Date().toISOString(),
      }
    }),
  )

