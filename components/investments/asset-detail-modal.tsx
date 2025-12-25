"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PriceEvolutionChart } from "./price-evolution-chart"
import { CandlestickChart } from "./candlestick-chart"
import { IndicatorsCard } from "./indicators-card"
import { VolatilityChart } from "./volatility-chart"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import type { RendaVariavel } from "@/lib/types"
import type { StockIndicators } from "@/lib/api/stock-service"
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  LineChart,
  CandlestickChartIcon,
  Activity,
  Edit2,
  Save,
  Loader2,
  Wallet,
  Target,
  BarChart3,
} from "lucide-react"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface AssetDetailModalProps {
  ativo: RendaVariavel & {
    cotacao_atual?: number
    variacao?: number
    valor_atual?: number
    lucro_prejuizo?: number
    lucro_prejuizo_percent?: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetDetailModal({ ativo, open, onOpenChange }: AssetDetailModalProps) {
  const tipo = TIPOS_RENDA_VARIAVEL[ativo.tipo as keyof typeof TIPOS_RENDA_VARIAVEL]
  const lucro = ativo.lucro_prejuizo || 0
  const lucroPct = ativo.lucro_prejuizo_percent || 0
  const valorInvestido = ativo.quantidade * ativo.preco_medio
  const router = useRouter()

  const isCrypto = ativo.tipo?.toLowerCase() === "criptomoeda"
  const quantityDecimals = isCrypto ? 8 : 0

  const [indicators, setIndicators] = useState<StockIndicators | null>(null)
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false)
  const [activeTab, setActiveTab] = useState("visao-geral")

  const [isEditingPM, setIsEditingPM] = useState(false)
  const [newPrecoMedio, setNewPrecoMedio] = useState(ativo.preco_medio.toString())
  const [newDataCompra, setNewDataCompra] = useState(ativo.data_compra || "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && activeTab === "indicadores") {
      fetchIndicators()
    }
  }, [open, activeTab, ativo.ticker])

  useEffect(() => {
    setNewPrecoMedio(ativo.preco_medio.toString())
    setNewDataCompra(ativo.data_compra || "")
  }, [ativo])

  const fetchIndicators = async () => {
    setIsLoadingIndicators(true)
    try {
      const response = await fetch(`/api/investments/historico?ticker=${ativo.ticker}&range=1y&indicators=true`)
      if (response.ok) {
        const data = await response.json()
        if (data.indicators) {
          setIndicators(data.indicators)
        }
      }
    } catch (error) {
      console.error("Error fetching indicators:", error)
    }
    setIsLoadingIndicators(false)
  }

  const handleSavePrecoMedio = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("renda_variavel")
        .update({
          preco_medio: Number.parseFloat(newPrecoMedio),
          data_compra: newDataCompra || null,
        })
        .eq("id", ativo.id)

      if (!error) {
        setIsEditingPM(false)
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating preco medio:", error)
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-hidden border-primary/20 bg-background flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-primary flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${tipo?.color}20`, color: tipo?.color }}
            >
              {ativo.ticker.slice(0, 2)}
            </div>
            <div>
              <span className="text-xl">{ativo.ticker}</span>
              <Badge
                variant="outline"
                className="ml-2 text-xs"
                style={{ borderColor: tipo?.color, color: tipo?.color }}
              >
                {tipo?.label}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {ativo.setor || "Sem setor definido"} {ativo.corretora && `• ${ativo.corretora}`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 flex-1">
          {/* Summary Cards - Same grid style as add dialog */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
            <Card className="border-primary/20 bg-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Quantidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {ativo.quantidade.toLocaleString("pt-BR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: quantityDecimals,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{isCrypto ? "unidades" : "cotas/acoes"}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-background">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Preco Medio</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingPM(!isEditingPM)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingPM ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={newPrecoMedio}
                      onChange={(e) => setNewPrecoMedio(e.target.value)}
                      className="h-8 text-sm border-primary/20 bg-background"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={handleSavePrecoMedio}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold">{formatCurrency(ativo.preco_medio)}</p>
                    <p className="text-xs text-muted-foreground">por unidade</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Cotacao Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-primary">{formatCurrency(ativo.cotacao_atual || 0)}</p>
                <div
                  className={`flex items-center gap-1 text-xs ${(ativo.variacao || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(ativo.variacao || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {(ativo.variacao || 0) >= 0 ? "+" : ""}
                  {(ativo.variacao || 0).toFixed(2)}% hoje
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Valor Investido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatCurrency(valorInvestido)}</p>
                <p className="text-xs text-muted-foreground">total aplicado</p>
              </CardContent>
            </Card>
          </div>

          {/* Edit Date when editing PM */}
          {isEditingPM && (
            <div className="space-y-2 mt-2">
              <Label className="text-sm text-muted-foreground">Data da Compra (para este PM)</Label>
              <Input
                type="date"
                value={newDataCompra}
                onChange={(e) => setNewDataCompra(e.target.value)}
                className="border-primary/20 bg-background"
              />
            </div>
          )}

          {/* Profit/Loss Card */}
          <Card
            className={`mt-4 border-2 ${lucro >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro/Prejuizo Total</p>
                  <p className={`text-2xl font-bold ${lucro >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {lucro >= 0 ? "+" : ""}
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`flex items-center gap-2 text-lg font-semibold ${lucro >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {lucro >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {lucro >= 0 ? "+" : ""}
                    {formatPercent(lucroPct)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor atual: {formatCurrency(ativo.valor_atual || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ativo.data_compra && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-background">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Data da Compra</p>
                  <p className="font-medium text-sm">{new Date(ativo.data_compra).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            )}
            {ativo.setor && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-background">
                <Building2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Setor</p>
                  <p className="font-medium text-sm">{ativo.setor}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs for Charts and Indicators */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger
                value="visao-geral"
                className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="h-3 w-3" />
                <span className="hidden sm:inline">Resumo</span>
              </TabsTrigger>
              <TabsTrigger
                value="grafico"
                className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LineChart className="h-3 w-3" />
                <span className="hidden sm:inline">Grafico</span>
              </TabsTrigger>
              <TabsTrigger
                value="ohlc"
                className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CandlestickChartIcon className="h-3 w-3" />
                <span className="hidden sm:inline">OHLC</span>
              </TabsTrigger>
              <TabsTrigger
                value="indicadores"
                className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Activity className="h-3 w-3" />
                <span className="hidden sm:inline">Indicadores</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="visao-geral" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {ativo.observacoes ? (
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Observacoes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{ativo.observacoes}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto opacity-30 mb-3" />
                      <p>Selecione outra aba para ver graficos e indicadores</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="grafico" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <PriceEvolutionChart ticker={ativo.ticker} precoMedio={ativo.preco_medio} />
                </motion.div>
              </TabsContent>

              <TabsContent value="ohlc" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CandlestickChart ticker={ativo.ticker} precoMedio={ativo.preco_medio} />
                </motion.div>
              </TabsContent>

              <TabsContent value="indicadores" className="space-y-4 mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {isLoadingIndicators ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Carregando indicadores...</p>
                    </div>
                  ) : indicators ? (
                    <>
                      <IndicatorsCard indicators={indicators} ticker={ativo.ticker} />
                      {indicators.dailyReturns && indicators.dailyReturns.length > 0 && (
                        <VolatilityChart
                          dailyReturns={indicators.dailyReturns}
                          volatility={indicators.volatility}
                          ticker={ativo.ticker}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-muted-foreground">
                      <Activity className="h-12 w-12 opacity-30" />
                      <p>Nenhum indicador disponivel</p>
                      <Button variant="outline" onClick={fetchIndicators}>
                        Carregar Indicadores
                      </Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
