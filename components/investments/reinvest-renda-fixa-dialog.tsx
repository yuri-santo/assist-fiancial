"use client"

import type React from "react"
import { useId, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RefreshCcw } from "lucide-react"
import type { RendaFixa } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Props = {
  investimento: RendaFixa
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReinvestRendaFixaDialog({ investimento, open, onOpenChange }: Props) {
  const formId = useId()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    valor_aporte: "",
    data: new Date().toISOString().split("T")[0],
    observacoes: "",
  })

  const reset = () => {
    setError(null)
    setFormData({
      valor_aporte: "",
      data: new Date().toISOString().split("T")[0],
      observacoes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const aporte = Number.parseFloat(String(formData.valor_aporte).replace(",", "."))
    if (!Number.isFinite(aporte) || aporte <= 0) {
      setError("Informe um valor de aporte válido.")
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Você precisa estar logado.")
      return
    }

    // 1) histórico (transação)
    const { error: txErr } = await supabase.from("transacoes_investimento").insert({
      user_id: user.id,
      investimento_id: investimento.id,
      tipo_investimento: "renda_fixa",
      tipo_operacao: "compra",
      quantidade: null,
      valor: aporte,
      data: formData.data,
      observacoes: formData.observacoes || null,
    })
    if (txErr) {
      setError(txErr.message)
      return
    }

    // 2) consolida (soma no investido e no atual; você pode ajustar depois caso queira marcar valor atual diferente)
    const novoInvestido = Number(investimento.valor_investido || 0) + aporte
    const novoAtual = Number(investimento.valor_atual || 0) + aporte

    const { error: updErr } = await supabase
      .from("renda_fixa")
      .update({
        valor_investido: novoInvestido,
        valor_atual: novoAtual,
      })
      .eq("id", investimento.id)
      .eq("user_id", user.id)

    if (updErr) {
      setError(updErr.message)
      return
    }

    onOpenChange(false)
    reset()
    startTransition(() => router.refresh())
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="border-primary/20 bg-background max-w-[95vw] sm:max-w-xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="text-primary flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reinvestir – Renda Fixa
          </DialogTitle>
          <DialogDescription>
            Registra um novo aporte no histórico e soma no valor investido/atual.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
        >
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Aplicação</Label>
            <Input value={investimento.nome} disabled className="border-primary/20 bg-background" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-valor`}>Valor do aporte *</Label>
              <Input
                id={`${formId}-valor`}
                inputMode="decimal"
                placeholder="Ex: 500"
                value={formData.valor_aporte}
                onChange={(e) => setFormData((p) => ({ ...p, valor_aporte: e.target.value }))}
                className="border-primary/20 bg-background"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-data`}>Data *</Label>
              <Input
                id={`${formId}-data`}
                type="date"
                value={formData.data}
                onChange={(e) => setFormData((p) => ({ ...p, data: e.target.value }))}
                className="border-primary/20 bg-background"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-obs`}>Observações</Label>
            <Textarea
              id={`${formId}-obs`}
              value={formData.observacoes}
              onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
              placeholder="Ex: reinvestimento de juros, aporte mensal, etc."
              className="border-primary/20 bg-background min-h-[90px]"
            />
          </div>

          <div className="pb-6 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 neon-glow" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Aplicar reinvestimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
