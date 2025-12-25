"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, TrendingDown, Activity, Shield, Zap, BarChart3, Info } from "lucide-react"
import type { StockIndicators } from "@/lib/api/stock-service"
import { motion } from "framer-motion"

interface IndicatorsCardProps {
  indicators: StockIndicators
  ticker: string
}

export function IndicatorsCard({ indicators, ticker }: IndicatorsCardProps) {
  const riskColors = {
    baixo: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    moderado: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    alto: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
    muito_alto: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  }

  const riskLabels = {
    baixo: "Baixo Risco",
    moderado: "Risco Moderado",
    alto: "Alto Risco",
    muito_alto: "Muito Alto Risco",
  }

  const riskColor = riskColors[indicators.riskLevel]

  // RSI interpretation
  const getRSIStatus = (rsi?: number) => {
    if (!rsi) return { label: "N/A", color: "text-muted-foreground" }
    if (rsi > 70) return { label: "Sobrecomprado", color: "text-red-400" }
    if (rsi < 30) return { label: "Sobrevendido", color: "text-emerald-400" }
    return { label: "Neutro", color: "text-amber-400" }
  }

  const rsiStatus = getRSIStatus(indicators.rsi)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-lg neon-text-subtle flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Indicadores Tecnicos - {ticker}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {/* Risk Level Badge */}
          <div className={`p-4 rounded-lg ${riskColor.bg} border ${riskColor.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${riskColor.text}`} />
                <span className="font-medium">Nivel de Risco</span>
              </div>
              <Badge className={`${riskColor.bg} ${riskColor.text} border-none`}>
                {riskLabels[indicators.riskLevel]}
              </Badge>
            </div>
          </div>

          {/* Main Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Volatility */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/30 border border-primary/10 cursor-help">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Zap className="h-3 w-3" />
                      Volatilidade
                      <Info className="h-3 w-3" />
                    </div>
                    <p
                      className={`text-lg font-bold ${indicators.volatility > 30 ? "text-red-400" : indicators.volatility > 20 ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {indicators.volatility.toFixed(1)}%
                    </p>
                    <Progress value={Math.min(indicators.volatility, 100)} className="h-1 mt-1" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Volatilidade anualizada baseada no desvio padrao dos retornos diarios</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Max Drawdown */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/30 border border-primary/10 cursor-help">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <TrendingDown className="h-3 w-3" />
                      Max Drawdown
                      <Info className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-red-400">-{indicators.maxDrawdown.toFixed(1)}%</p>
                    <Progress value={indicators.maxDrawdown} className="h-1 mt-1" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maior queda do pico ao fundo no periodo analisado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* RSI */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/30 border border-primary/10 cursor-help">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3 w-3" />
                      RSI (14)
                      <Info className="h-3 w-3" />
                    </div>
                    <p className={`text-lg font-bold ${rsiStatus.color}`}>{indicators.rsi?.toFixed(1) || "N/A"}</p>
                    <p className={`text-xs ${rsiStatus.color}`}>{rsiStatus.label}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Indice de Forca Relativa (14 dias). Acima de 70 = sobrecomprado, abaixo de 30 = sobrevendido</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Average Volume */}
            <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3" />
                Vol. Medio
              </div>
              <p className="text-lg font-bold">{(indicators.avgVolume / 1000000).toFixed(1)}M</p>
            </div>
          </div>

          {/* Moving Averages */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Medias Moveis</p>
            <div className="grid grid-cols-3 gap-2">
              {indicators.sma20 && (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-xs text-muted-foreground">SMA 20</p>
                  <p className="font-bold text-blue-400">R$ {indicators.sma20.toFixed(2)}</p>
                </div>
              )}
              {indicators.sma50 && (
                <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-xs text-muted-foreground">SMA 50</p>
                  <p className="font-bold text-purple-400">R$ {indicators.sma50.toFixed(2)}</p>
                </div>
              )}
              {indicators.sma200 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-xs text-muted-foreground">SMA 200</p>
                  <p className="font-bold text-amber-400">R$ {indicators.sma200.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bollinger Bands */}
          {indicators.bollingerMiddle && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Bandas de Bollinger</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-xs text-muted-foreground">Superior</p>
                  <p className="font-bold text-red-400">R$ {indicators.bollingerUpper?.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">Media</p>
                  <p className="font-bold text-primary">R$ {indicators.bollingerMiddle.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs text-muted-foreground">Inferior</p>
                  <p className="font-bold text-emerald-400">R$ {indicators.bollingerLower?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* MACD and ATR */}
          <div className="grid grid-cols-2 gap-3">
            {indicators.macd !== undefined && (
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground mb-1">MACD</p>
                <p className={`text-lg font-bold ${indicators.macd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {indicators.macd >= 0 ? "+" : ""}
                  {indicators.macd.toFixed(3)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {indicators.macd >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {indicators.macd >= 0 ? "Tendencia de Alta" : "Tendencia de Baixa"}
                  </span>
                </div>
              </div>
            )}
            {indicators.atr && (
              <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <p className="text-xs text-muted-foreground mb-1">ATR (14)</p>
                <p className="text-lg font-bold text-primary">R$ {indicators.atr.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Amplitude media diaria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
