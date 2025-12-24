"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { RendaFixa } from "@/lib/types"

interface EditRendaFixaDialogProps {
  investimento: RendaFixa
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditRendaFixaDialog({ investimento, open, onOpenChange }: EditRendaFixaDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [valorAtual, setValorAtual] = useState(investimento.valor_atual.toString())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()

    await supabase
      .from("renda_fixa")
      .update({ valor_atual: Number.parseFloat(valorAtual) })
      .eq("id", investimento.id)

    onOpenChange(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="neon-text">Atualizar Valor - {investimento.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_atual">Valor Atual (R$)</Label>
            <Input
              id="valor_atual"
              type="number"
              step="0.01"
              value={valorAtual}
              onChange={(e) => setValorAtual(e.target.value)}
              className="border-primary/20 bg-background/50"
              required
            />
            <p className="text-xs text-muted-foreground">
              Valor investido: R$ {investimento.valor_investido.toFixed(2)}
            </p>
          </div>

          <Button type="submit" className="w-full neon-glow" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
