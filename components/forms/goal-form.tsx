"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { Objetivo } from "@/lib/types"

interface GoalFormProps {
  userId: string
  objetivo?: Objetivo
  onSuccess?: () => void
}

const tipos: { valor: Objetivo["tipo"]; nome: string }[] = [
  { valor: "sonho", nome: "Sonho" },
  { valor: "reserva", nome: "Reserva" },
  { valor: "projeto", nome: "Projeto" },
]

const cores = [
  { nome: "Verde", valor: "#10b981" },
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Roxo", valor: "#8b5cf6" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Amarelo", valor: "#eab308" },
]

export function GoalForm({ userId, objetivo, onSuccess }: GoalFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState(objetivo?.nome || "")
  const [valorTotal, setValorTotal] = useState(objetivo?.valor_total?.toString() || "")
  const [valorAtual, setValorAtual] = useState(objetivo?.valor_atual?.toString() || "0")
  const [prazo, setPrazo] = useState(objetivo?.prazo || "")
  const [tipo, setTipo] = useState<Objetivo["tipo"]>(objetivo?.tipo || "sonho")
  const [cor, setCor] = useState(objetivo?.cor || "#10b981")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const valorTotalNum = Number.parseFloat(valorTotal)
    const valorAtualNum = Number.parseFloat(valorAtual)

    if (isNaN(valorTotalNum) || valorTotalNum <= 0) {
      setError("Valor total deve ser maior que zero")
      setIsLoading(false)
      return
    }

    if (isNaN(valorAtualNum) || valorAtualNum < 0) {
      setError("Valor atual deve ser zero ou maior")
      setIsLoading(false)
      return
    }

    if (valorAtualNum > valorTotalNum) {
      setError("Valor atual nao pode ser maior que o valor total")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const goalData = {
      user_id: userId,
      nome: nome.trim(),
      valor_total: valorTotalNum,
      valor_atual: valorAtualNum,
      prazo: prazo || null,
      tipo,
      cor,
    }

    try {
      if (objetivo) {
        const { error } = await supabase.from("objetivos").update(goalData).eq("id", objetivo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("objetivos").insert(goalData)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar objetivo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Objetivo</Label>
        <Input
          id="nome"
          placeholder="Ex: Viagem para Europa, Carro novo..."
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valorTotal">Valor Total (R$)</Label>
          <Input
            id="valorTotal"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valorAtual">Valor Atual (R$)</Label>
          <Input
            id="valorAtual"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={valorAtual}
            onChange={(e) => setValorAtual(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select value={tipo} onValueChange={(value) => setTipo(value as Objetivo["tipo"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.valor} value={t.valor}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazo">Prazo</Label>
          <Input id="prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {cores.map((c) => (
            <button
              key={c.valor}
              type="button"
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                cor === c.valor ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c.valor }}
              onClick={() => setCor(c.valor)}
              title={c.nome}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : objetivo ? "Atualizar" : "Criar Objetivo"}
      </Button>
    </form>
  )
}
