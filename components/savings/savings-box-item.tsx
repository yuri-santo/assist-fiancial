"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { MoreVertical, Pencil, Trash, PiggyBank, Plus, Minus, ArrowRightLeft, Target } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Caixinha, Objetivo } from "@/lib/types"
import { SavingsBoxForm } from "@/components/forms/savings-box-form"
import { TransferDialog } from "@/components/savings/transfer-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface SavingsBoxItemProps {
  caixinha: Caixinha
  caixinhas: Caixinha[]
  objetivos: Objetivo[]
  userId: string
}

export function SavingsBoxItem({ caixinha, caixinhas, objetivos, userId }: SavingsBoxItemProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingMoney, setAddingMoney] = useState(false)
  const [removingMoney, setRemovingMoney] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [valor, setValor] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from("caixinhas").delete().eq("id", caixinha.id)
    setDeleting(false)
    router.refresh()
  }

  const handleAddMoney = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const valorNum = Number.parseFloat(valor)
    const novoSaldo = caixinha.saldo + valorNum

    // Update caixinha
    await supabase.from("caixinhas").update({ saldo: novoSaldo }).eq("id", caixinha.id)

    // If linked to objetivo, update objetivo valor_atual
    if (caixinha.objetivo_id) {
      const objetivo = objetivos.find((o) => o.id === caixinha.objetivo_id)
      if (objetivo) {
        await supabase
          .from("objetivos")
          .update({ valor_atual: objetivo.valor_atual + valorNum })
          .eq("id", caixinha.objetivo_id)
      }
    }

    setIsLoading(false)
    setValor("")
    setAddingMoney(false)
    router.refresh()
  }

  const handleRemoveMoney = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const valorNum = Number.parseFloat(valor)
    const novoSaldo = Math.max(0, caixinha.saldo - valorNum)
    const diferencaReal = caixinha.saldo - novoSaldo

    // Update caixinha
    await supabase.from("caixinhas").update({ saldo: novoSaldo }).eq("id", caixinha.id)

    // If linked to objetivo, update objetivo valor_atual
    if (caixinha.objetivo_id) {
      const objetivo = objetivos.find((o) => o.id === caixinha.objetivo_id)
      if (objetivo) {
        await supabase
          .from("objetivos")
          .update({ valor_atual: Math.max(0, objetivo.valor_atual - diferencaReal) })
          .eq("id", caixinha.objetivo_id)
      }
    }

    setIsLoading(false)
    setValor("")
    setRemovingMoney(false)
    router.refresh()
  }

  // Calculate progress if linked to objetivo
  const objetivoVinculado = caixinha.objetivo_id ? objetivos.find((o) => o.id === caixinha.objetivo_id) : null
  const progressoObjetivo = objetivoVinculado
    ? Math.min((caixinha.saldo / objetivoVinculado.valor_total) * 100, 100)
    : 0

  return (
    <>
      <Card className="overflow-hidden glass-card hover:border-primary/30 transition-colors">
        <div className="h-1.5" style={{ backgroundColor: caixinha.cor }} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${caixinha.cor}20` }}
              >
                <PiggyBank className="h-5 w-5" style={{ color: caixinha.cor }} />
              </div>
              <div>
                <h3 className="font-semibold">{caixinha.nome}</h3>
                {objetivoVinculado && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>{objetivoVinculado.nome}</span>
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-primary/20">
                <DropdownMenuItem onClick={() => setAddingMoney(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4 text-emerald-400" />
                  Depositar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRemovingMoney(true)} className="cursor-pointer">
                  <Minus className="mr-2 h-4 w-4 text-red-400" />
                  Retirar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransferring(true)} className="cursor-pointer">
                  <ArrowRightLeft className="mr-2 h-4 w-4 text-cyan-400" />
                  Transferir
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

          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className="text-2xl font-bold" style={{ color: caixinha.cor }}>
              {formatCurrency(caixinha.saldo)}
            </p>
          </div>

          {objetivoVinculado && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso do objetivo</span>
                <span>{progressoObjetivo.toFixed(0)}%</span>
              </div>
              <Progress value={progressoObjetivo} className="h-1.5" />
              <p className="text-xs text-muted-foreground">Meta: {formatCurrency(objetivoVinculado.valor_total)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs remain the same */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Editar Caixinha</DialogTitle>
          </DialogHeader>
          <SavingsBoxForm
            userId={userId}
            objetivos={objetivos}
            caixinha={caixinha}
            onSuccess={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addingMoney} onOpenChange={setAddingMoney}>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Depositar na Caixinha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-background/30 p-3">
              <p className="text-sm text-muted-foreground">{caixinha.nome}</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(caixinha.saldo)}</p>
              {objetivoVinculado && (
                <p className="text-xs text-primary mt-1">Vinculado ao objetivo: {objetivoVinculado.nome}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="border-primary/20 bg-background/50"
              />
            </div>
            <Button onClick={handleAddMoney} className="w-full neon-glow" disabled={isLoading || !valor}>
              {isLoading ? "Depositando..." : "Depositar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removingMoney} onOpenChange={setRemovingMoney}>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Retirar da Caixinha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-background/30 p-3">
              <p className="text-sm text-muted-foreground">{caixinha.nome}</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(caixinha.saldo)}</p>
              {objetivoVinculado && (
                <p className="text-xs text-amber-400 mt-1">
                  Atencao: Isso tambem reduzira o valor do objetivo vinculado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                max={caixinha.saldo}
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="border-primary/20 bg-background/50"
              />
            </div>
            <Button onClick={handleRemoveMoney} className="w-full" variant="destructive" disabled={isLoading || !valor}>
              {isLoading ? "Retirando..." : "Retirar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TransferDialog
        caixinhaOrigem={caixinha}
        caixinhas={caixinhas}
        open={transferring}
        onOpenChange={setTransferring}
        userId={userId}
      />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caixinha?</AlertDialogTitle>
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
