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
import { MoreVertical, Pencil, Trash, PiggyBank, Plus, Minus, ArrowRightLeft } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Caixinha, Objetivo } from "@/lib/types"
import { SavingsBoxForm } from "@/components/forms/savings-box-form"
import { TransferDialog } from "@/components/savings/transfer-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    const novoSaldo = caixinha.saldo + Number.parseFloat(valor)
    await supabase.from("caixinhas").update({ saldo: novoSaldo }).eq("id", caixinha.id)
    setIsLoading(false)
    setValor("")
    setAddingMoney(false)
    router.refresh()
  }

  const handleRemoveMoney = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const novoSaldo = Math.max(0, caixinha.saldo - Number.parseFloat(valor))
    await supabase.from("caixinhas").update({ saldo: novoSaldo }).eq("id", caixinha.id)
    setIsLoading(false)
    setValor("")
    setRemovingMoney(false)
    router.refresh()
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: caixinha.cor }} />
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
                {caixinha.objetivo && (
                  <p className="text-xs text-muted-foreground">Vinculado: {caixinha.objetivo.nome}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddingMoney(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Depositar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRemovingMoney(true)}>
                  <Minus className="mr-2 h-4 w-4" />
                  Retirar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransferring(true)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transferir
                </DropdownMenuItem>
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

          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className="text-2xl font-bold" style={{ color: caixinha.cor }}>
              {formatCurrency(caixinha.saldo)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depositar na Caixinha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">{caixinha.nome}</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(caixinha.saldo)}</p>
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
              />
            </div>
            <Button onClick={handleAddMoney} className="w-full" disabled={isLoading || !valor}>
              {isLoading ? "Depositando..." : "Depositar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removingMoney} onOpenChange={setRemovingMoney}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar da Caixinha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">{caixinha.nome}</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(caixinha.saldo)}</p>
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
              />
            </div>
            <Button onClick={handleRemoveMoney} className="w-full" disabled={isLoading || !valor}>
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
        <AlertDialogContent>
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
