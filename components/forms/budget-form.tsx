"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { Categoria, Orcamento } from "@/lib/types"

interface BudgetFormProps {
  userId: string
  categorias: Categoria[]
  orcamento?: Orcamento
  mes: number
  ano: number
  onSuccess?: () => void
}

export function BudgetForm({ userId, categorias, orcamento, mes, ano, onSuccess }: BudgetFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categoriaId, setCategoriaId] = useState(orcamento?.categoria_id || "")
  const [valorLimite, setValorLimite] = useState(orcamento?.valor_limite?.toString() || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const budgetData = {
      user_id: userId,
      categoria_id: categoriaId,
      valor_limite: Number.parseFloat(valorLimite),
      mes,
      ano,
    }

    try {
      if (orcamento) {
        const { error } = await supabase.from("orcamentos").update(budgetData).eq("id", orcamento.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("orcamentos").insert(budgetData)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar orcamento")
    } finally {
      setIsLoading(false)
    }
  }

  const despesaCategorias = categorias.filter((c) => c.tipo === "despesa")

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Select value={categoriaId} onValueChange={setCategoriaId} required disabled={!!orcamento}>
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
        <Label htmlFor="valor">Limite Mensal (R$)</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={valorLimite}
          onChange={(e) => setValorLimite(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : orcamento ? "Atualizar" : "Definir Orcamento"}
      </Button>
    </form>
  )
}
