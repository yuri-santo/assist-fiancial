"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { MoreVertical, Pencil, Trash, Target, Plus, PiggyBank } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDate } from "@/lib/utils/date"
import type { Objetivo, Caixinha } from "@/lib/types"
import { GoalForm } from "@/components/forms/goal-form"
import { AddToGoalDialog } from "@/components/goals/add-to-goal-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface GoalItemProps {
  objetivo: Objetivo
  userId: string
}

export function GoalItem({ objetivo, userId }: GoalItemProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [caixinhasVinculadas, setCaixinhasVinculadas] = useState<Caixinha[]>([])

  useEffect(() => {
    const fetchCaixinhas = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("caixinhas").select("*").eq("objetivo_id", objetivo.id)
      if (data) {
        setCaixinhasVinculadas(data as Caixinha[])
      }
    }
    fetchCaixinhas()
  }, [objetivo.id])

  const porcentagem = (objetivo.valor_atual / objetivo.valor_total) * 100
  const falta = objetivo.valor_total - objetivo.valor_atual

  const totalCaixinhas = caixinhasVinculadas.reduce((sum, c) => sum + c.saldo, 0)

  let mensalNecessario = 0
  if (objetivo.prazo && falta > 0) {
    const prazoDate = new Date(objetivo.prazo)
    const hoje = new Date()
    const meses = Math.max(
      1,
      (prazoDate.getFullYear() - hoje.getFullYear()) * 12 + (prazoDate.getMonth() - hoje.getMonth()),
    )
    mensalNecessario = falta / meses
  }

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from("objetivos").delete().eq("id", objetivo.id)
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      <Card className="overflow-hidden glass-card hover:border-primary/30 transition-colors">
        <div className="h-2" style={{ backgroundColor: objetivo.cor }} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${objetivo.cor}20` }}
              >
                <Target className="h-5 w-5" style={{ color: objetivo.cor }} />
              </div>
              <div>
                <h3 className="font-semibold">{objetivo.nome}</h3>
                <p className="text-sm text-muted-foreground capitalize">{objetivo.tipo}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-primary/20">
                <DropdownMenuItem onClick={() => setAdding(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar valor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(true)} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleting(true)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold" style={{ color: objetivo.cor }}>
                {porcentagem.toFixed(0)}%
              </span>
            </div>

            <Progress value={Math.min(porcentagem, 100)} className="h-3" />

            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Guardado</p>
                <p className="font-semibold">{formatCurrency(objetivo.valor_atual)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Meta</p>
                <p className="font-semibold">{formatCurrency(objetivo.valor_total)}</p>
              </div>
            </div>

            {caixinhasVinculadas.length > 0 && (
              <div className="rounded-lg bg-primary/5 p-2 border border-primary/10">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <PiggyBank className="h-3 w-3" />
                  <span>Caixinhas vinculadas:</span>
                </div>
                {caixinhasVinculadas.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs">
                    <span>{c.nome}</span>
                    <span className="font-medium">{formatCurrency(c.saldo)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-primary/10">
                  <span className="font-medium">Total</span>
                  <span className="font-medium text-primary">{formatCurrency(totalCaixinhas)}</span>
                </div>
              </div>
            )}

            {falta > 0 && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">Falta {formatCurrency(falta)}</p>
                {mensalNecessario > 0 && (
                  <p className="mt-1 font-medium">Guardar {formatCurrency(mensalNecessario)}/mes</p>
                )}
                {objetivo.prazo && (
                  <p className="mt-1 text-xs text-muted-foreground">Prazo: {formatDate(objetivo.prazo)}</p>
                )}
              </div>
            )}

            {porcentagem >= 100 && (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                <p className="font-semibold text-emerald-600">Objetivo alcancado!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="glass-card border-primary/20 fixed top-[15%] left-1/2 -translate-x-1/2 translate-y-0 z-[100]">
          <DialogHeader>
            <DialogTitle>Editar Objetivo</DialogTitle>
            <DialogDescription>Atualize as informacoes do seu objetivo</DialogDescription>
          </DialogHeader>
          <GoalForm userId={userId} objetivo={objetivo} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <AddToGoalDialog
        objetivo={objetivo}
        caixinhasVinculadas={caixinhasVinculadas}
        open={adding}
        onOpenChange={setAdding}
      />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
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
