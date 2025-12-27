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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCcw } from "lucide-react"
import type { RendaVariavel } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_VARIAVEL } from "@/lib/api/brapi"

type Props = {
  ativo: RendaVariavel
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReinvestRendaVariavelDialog({ ativo, open, onOpenChange }: Props) {
  const formId = useId()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Campos iguais ao "Adicionar", mas aqui tratamos como *compra adicional*.
  // Mantemos dados do ativo (ticker/tipo/moeda/mercado) bloqueados para evitar inconsistências.
  const [formData, setFormData] = useState({
    ticker: ativo.ticker,
    tipo: ativo.tipo,
    quantidade: "",
    preco_medio: "",
    data_compra: new Date().toISOString().split("T")[0],
    corretora: ativo.corretora || "",
    setor: ativo.setor || "",
    moeda: ativo.moeda,
    mercado: ativo.mercado,
    observacoes: "",
  })

  const reset = () => {
    setError(null)
    setFormData({
      ticker: ativo.ticker,
      tipo: ativo.tipo,
      quantidade: "",
      preco_medio: "",
      data_compra: new Date().toISOString().split("T")[0],
      corretora: ativo.corretora || "",
      setor: ativo.setor || "",
      moeda: ativo.moeda,
      mercado: ativo.mercado,
      observacoes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const qty = Number.parseFloat(String(formData.quantidade).replace(",", "."))
    const price = Number.parseFloat(String(formData.preco_medio).replace(",", "."))

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Informe uma quantidade válida para o reinvestimento.")
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Informe um preço válido (preço da compra) para o reinvestimento.")
      return
    }

    const oldQty = Number(ativo.quantidade || 0)
    const oldPM = Number(ativo.preco_medio || 0)
    const newQty = oldQty + qty
    const newPM = newQty > 0 ? (oldPM * oldQty + price * qty) / newQty : price

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Você precisa estar logado.")
      return
    }

    // 1) registra a transação (histórico) – importante para auditoria e para proventos no futuro
    const total = price * qty
    const { error: txErr } = await supabase.from("transacoes_investimento").insert({
      user_id: user.id,
      investimento_id: ativo.id,
      tipo_investimento: "renda_variavel",
      tipo_operacao: "compra",
      quantidade: qty,
      valor: total,
      data: formData.data_compra,
      observacoes: formData.observacoes || null,
    })
    if (txErr) {
      setError(txErr.message)
      return
    }

    // 2) atualiza posição consolidada (quantidade + preço médio)
    const { error: updErr } = await supabase
      .from("renda_variavel")
      .update({
        quantidade: newQty,
        preco_medio: newPM,
        corretora: formData.corretora || null,
        setor: formData.setor || null,
        observacoes: ativo.observacoes || null,
      })
      .eq("id", ativo.id)
      .eq("user_id", user.id)

    if (updErr) {
      setError(updErr.message)
      return
    }

    onOpenChange(false)
    reset()
    startTransition(() => router.refresh())
  }

  const pmPreview = (() => {
    const qty = Number.parseFloat(String(formData.quantidade).replace(",", "."))
    const price = Number.parseFloat(String(formData.preco_medio).replace(",", "."))
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) return null
    const oldQty = Number(ativo.quantidade || 0)
    const oldPM = Number(ativo.preco_medio || 0)
    const newQty = oldQty + qty
    const newPM = newQty > 0 ? (oldPM * oldQty + price * qty) / newQty : price
    return { newQty, newPM }
  })()

  const tipoInfo = TIPOS_RENDA_VARIAVEL[ativo.tipo]

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="border-primary/20 bg-background max-w-[95vw] sm:max-w-2xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="text-primary flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reinvestir – {ativo.ticker}
          </DialogTitle>
          <DialogDescription>
            Mesmos campos do cadastro, mas aqui a operação soma quantidade e recalcula o preço médio.
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ticker`}>Ticker</Label>
              <Input id={`${formId}-ticker`} value={formData.ticker} disabled className="border-primary/20 bg-background" />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-tipo`}>Tipo</Label>
              <Select value={formData.tipo} onValueChange={() => {}} disabled>
                <SelectTrigger id={`${formId}-tipo`} className="border-primary/20 bg-background" disabled>
                  <SelectValue placeholder={tipoInfo?.label || ativo.tipo} />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  {Object.keys(TIPOS_RENDA_VARIAVEL).map((k) => (
                    <SelectItem key={k} value={k}>
                      {(TIPOS_RENDA_VARIAVEL as any)[k]?.label || k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-quantidade`}>Quantidade (compra adicional) *</Label>
              <Input
                id={`${formId}-quantidade`}
                inputMode="decimal"
                placeholder={ativo.tipo === "cripto" ? "0.001" : "10"}
                value={formData.quantidade}
                onChange={(e) => setFormData((p) => ({ ...p, quantidade: e.target.value }))}
                className="border-primary/20 bg-background"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-preco`}>Preço da compra *</Label>
              <Input
                id={`${formId}-preco`}
                inputMode="decimal"
                placeholder="Ex: 25.30"
                value={formData.preco_medio}
                onChange={(e) => setFormData((p) => ({ ...p, preco_medio: e.target.value }))}
                className="border-primary/20 bg-background"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-data`}>Data da compra *</Label>
              <Input
                id={`${formId}-data`}
                type="date"
                value={formData.data_compra}
                onChange={(e) => setFormData((p) => ({ ...p, data_compra: e.target.value }))}
                className="border-primary/20 bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-corretora`}>Corretora</Label>
              <Input
                id={`${formId}-corretora`}
                placeholder="Ex: XP, NuInvest, Binance..."
                value={formData.corretora}
                onChange={(e) => setFormData((p) => ({ ...p, corretora: e.target.value }))}
                className="border-primary/20 bg-background"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-setor`}>Setor</Label>
              <Input
                id={`${formId}-setor`}
                placeholder="Ex: Bancos, Energia, Tecnologia..."
                value={formData.setor}
                onChange={(e) => setFormData((p) => ({ ...p, setor: e.target.value }))}
                className="border-primary/20 bg-background"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-obs`}>Observações</Label>
            <Textarea
              id={`${formId}-obs`}
              value={formData.observacoes}
              onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
              placeholder="Ex: reinvestimento de dividendos, aporte mensal, etc."
              className="border-primary/20 bg-background min-h-[90px]"
            />
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/30 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">Posição atual</p>
                <p className="text-muted-foreground">
                  Qtd: <strong>{ativo.tipo === "cripto" ? Number(ativo.quantidade).toFixed(8) : ativo.quantidade}</strong> · PM: <strong>{Number(ativo.preco_medio).toFixed(2)}</strong>
                </p>
              </div>
              {pmPreview ? (
                <div className="text-right">
                  <p className="font-medium">Após reinvestir</p>
                  <p className="text-muted-foreground">
                    Qtd: <strong>{ativo.tipo === "cripto" ? pmPreview.newQty.toFixed(8) : pmPreview.newQty.toFixed(4)}</strong> · Novo PM: <strong>{pmPreview.newPM.toFixed(4)}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Preencha quantidade e preço para ver o novo preço médio.</p>
              )}
            </div>
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
