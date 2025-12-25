"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "lucide-react"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface AssetDetailDialogProps {
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

export function AssetDetailDialog({ ativo, open, onOpenChange }: AssetDetailDialogProps) {
  const tipo = TIPOS_RENDA_VARIAVEL[ativo.tipo as keyof typeof TIPOS_RENDA_VARIAVEL]
  const lucro = ativo.lucro_prejuizo || 0
  const lucroPct = ativo.lucro_prejuizo_percent || 0
  const router = useRouter()

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
      console.error("[v0] Error fetching indicators:", error)
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
      console.error("[v0] Error updating preco medio:", error)
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold neon-text">{ativo.ticker}</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${tipo?.color}20`, color: tipo?.color }}
            >
              {tipo?.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="visao-geral" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="grafico" className="flex items-center gap-1">
              <LineChart className="h-4 w-4" />
              Grafico
            </TabsTrigger>
            <TabsTrigger value="ohlc" className="flex items-center gap-1">
              <CandlestickChartIcon className="h-4 w-4" />
              OHLC
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Indicadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground">Quantidade</p>
                <p className="text-lg font-bold">{ativo.quantidade}</p>
              </div>

              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Preco Medio</p>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsEditingPM(!isEditingPM)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                {isEditingPM ? (
                  <div className="space-y-2 mt-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={newPrecoMedio}
                      onChange={(e) => setNewPrecoMedio(e.target.value)}
                      className="h-7 text-sm"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-6 text-xs flex-1"
                        onClick={handleSavePrecoMedio}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg font-bold">{formatCurrency(ativo.preco_medio)}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground">Cotacao Atual</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(ativo.cotacao_atual || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground">Valor Investido</p>
                <p className="text-lg font-bold">{formatCurrency(ativo.quantidade * ativo.preco_medio)}</p>
              </div>
            </div>

            {isEditingPM && (
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <Label className="text-xs text-muted-foreground">Data da Compra</Label>
                <Input
                  type="date"
                  value={newDataCompra}
                  onChange={(e) => setNewDataCompra(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Profit/Loss */}
            <div
              className={`p-4 rounded-lg border ${lucro >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro/Prejuizo Total</p>
                  <p className={`text-2xl font-bold ${lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {lucro >= 0 ? "+" : ""}
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`flex items-center gap-1 text-lg font-medium ${lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {lucro >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {lucro >= 0 ? "+" : ""}
                    {formatPercent(lucroPct)}
                  </div>
                  <p className="text-xs text-muted-foreground">Valor atual: {formatCurrency(ativo.valor_atual || 0)}</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              {ativo.data_compra && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Data da compra: {new Date(ativo.data_compra).toLocaleDateString("pt-BR")}
                </div>
              )}
              {ativo.setor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Setor: {ativo.setor}
                </div>
              )}
            </div>

            {ativo.observacoes && (
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                <p className="text-sm">{ativo.observacoes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="grafico">
            <PriceEvolutionChart ticker={ativo.ticker} precoMedio={ativo.preco_medio} />
          </TabsContent>

          <TabsContent value="ohlc">
            <CandlestickChart ticker={ativo.ticker} precoMedio={ativo.preco_medio} />
          </TabsContent>

          <TabsContent value="indicadores" className="space-y-4">
            {isLoadingIndicators ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Carregue os indicadores clicando na aba</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
