"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Minus, Pencil, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils/currency"
import type { Objetivo } from "@/lib/types"

interface ReserveActionsProps {
  reserva: Objetivo
  mediaDespesas: number
}

export function ReserveActions({ reserva, mediaDespesas }: ReserveActionsProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [valor, setValor] = useState("")
  const [meses, setMeses] = useState(
    mediaDespesas > 0 ? Math.round(reserva.valor_total / mediaDespesas).toString() : "6",
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const novoValor = reserva.valor_atual + Number.parseFloat(valor)
    await supabase.from("objetivos").update({ valor_atual: novoValor }).eq("id", reserva.id)
    setIsLoading(false)
    setValor("")
    setAddOpen(false)
    router.refresh()
  }

  const handleRemove = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const novoValor = Math.max(0, reserva.valor_atual - Number.parseFloat(valor))
    await supabase.from("objetivos").update({ valor_atual: novoValor }).eq("id", reserva.id)
    setIsLoading(false)
    setValor("")
    setRemoveOpen(false)
    router.refresh()
  }

  const handleEdit = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const novaMeta = mediaDespesas * Number.parseInt(meses)
    await supabase.from("objetivos").update({ valor_total: novaMeta }).eq("id", reserva.id)
    setIsLoading(false)
    setEditOpen(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      {/* Add Money Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 neon-glow">
            <Plus className="h-4 w-4" />
            Depositar
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Depositar na Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-background/30 p-3">
              <p className="text-sm text-muted-foreground">Reserva de Emergencia</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(reserva.valor_atual)}</p>
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
            <Button onClick={handleAdd} className="w-full neon-glow" disabled={isLoading || !valor}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Depositar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Money Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Minus className="h-4 w-4" />
            Retirar
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Retirar da Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-background/30 p-3">
              <p className="text-sm text-muted-foreground">Reserva de Emergencia</p>
              <p className="font-semibold">Saldo atual: {formatCurrency(reserva.valor_atual)}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm text-amber-400">
                Lembre-se: a reserva de emergencia deve ser usada apenas em situacoes realmente urgentes.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                max={reserva.valor_atual}
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="border-primary/20 bg-background/50"
              />
            </div>
            <Button onClick={handleRemove} variant="destructive" className="w-full" disabled={isLoading || !valor}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
              Retirar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Meta Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Alterar Meta da Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Meta em meses de despesas</Label>
              <RadioGroup value={meses} onValueChange={setMeses} className="grid grid-cols-3 gap-4">
                {["3", "6", "12"].map((m) => (
                  <div key={m}>
                    <RadioGroupItem value={m} id={`${m}meses`} className="peer sr-only" />
                    <Label
                      htmlFor={`${m}meses`}
                      className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-background/30 p-4 hover:bg-primary/5 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-lg font-semibold">{m}</span>
                      <span className="text-xs text-muted-foreground">meses</span>
                      <span className="mt-1 text-xs">{formatCurrency(mediaDespesas * Number.parseInt(m))}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="rounded-lg bg-background/30 p-3">
              <p className="text-sm text-muted-foreground">Nova meta:</p>
              <p className="text-lg font-semibold">{formatCurrency(mediaDespesas * Number.parseInt(meses))}</p>
            </div>

            <Button onClick={handleEdit} className="w-full neon-glow" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Salvar Alteracoes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
