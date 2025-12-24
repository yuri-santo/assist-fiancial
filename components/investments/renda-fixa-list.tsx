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
import { Trash2, Edit2, TrendingUp, Clock, Loader2 } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import { TIPOS_RENDA_FIXA, INDEXADORES } from "@/lib/api/brapi"
import type { RendaFixa } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { EditRendaFixaDialog } from "./edit-renda-fixa-dialog"

interface RendaFixaListProps {
  investimentos: RendaFixa[]
}

export function RendaFixaList({ investimentos }: RendaFixaListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editInvestimento, setEditInvestimento] = useState<RendaFixa | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    await supabase.from("renda_fixa").delete().eq("id", deleteId)
    setDeleteId(null)
    startTransition(() => {
      router.refresh()
    })
  }

  if (investimentos.length === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">Nenhuma aplicacao cadastrada. Adicione seu primeiro investimento!</p>
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
            <CardTitle className="text-lg neon-text-subtle">Minhas Aplicacoes</CardTitle>
          </CardHeader>
          <CardContent className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Taxa</TableHead>
                  <TableHead className="text-right text-muted-foreground">Investido</TableHead>
                  <TableHead className="text-right text-muted-foreground">Atual</TableHead>
                  <TableHead className="text-right text-muted-foreground">Rendimento</TableHead>
                  <TableHead className="text-right text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {investimentos.map((inv, index) => {
                    const tipoInfo = TIPOS_RENDA_FIXA[inv.tipo]
                    const indexadorInfo = inv.indexador ? INDEXADORES[inv.indexador] : null

                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-primary/10 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.nome}</p>
                            <p className="text-xs text-muted-foreground">{inv.instituicao}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: tipoInfo?.color,
                              color: tipoInfo?.color,
                              boxShadow: `0 0 10px ${tipoInfo?.color}40`,
                            }}
                          >
                            {tipoInfo?.label || inv.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {inv.taxa}% {indexadorInfo?.label || ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.valor_investido)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.valor_atual)}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-emerald-400">
                            <span className="flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3" />+{formatCurrency(inv.rendimento || 0)}
                            </span>
                            <span className="text-xs opacity-70">+{formatPercent(inv.rendimento_percent || 0)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.data_vencimento ? (
                            <div>
                              <p className="text-sm">{new Date(inv.data_vencimento).toLocaleDateString("pt-BR")}</p>
                              {inv.dias_restantes !== null && (
                                <p
                                  className={`text-xs flex items-center justify-end gap-1 ${
                                    inv.dias_restantes <= 30
                                      ? "text-amber-400"
                                      : inv.dias_restantes <= 90
                                        ? "text-cyan-400"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {inv.dias_restantes} dias
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditInvestimento(inv)}
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(inv.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aplicacao? Esta acao nao pode ser desfeita.
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

      {editInvestimento && (
        <EditRendaFixaDialog
          investimento={editInvestimento}
          open={!!editInvestimento}
          onOpenChange={(open) => !open && setEditInvestimento(null)}
        />
      )}
    </>
  )
}
