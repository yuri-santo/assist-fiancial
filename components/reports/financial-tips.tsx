"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  PiggyBank,
  Target,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { motion } from "framer-motion"
import { formatCurrency } from "@/lib/utils/currency"

interface FinancialTipsProps {
  data: {
    receitas: number
    despesas: number
    despesasFixas: number
    despesasVariaveis: number
    investimentos: number
    reserva: number
    patrimonio: number
    limiteCartoes: number
    objetivos: number
    economia: number
    // Dados mensais para comparacao
    receitasMesAnterior?: number
    despesasMesAnterior?: number
  }
}

interface Tip {
  id: string
  title: string
  description: string
  type: "success" | "warning" | "danger" | "info"
  priority: number // 1-5, sendo 1 mais importante
  icon: "check" | "alert" | "lightbulb" | "trending" | "piggy" | "target" | "card" | "wallet"
  metric?: {
    label: string
    value: string
    change?: number
  }
}

export function FinancialTips({ data }: FinancialTipsProps) {
  const tips = useMemo<Tip[]>(() => {
    const result: Tip[] = []
    const {
      receitas,
      despesas,
      despesasFixas,
      despesasVariaveis,
      investimentos,
      reserva,
      patrimonio,
      limiteCartoes,
      economia,
      receitasMesAnterior,
      despesasMesAnterior,
    } = data

    // 1. Analise da taxa de economia
    if (economia >= 30) {
      result.push({
        id: "economia-otima",
        title: "Parabens! Sua taxa de economia esta excelente",
        description: `Voce esta economizando ${economia.toFixed(0)}% da sua renda. Continue assim para acelerar seus objetivos financeiros.`,
        type: "success",
        priority: 1,
        icon: "check",
        metric: {
          label: "Taxa de economia",
          value: `${economia.toFixed(1)}%`,
          change: economia - 20,
        },
      })
    } else if (economia >= 20) {
      result.push({
        id: "economia-boa",
        title: "Boa taxa de economia",
        description: `Voce esta economizando ${economia.toFixed(0)}% da renda. A meta ideal e 30% - faltam apenas ${(30 - economia).toFixed(0)} pontos percentuais!`,
        type: "info",
        priority: 2,
        icon: "piggy",
        metric: {
          label: "Taxa de economia",
          value: `${economia.toFixed(1)}%`,
        },
      })
    } else if (economia >= 0) {
      result.push({
        id: "economia-baixa",
        title: "Sua taxa de economia esta abaixo do ideal",
        description: `Com apenas ${economia.toFixed(0)}% de economia, recomendamos revisar seus gastos. Tente reduzir despesas variaveis primeiro.`,
        type: "warning",
        priority: 1,
        icon: "alert",
        metric: {
          label: "Taxa de economia",
          value: `${economia.toFixed(1)}%`,
          change: economia - 20,
        },
      })
    } else {
      result.push({
        id: "economia-negativa",
        title: "Atencao: Voce esta gastando mais do que ganha!",
        description: `Este mes suas despesas superaram suas receitas em ${formatCurrency(Math.abs(receitas - despesas))}. E urgente revisar seu orcamento.`,
        type: "danger",
        priority: 1,
        icon: "alert",
        metric: {
          label: "Deficit",
          value: formatCurrency(Math.abs(receitas - despesas)),
        },
      })
    }

    // 2. Analise de despesas fixas
    const percentualFixas = receitas > 0 ? (despesasFixas / receitas) * 100 : 0
    if (percentualFixas > 50) {
      result.push({
        id: "fixas-alta",
        title: "Despesas fixas estao muito altas",
        description: `${percentualFixas.toFixed(0)}% da sua renda vai para despesas fixas. O ideal e manter abaixo de 50%. Considere renegociar contratos ou mudar de planos.`,
        type: "warning",
        priority: 2,
        icon: "wallet",
        metric: {
          label: "Despesas fixas",
          value: formatCurrency(despesasFixas),
          change: percentualFixas - 50,
        },
      })
    }

    // 3. Analise de reserva de emergencia
    const mesesReserva = despesas > 0 ? reserva / despesas : 0
    if (mesesReserva < 3) {
      result.push({
        id: "reserva-baixa",
        title: "Sua reserva de emergencia precisa crescer",
        description: `Voce tem ${mesesReserva.toFixed(1)} meses de despesas guardados. O ideal e ter entre 6 a 12 meses. Priorize isso antes de investir em renda variavel.`,
        type: "warning",
        priority: 2,
        icon: "piggy",
        metric: {
          label: "Meses de reserva",
          value: mesesReserva.toFixed(1),
        },
      })
    } else if (mesesReserva >= 6) {
      result.push({
        id: "reserva-otima",
        title: "Reserva de emergencia adequada",
        description: `Com ${mesesReserva.toFixed(1)} meses de despesas guardados, voce esta bem protegido. Agora pode focar em investimentos de longo prazo.`,
        type: "success",
        priority: 3,
        icon: "check",
        metric: {
          label: "Meses de reserva",
          value: mesesReserva.toFixed(1),
        },
      })
    }

    // 4. Analise de investimentos
    const percentualInvestido = receitas > 0 ? (investimentos / (receitas * 12)) * 100 : 0
    if (investimentos === 0 && receitas > 0) {
      result.push({
        id: "sem-investimentos",
        title: "Comece a investir parte da sua renda",
        description:
          "Voce ainda nao tem investimentos registrados. Mesmo pequenos valores mensais fazem grande diferenca no longo prazo devido aos juros compostos.",
        type: "info",
        priority: 3,
        icon: "trending",
      })
    } else if (percentualInvestido < 10 && receitas > 0) {
      result.push({
        id: "investimentos-baixos",
        title: "Aumente sua taxa de investimento",
        description: `Seus investimentos representam cerca de ${percentualInvestido.toFixed(0)}% da sua renda anual. Tente aumentar gradualmente para 20-30%.`,
        type: "info",
        priority: 3,
        icon: "trending",
        metric: {
          label: "Investido",
          value: formatCurrency(investimentos),
        },
      })
    }

    // 5. Analise de uso de cartao de credito
    if (limiteCartoes > 0) {
      const percentualUsado = despesas > 0 ? (despesasVariaveis / limiteCartoes) * 100 : 0
      if (percentualUsado > 30) {
        result.push({
          id: "cartao-alto",
          title: "Atencao ao uso do cartao de credito",
          description: `Seu uso do cartao esta em ${percentualUsado.toFixed(0)}% do limite. Manter abaixo de 30% ajuda seu score de credito e evita endividamento.`,
          type: "warning",
          priority: 2,
          icon: "card",
        })
      }
    }

    // 6. Comparacao com mes anterior
    if (receitasMesAnterior && despesasMesAnterior) {
      const variacaoReceitas = ((receitas - receitasMesAnterior) / receitasMesAnterior) * 100
      const variacaoDespesas = ((despesas - despesasMesAnterior) / despesasMesAnterior) * 100

      if (variacaoDespesas > 20) {
        result.push({
          id: "despesas-aumentaram",
          title: "Suas despesas aumentaram significativamente",
          description: `As despesas subiram ${variacaoDespesas.toFixed(0)}% em relacao ao mes passado. Verifique se houve gastos extraordinarios ou se e uma tendencia.`,
          type: "warning",
          priority: 2,
          icon: "alert",
          metric: {
            label: "Variacao despesas",
            value: `+${variacaoDespesas.toFixed(1)}%`,
            change: variacaoDespesas,
          },
        })
      }

      if (variacaoReceitas > 10) {
        result.push({
          id: "receitas-aumentaram",
          title: "Otimo! Suas receitas aumentaram",
          description: `Suas receitas cresceram ${variacaoReceitas.toFixed(0)}% comparado ao mes anterior. Aproveite para aumentar seus investimentos.`,
          type: "success",
          priority: 4,
          icon: "trending",
          metric: {
            label: "Variacao receitas",
            value: `+${variacaoReceitas.toFixed(1)}%`,
            change: variacaoReceitas,
          },
        })
      }
    }

    // 7. Dica geral sobre diversificacao
    if (investimentos > 0 && patrimonio > 0) {
      const concentracao = (investimentos / patrimonio) * 100
      if (concentracao > 90) {
        result.push({
          id: "diversificar",
          title: "Considere diversificar seu patrimonio",
          description:
            "Quase todo seu patrimonio esta em investimentos. Considere manter parte em reservas de facil acesso para oportunidades ou emergencias.",
          type: "info",
          priority: 4,
          icon: "lightbulb",
        })
      }
    }

    // Ordenar por prioridade
    return result.sort((a, b) => a.priority - b.priority).slice(0, 6)
  }, [data])

  const getIcon = (iconType: Tip["icon"]) => {
    const icons = {
      check: CheckCircle2,
      alert: AlertTriangle,
      lightbulb: Lightbulb,
      trending: TrendingUp,
      piggy: PiggyBank,
      target: Target,
      card: CreditCard,
      wallet: Wallet,
    }
    return icons[iconType]
  }

  const getTypeStyles = (type: Tip["type"]) => {
    const styles = {
      success: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        icon: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      },
      warning: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        icon: "text-amber-400",
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      },
      danger: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: "text-red-400",
        badge: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      info: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        icon: "text-blue-400",
        badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
    }
    return styles[type]
  }

  const getTypeLabel = (type: Tip["type"]) => {
    const labels = {
      success: "Positivo",
      warning: "Atencao",
      danger: "Urgente",
      info: "Dica",
    }
    return labels[type]
  }

  return (
    <Card className="card-3d glass-card overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />
      <CardHeader className="flex flex-row items-center gap-2 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-lg neon-text-subtle">Dicas para sua Saude Financeira</CardTitle>
          <p className="text-sm text-muted-foreground">Analise baseada nos seus dados</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
            <p>Parabens! Suas financas estao em otimo estado.</p>
          </div>
        ) : (
          tips.map((tip, index) => {
            const Icon = getIcon(tip.icon)
            const styles = getTypeStyles(tip.type)

            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-xl border ${styles.border} ${styles.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${styles.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                        {getTypeLabel(tip.type)}
                      </Badge>
                      {tip.priority === 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Prioridade alta
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{tip.title}</h4>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>

                    {tip.metric && (
                      <div className="mt-3 flex items-center gap-4 p-2 rounded-lg bg-background/50">
                        <div>
                          <p className="text-xs text-muted-foreground">{tip.metric.label}</p>
                          <p className="text-lg font-bold text-foreground">{tip.metric.value}</p>
                        </div>
                        {tip.metric.change !== undefined && (
                          <div
                            className={`flex items-center gap-1 ${tip.metric.change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {tip.metric.change >= 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {tip.metric.change >= 0 ? "+" : ""}
                              {tip.metric.change.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}

        {/* Resumo da saude financeira */}
        <div className="mt-6 p-4 rounded-xl border border-border/30 bg-card/30">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Resumo Rapido
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Taxa de Economia</p>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(Math.max(data.economia, 0), 100)} className="h-2 flex-1" />
                <span className="text-sm font-medium">{data.economia.toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Meses de Reserva</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min((data.reserva / (data.despesas || 1)) * (100 / 12), 100)}
                  className="h-2 flex-1"
                />
                <span className="text-sm font-medium">
                  {data.despesas > 0 ? (data.reserva / data.despesas).toFixed(1) : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
