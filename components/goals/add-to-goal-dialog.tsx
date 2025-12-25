"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Objetivo, Caixinha } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const valorNum = Number.parseFloat(valor)
    const novoValor = objetivo.valor_atual + valorNum

    await supabase.from("objetivos").update({ valor_atual: novoValor }).eq("id", objetivo.id)

    if (caixinhaId !== "none") {
      const caixinha = caixinhasVinculadas.find((c) => c.id === caixinhaId)
      if (caixinha) {
        await supabase
          .from("caixinhas")
          .update({ saldo: caixinha.saldo + valorNum })
          .eq("id", caixinhaId)
      }
    }

    setIsLoading(false)
    setValor("")
    setCaixinhaId("none")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 fixed top-[20%] left-1/2 -translate-x-1/2 translate-y-0 z-[100]">
        <DialogHeader>
          <DialogTitle>Adicionar ao Objetivo</DialogTitle>
          <DialogDescription>Adicione um valor ao seu objetivo {objetivo.nome}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{objetivo.nome}</p>
            <p className="font-semibold">
              {formatCurrency(objetivo.valor_atual)} / {formatCurrency(objetivo.valor_total)}
            </p>
          </div>

          {caixinhasVinculadas.length > 0 && (
            <div className="space-y-2">
              <Label>Atualizar caixinha vinculada?</Label>
              <Select value={caixinhaId} onValueChange={setCaixinhaId}>
                <SelectTrigger className="border-primary/20 bg-background/50">
                  <SelectValue placeholder="Nenhuma (apenas objetivo)" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20 z-[200]">
                  <SelectItem value="none">Nenhuma (apenas objetivo)</SelectItem>
                  {caixinhasVinculadas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({formatCurrency(c.saldo)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Se selecionar, o valor sera adicionado tambem na caixinha</p>
            </div>
          )}

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
