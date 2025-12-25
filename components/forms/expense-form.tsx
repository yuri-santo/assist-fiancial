"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import type { Categoria, Cartao, Despesa } from "@/lib/types"

interface ExpenseFormProps {
  userId: string
  categorias: Categoria[]
  cartoes: Cartao[]
  despesa?: Despesa
  onSuccess?: () => void
}

export function ExpenseForm({ userId, categorias, cartoes, despesa, onSuccess }: ExpenseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [valor, setValor] = useState(despesa?.valor?.toString() || "")
  const [categoriaId, setCategoriaId] = useState(despesa?.categoria_id || "")
  const [data, setData] = useState(despesa?.data || new Date().toISOString().split("T")[0])
  const [descricao, setDescricao] = useState(despesa?.descricao || "")
  const [formaPagamento, setFormaPagamento] = useState<string>(despesa?.forma_pagamento || "")
  const [cartaoId, setCartaoId] = useState(despesa?.cartao_id || "")
  const [recorrente, setRecorrente] = useState(despesa?.recorrente || false)
  const [parcelado, setParcelado] = useState(despesa?.parcelado || false)
  const [totalParcelas, setTotalParcelas] = useState(despesa?.total_parcelas?.toString() || "1")
  const [observacoes, setObservacoes] = useState(despesa?.observacoes || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const valorNum = Number.parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      setError("Valor deve ser maior que zero")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const expenseData = {
      user_id: userId,
      valor: valorNum,
      categoria_id: categoriaId || null,
      data,
      descricao: descricao || null,
      forma_pagamento: formaPagamento || null,
      cartao_id: formaPagamento === "cartao" ? cartaoId || null : null,
      recorrente,
      parcelado: formaPagamento === "cartao" ? parcelado : false,
      total_parcelas: parcelado ? Number.parseInt(totalParcelas) : 1,
      parcela_atual: 1,
      observacoes: observacoes || null,
    }

    try {
      if (despesa) {
        const { error } = await supabase.from("despesas").update(expenseData).eq("id", despesa.id)
        if (error) throw error
      } else {
        if (parcelado && Number.parseInt(totalParcelas) > 1) {
          const parcelas = Number.parseInt(totalParcelas)
          const valorParcela = Math.round((valorNum / parcelas) * 100) / 100

          const parcelasData = []
          for (let i = 0; i < parcelas; i++) {
            const parcelaDataObj = new Date(data)
            parcelaDataObj.setMonth(parcelaDataObj.getMonth() + i)

            parcelasData.push({
              ...expenseData,
              valor: valorParcela,
              data: parcelaDataObj.toISOString().split("T")[0],
              parcela_atual: i + 1,
              descricao: `${descricao || "Parcela"} (${i + 1}/${parcelas})`,
            })
          }

          const { error } = await supabase.from("despesas").insert(parcelasData)
          if (error) throw error
        } else {
          const { error } = await supabase.from("despesas").insert(expenseData)
          if (error) throw error
        }
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao salvar despesa"
      setError(errorMessage.includes("violates") ? "Dados invalidos. Verifique os campos." : errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const despesaCategorias = categorias.filter((c) => c.tipo === "despesa")

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {despesaCategorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="debito">Debito</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartao de Credito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formaPagamento === "cartao" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cartao">Cartao</Label>
            <Select value={cartaoId} onValueChange={setCartaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cartao" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((cartao) => (
                  <SelectItem key={cartao.id} value={cartao.id}>
                    {cartao.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center gap-2">
              <Switch id="parcelado" checked={parcelado} onCheckedChange={setParcelado} />
              <Label htmlFor="parcelado">Parcelado</Label>
            </div>
            {parcelado && (
              <div className="flex items-center gap-2">
                <Label htmlFor="parcelas">em</Label>
                <Input
                  id="parcelas"
                  type="number"
                  min="2"
                  max="48"
                  className="w-20"
                  value={totalParcelas}
                  onChange={(e) => setTotalParcelas(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">x</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="descricao">Descricao</Label>
        <Input
          id="descricao"
          placeholder="Ex: Supermercado, Conta de luz..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="recorrente" checked={recorrente} onCheckedChange={setRecorrente} />
        <Label htmlFor="recorrente">Despesa recorrente (repete todo mes)</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observacoes</Label>
        <Textarea
          id="observacoes"
          placeholder="Notas adicionais..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : despesa ? "Atualizar Despesa" : "Adicionar Despesa"}
      </Button>
    </form>
  )
}
