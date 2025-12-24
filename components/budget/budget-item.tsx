"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { MoreVertical, Pencil, Trash, AlertTriangle, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Orcamento, Categoria, Despesa } from "@/lib/types"
import { BudgetForm } from "@/components/forms/budget-form"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface BudgetItemProps {
  orcamento: Orcamento
  categorias: Categoria[]
  despesas: Despesa[]
  userId: string
}

export function BudgetItem({ orcamento, categorias, despesas, userId }: BudgetItemProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const gasto = despesas.filter((d) => d.categoria_id === orcamento.categoria_id).reduce((sum, d) => sum + d.valor, 0)

  const porcentagem = (gasto / orcamento.valor_limite) * 100
  const isOverBudget = gasto > orcamento.valor_limite
  const isNearLimit = porcentagem >= 80 && !isOverBudget

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from("orcamentos").delete().eq("id", orcamento.id)
    setDeleting(false)
    router.refresh()
  }

  const categoria = categorias.find((c) => c.id === orcamento.categoria_id)

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${categoria?.cor}20` }}
              >
                {isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : porcentagem >= 100 ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: categoria?.cor }} />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{categoria?.nome || "Categoria"}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(gasto)} de {formatCurrency(orcamento.valor_limite)}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(true)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 space-y-2">
            <Progress
              value={Math.min(porcentagem, 100)}
              className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
            />
            <div className="flex justify-between text-sm">
              <span
                className={`font-medium ${isOverBudget ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-emerald-600"}`}
              >
                {porcentagem.toFixed(0)}% usado
              </span>
              <span className="text-muted-foreground">
                {isOverBudget
                  ? `${formatCurrency(gasto - orcamento.valor_limite)} acima`
                  : `${formatCurrency(orcamento.valor_limite - gasto)} restante`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Orcamento</DialogTitle>
          </DialogHeader>
          <BudgetForm
            userId={userId}
            categorias={categorias}
            orcamento={orcamento}
            mes={orcamento.mes}
            ano={orcamento.ano}
            onSuccess={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orcamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
