"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Provento, RendaVariavel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils/currency"

interface ProventoFormProps {
  userId: string
  rendaVariavel: Pick<RendaVariavel, "id" | "ticker" | "quantidade">[]
  provento?: Provento
  onSuccess?: () => void
}

const TIPOS: Array<Provento["tipo"]> = ["dividendo", "jcp", "rendimento", "amortizacao"]

export function ProventoForm({ userId, rendaVariavel, provento, onSuccess }: ProventoFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tickers = useMemo(() => [...new Set(rendaVariavel.map((r) => r.ticker))].sort(), [rendaVariavel])

  const [ticker, setTicker] = useState(provento?.ticker || tickers[0] || "")
  const [tipo, setTipo] = useState<Provento["tipo"]>(provento?.tipo || "dividendo")
  const [valor, setValor] = useState(provento?.valor?.toString() || "")
  const [quantidadeBase, setQuantidadeBase] = useState(provento?.quantidade_base?.toString() || "")
  const [dataPagamento, setDataPagamento] = useState(
    provento?.data_pagamento || new Date().toISOString().split("T")[0],
  )
  const [dataCom, setDataCom] = useState(provento?.data_com || "")
  const [dataProvisionada, setDataProvisionada] = useState(provento?.data_provisionada || "")
  const [status, setStatus] = useState<NonNullable<Provento["status"]>>(provento?.status || "provisionado")
  const [observacoes, setObservacoes] = useState(provento?.observacoes || "")

  const totalEstimado = useMemo(() => {
    const v = Number.parseFloat(valor)
    const q = Number.parseFloat(quantidadeBase)
    if (!isFinite(v) || v <= 0) return 0
    if (!isFinite(q) || q <= 0) return v
    return v * q
  }, [valor, quantidadeBase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const valorNum = Number.parseFloat(valor)
    if (!ticker) {
      setError("Informe o ticker")
      setIsLoading(false)
      return
    }
    if (!isFinite(valorNum) || valorNum <= 0) {
      setError("Valor do provento deve ser maior que zero")
      setIsLoading(false)
      return
    }
    if (!dataPagamento) {
      setError("Informe a data de pagamento")
      setIsLoading(false)
      return
    }

    const q = quantidadeBase ? Number.parseFloat(quantidadeBase) : null
    const supabase = createClient()

    // Mantém compatibilidade com uma tabela "proventos" mais simples.
    // Campos extras (data_provisionada, status, etc.) são opcionais.
    const payload: Partial<Provento> & { user_id: string; ticker: string; tipo: Provento["tipo"]; valor: number; data_pagamento: string } = {
      user_id: userId,
      ticker: ticker.trim().toUpperCase(),
      tipo,
      valor: valorNum,
      data_com: dataCom || null,
      data_pagamento: dataPagamento,
      quantidade_base: q && isFinite(q) ? q : null,
      observacoes: observacoes || null,
      // extras
      data_provisionada: dataProvisionada || null,
      status: status || null,
    }

    try {
      if (provento?.id) {
        const { error } = await supabase.from("proventos").update(payload).eq("id", provento.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("proventos").insert(payload)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar provento"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ticker</Label>
          {tickers.length > 0 ? (
            <Select value={ticker} onValueChange={setTicker}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {tickers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ex: ITUB4" />
          )}
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Provento["tipo"]) }>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Valor (por ação/cota)</Label>
          <Input type="number" step="0.0001" min="0.0001" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Quantidade base (opcional)</Label>
          <Input type="number" step="0.0001" min="0" value={quantidadeBase} onChange={(e) => setQuantidadeBase(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Data COM (opcional)</Label>
          <Input type="date" value={dataCom} onChange={(e) => setDataCom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Data pagamento</Label>
          <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status || "provisionado"} onValueChange={(v) => setStatus(v as NonNullable<Provento["status"]>)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="provisionado">Provisionado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Data provisionada (opcional)</Label>
          <Input type="date" value={dataProvisionada} onChange={(e) => setDataProvisionada(e.target.value)} />
          <p className="text-xs text-muted-foreground">Data que você quer ver na sua agenda (ex.: previsão/estimativa).</p>
        </div>
        <div className="space-y-2">
          <Label>Total estimado</Label>
          <Input value={formatCurrency(totalEstimado)} readOnly />
          <p className="text-xs text-muted-foreground">Se a quantidade base não for informada, considera 1 unidade.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex.: fonte, evento corporativo, ajuste manual..." />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : provento ? "Atualizar Provento" : "Adicionar Provento"}
      </Button>
    </form>
  )
}
