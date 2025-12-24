"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import type { Receita } from "@/lib/types"

interface IncomeFormProps {
  userId: string
  receita?: Receita
  onSuccess?: () => void
}

const fontes = ["Salario", "Freelance", "Investimentos", "Aluguel", "Vendas", "Bonus", "Outros"]

export function IncomeForm({ userId, receita, onSuccess }: IncomeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [valor, setValor] = useState(receita?.valor?.toString() || "")
  const [fonte, setFonte] = useState(receita?.fonte || "")
  const [data, setData] = useState(receita?.data || new Date().toISOString().split("T")[0])
  const [descricao, setDescricao] = useState(receita?.descricao || "")
  const [recorrente, setRecorrente] = useState(receita?.recorrente || false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const incomeData = {
      user_id: userId,
      valor: Number.parseFloat(valor),
      fonte,
      data,
      descricao: descricao || null,
      recorrente,
    }

    try {
      if (receita) {
        const { error } = await supabase.from("receitas").update(incomeData).eq("id", receita.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("receitas").insert(incomeData)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar receita")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fonte">Fonte</Label>
        <Select value={fonte} onValueChange={setFonte} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a fonte" />
          </SelectTrigger>
          <SelectContent>
            {fontes.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descricao</Label>
        <Input
          id="descricao"
          placeholder="Ex: Salario de dezembro..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="recorrente" checked={recorrente} onCheckedChange={setRecorrente} />
        <Label htmlFor="recorrente">Receita recorrente (repete todo mes)</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : receita ? "Atualizar Receita" : "Adicionar Receita"}
      </Button>
    </form>
  )
}
