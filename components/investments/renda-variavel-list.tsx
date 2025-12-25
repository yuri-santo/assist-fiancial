"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, TrendingUp, TrendingDown, Loader2, Eye } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"
import type { RendaVariavel } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AssetDetailModal } from "./asset-detail-modal"

interface RendaVariavelListProps {
  ativos: RendaVariavel[]
}

export function RendaVariavelList({ ativos }: RendaVariavelListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [selectedAtivo, setSelectedAtivo] = useState<RendaVariavel | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    await supabase.from("renda_variavel").delete().eq("id", deleteId)
    setDeleteId(null)

    startTransition(() => {
      router.refresh()
    })
  }

  const handleViewAsset = (ativo: RendaVariavel) => {
    setSelectedAtivo(ativo)
    setIsDetailOpen(true)
  }

  if (ativos.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">Nenhum ativo cadastrado. Adicione seu primeiro investimento!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="card-3d glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="text-lg neon-text-subtle">Meus Ativos</CardTitle>
          </CardHeader>
          <CardContent className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Ticker</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-right text-muted-foreground">Qtd</TableHead>
                  <TableHead className="text-right text-muted-foreground">PM</TableHead>
                  <TableHead className="text-right text-muted-foreground">Cotacao</TableHead>
                  <TableHead className="text-right text-muted-foreground">Var. Dia</TableHead>
                  <TableHead className="text-right text-muted-foreground">Valor Atual</TableHead>
                  <TableHead className="text-right text-muted-foreground">Lucro/Prej</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {ativos.map((ativo, index) => {
                    const tipoInfo = TIPOS_RENDA_VARIAVEL[ativo.tipo]
                    const isPositive = (ativo.lucro_prejuizo || 0) >= 0
                    const variacaoDiaPositive = (ativo.variacao || 0) >= 0

                    return (
                      <motion.tr
                        key={ativo.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-primary/10 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleViewAsset(ativo)}
                      >
                        <TableCell className="font-bold">{ativo.ticker}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: tipoInfo?.color,
                              color: tipoInfo?.color,
                              boxShadow: `0 0 10px ${tipoInfo?.color}40`,
                            }}
                          >
                            {tipoInfo?.label || ativo.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {ativo.tipo === "cripto" ? Number(ativo.quantidade).toFixed(8) : ativo.quantidade}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(ativo.preco_medio)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ativo.cotacao_atual || ativo.preco_medio)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`flex items-center justify-end gap-1 ${variacaoDiaPositive ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {variacaoDiaPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {variacaoDiaPositive ? "+" : ""}
                            {formatPercent(ativo.variacao || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ativo.valor_atual || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={isPositive ? "text-emerald-400" : "text-red-400"}>
                            <span className="font-medium">
                              {isPositive ? "+" : ""}
                              {formatCurrency(ativo.lucro_prejuizo || 0)}
                            </span>
                            <br />
                            <span className="text-xs opacity-70">
                              ({isPositive ? "+" : ""}
                              {formatPercent(ativo.lucro_prejuizo_percent || 0)})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewAsset(ativo)
                              }}
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(ativo.id)
                              }}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {selectedAtivo && <AssetDetailModal ativo={selectedAtivo} open={isDetailOpen} onOpenChange={setIsDetailOpen} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-primary/20 z-[101]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-primary/20">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
