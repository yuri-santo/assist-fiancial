"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PriceEvolutionChart } from "./price-evolution-chart"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import type { RendaVariavel } from "@/lib/types"
import { TrendingUp, TrendingDown, Calendar, Building2 } from "lucide-react"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 max-w-3xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6">
          {/* Resumo do ativo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
              <p className="text-xs text-muted-foreground">Quantidade</p>
              <p className="text-lg font-bold">{ativo.quantidade}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
              <p className="text-xs text-muted-foreground">Preco Medio</p>
              <p className="text-lg font-bold">{formatCurrency(ativo.preco_medio)}</p>
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

          {/* Lucro/Prejuizo */}
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

          {/* Informacoes adicionais */}
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

          {/* Gráfico de evolução */}
          <PriceEvolutionChart ticker={ativo.ticker} precoMedio={ativo.preco_medio} />

          {ativo.observacoes && (
            <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
              <p className="text-sm">{ativo.observacoes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
