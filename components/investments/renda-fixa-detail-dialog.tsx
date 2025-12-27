"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Calendar, Percent, Building, Info, LineChart, RefreshCcw } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import { TIPOS_RENDA_FIXA, INDEXADORES } from "@/lib/api/brapi"
import type { RendaFixa } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ReinvestRendaFixaDialog } from "./reinvest-renda-fixa-dialog"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface RendaFixaDetailDialogProps {
  investimento: RendaFixa
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Simular evolucao baseado na taxa de juros
function gerarEvolucaoRendaFixa(investimento: RendaFixa) {
  const data = []
  const dataInicio = new Date(investimento.data_aplicacao)
  const hoje = new Date()
  const mesesPassados = Math.max(1, Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)))

  // Taxa mensal aproximada
  const taxaAnual = investimento.taxa / 100
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1

  let valorAcumulado = investimento.valor_investido

  for (let i = 0; i <= Math.min(mesesPassados, 24); i++) {
    const dataRef = new Date(dataInicio)
    dataRef.setMonth(dataRef.getMonth() + i)

    if (i > 0) {
      valorAcumulado = valorAcumulado * (1 + taxaMensal)
    }

    data.push({
      mes: dataRef.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      valor: valorAcumulado,
      rendimento: valorAcumulado - investimento.valor_investido,
      rendimentoPercent: ((valorAcumulado - investimento.valor_investido) / investimento.valor_investido) * 100,
    })
  }

  return data
}

// Projecao futura ate o vencimento
function gerarProjecaoVencimento(investimento: RendaFixa) {
  if (!investimento.data_vencimento) return []

  const data = []
  const hoje = new Date()
  const vencimento = new Date(investimento.data_vencimento)
  const mesesRestantes = Math.max(1, Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30)))

  const taxaAnual = investimento.taxa / 100
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1

  let valorProjetado = investimento.valor_atual

  for (let i = 0; i <= Math.min(mesesRestantes, 36); i++) {
    const dataRef = new Date()
    dataRef.setMonth(dataRef.getMonth() + i)

    if (i > 0) {
      valorProjetado = valorProjetado * (1 + taxaMensal)
    }

    data.push({
      mes: dataRef.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      valor: valorProjetado,
      projetado: true,
    })
  }

  return data
}

export function RendaFixaDetailDialog({ investimento, open, onOpenChange }: RendaFixaDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("evolucao")
  const [isReinvestOpen, setIsReinvestOpen] = useState(false)

  const tipoInfo = TIPOS_RENDA_FIXA[investimento.tipo as keyof typeof TIPOS_RENDA_FIXA]
  const indexadorInfo = investimento.indexador ? INDEXADORES[investimento.indexador as keyof typeof INDEXADORES] : null

  const evolucaoData = gerarEvolucaoRendaFixa(investimento)
  const projecaoData = gerarProjecaoVencimento(investimento)

  const rendimento = investimento.valor_atual - investimento.valor_investido
  const rendimentoPercent = investimento.valor_investido > 0 ? (rendimento / investimento.valor_investido) * 100 : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] glass-card border-primary/20 flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: tipoInfo?.color || "#6b7280" }}
            >
              {investimento.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="neon-text text-xl block truncate">{investimento.nome}</span>
              <p className="text-sm text-muted-foreground font-normal flex items-center gap-2 mt-1">
                <Building className="h-3 w-3 shrink-0" />
                <span className="truncate">{investimento.instituicao}</span>
              </p>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 bg-transparent"
                onClick={() => setIsReinvestOpen(true)}
              >
                <RefreshCcw className="h-4 w-4" />
                Reinvestir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mt-6">
            <Card className="glass-card border-primary/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Investido</p>
                <p className="font-bold text-sm sm:text-base">{formatCurrency(investimento.valor_investido)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-primary/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Valor Atual</p>
                <p className="font-bold text-primary text-sm sm:text-base">
                  {formatCurrency(investimento.valor_atual)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-primary/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Rendimento</p>
                <p className="font-bold text-emerald-400 text-sm sm:text-base">+{formatCurrency(rendimento)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-primary/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                <p className="font-bold text-emerald-400 text-sm sm:text-base">+{formatPercent(rendimentoPercent)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" style={{ borderColor: tipoInfo?.color, color: tipoInfo?.color }}>
              {tipoInfo?.label || investimento.tipo}
            </Badge>
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
              <Percent className="h-3 w-3 mr-1" />
              {investimento.taxa}% {indexadorInfo?.label || ""}
            </Badge>
            {investimento.data_vencimento && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                <Calendar className="h-3 w-3 mr-1" />
                Vence: {new Date(investimento.data_vencimento).toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 bg-background/50">
              <TabsTrigger value="evolucao" className="data-[state=active]:bg-primary/20">
                <TrendingUp className="h-4 w-4 mr-2" />
                Evolução
              </TabsTrigger>
              <TabsTrigger value="projecao" className="data-[state=active]:bg-primary/20">
                <LineChart className="h-4 w-4 mr-2" />
                Projeção
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evolucao" className="mt-4">
              <Card className="glass-card border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Evolução do Investimento (baseado na taxa de {investimento.taxa}% a.a.)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucaoData}>
                        <defs>
                          <linearGradient id="colorValorRF" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Valor"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="valor"
                          stroke="#10b981"
                          fill="url(#colorValorRF)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projecao" className="mt-4">
              <Card className="glass-card border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Projeção até o Vencimento</CardTitle>
                </CardHeader>
                <CardContent>
                  {projecaoData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projecaoData}>
                          <defs>
                            <linearGradient id="colorProjecao" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                          <YAxis
                            tick={{ fill: "#9ca3af", fontSize: 10 }}
                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(0,0,0,0.8)",
                              border: "1px solid rgba(59,130,246,0.3)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [formatCurrency(value), "Valor Projetado"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="valor"
                            stroke="#3b82f6"
                            fill="url(#colorProjecao)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <Info className="h-5 w-5 mr-2" />
                      Sem data de vencimento definida
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="glass-card border-primary/10 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalhes da Aplicação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data da Aplicação</span>
                <span>{new Date(investimento.data_aplicacao).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidez</span>
                <span>{investimento.liquidez || "No vencimento"}</span>
              </div>
              {investimento.data_vencimento && investimento.dias_restantes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias Restantes</span>
                  <span className={investimento.dias_restantes <= 30 ? "text-amber-400" : ""}>
                    {investimento.dias_restantes} dias
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>

    <ReinvestRendaFixaDialog investimento={investimento} open={isReinvestOpen} onOpenChange={setIsReinvestOpen} />
    </>
  )
}
