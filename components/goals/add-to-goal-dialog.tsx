"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Objetivo } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"

interface AddToGoalDialogProps {
  objetivo: Objetivo
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddToGoalDialog({ objetivo, open, onOpenChange }: AddToGoalDialogProps) {
  const router = useRouter()
  const [valor, setValor] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const novoValor = objetivo.valor_atual + Number.parseFloat(valor)

    await supabase.from("objetivos").update({ valor_atual: novoValor }).eq("id", objetivo.id)

    setIsLoading(false)
    setValor("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar ao Objetivo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{objetivo.nome}</p>
            <p className="font-semibold">
              {formatCurrency(objetivo.valor_atual)} / {formatCurrency(objetivo.valor_total)}
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
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
