"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Objetivo, Caixinha } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"
import { PiggyBank, Target } from "lucide-react"

interface AddToGoalDialogProps {
  objetivo: Objetivo
  caixinhasVinculadas?: Caixinha[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddToGoalDialog({ objetivo, caixinhasVinculadas = [], open, onOpenChange }: AddToGoalDialogProps) {
  const router = useRouter()
  const [valor, setValor] = useState("")
  const [caixinhaId, setCaixinhaId] = useState<string>("none")
  const [isLoading, setIsLoading] = useState(false)
  const [allCaixinhas, setAllCaixinhas] = useState<Caixinha[]>([])

  useEffect(() => {
    const fetchCaixinhas = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from("caixinhas").select("*").eq("user_id", user.id)
      if (data) {
        setAllCaixinhas(data as Caixinha[])
      }
    }
    if (open) {
      fetchCaixinhas()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const valorNum = Number.parseFloat(valor)
    const novoValor = objetivo.valor_atual + valorNum

    // Update objetivo
    await supabase.from("objetivos").update({ valor_atual: novoValor }).eq("id", objetivo.id)

    if (caixinhaId !== "none") {
      const caixinha = allCaixinhas.find((c) => c.id === caixinhaId)
      if (caixinha) {
        const updateData: { saldo: number; objetivo_id?: string } = {
          saldo: caixinha.saldo + valorNum,
        }

        // Link caixinha to objetivo if not already linked
        if (caixinha.objetivo_id !== objetivo.id) {
          updateData.objetivo_id = objetivo.id
        }

        await supabase.from("caixinhas").update(updateData).eq("id", caixinhaId)
      }
    }

    setIsLoading(false)
    setValor("")
    setCaixinhaId("none")
    onOpenChange(false)
    router.refresh()
  }

  const falta = objetivo.valor_total - objetivo.valor_atual
  const linkedCaixinhas = allCaixinhas.filter((c) => c.objetivo_id === objetivo.id)
  const unlinkedCaixinhas = allCaixinhas.filter((c) => !c.objetivo_id || c.objetivo_id !== objetivo.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Adicionar ao Objetivo
          </DialogTitle>
          <DialogDescription>Adicione um valor ao seu objetivo {objetivo.nome}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{objetivo.nome}</p>
            <p className="font-semibold">
              {formatCurrency(objetivo.valor_atual)} / {formatCurrency(objetivo.valor_total)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Falta: {formatCurrency(falta)}</p>
          </div>

          {linkedCaixinhas.length > 0 && (
            <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <PiggyBank className="h-3 w-3" /> Caixinhas vinculadas:
              </p>
              {linkedCaixinhas.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span>{c.nome}</span>
                  <span className="font-medium">{formatCurrency(c.saldo)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Depositar em caixinha (opcional)</Label>
            <Select value={caixinhaId} onValueChange={setCaixinhaId}>
              <SelectTrigger className="border-primary/20 bg-background/50">
                <SelectValue placeholder="Nenhuma (apenas objetivo)" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="none">Nenhuma (apenas objetivo)</SelectItem>
                {linkedCaixinhas.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground">Vinculadas</div>
                    {linkedCaixinhas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({formatCurrency(c.saldo)})
                      </SelectItem>
                    ))}
                  </>
                )}
                {unlinkedCaixinhas.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground">Outras caixinhas</div>
                    {unlinkedCaixinhas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({formatCurrency(c.saldo)})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ao selecionar, o valor sera depositado na caixinha e vinculada ao objetivo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor a adicionar (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="border-primary/20 bg-background/50"
              required
            />
          </div>
          <Button type="submit" className="w-full neon-glow" disabled={isLoading}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
