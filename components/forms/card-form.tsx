"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { Cartao } from "@/lib/types"

interface CardFormProps {
  userId: string
  cartao?: Cartao
  onSuccess?: () => void
}

const bandeiras = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outros"]
const cores = [
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Verde", valor: "#10b981" },
  { nome: "Roxo", valor: "#8b5cf6" },
  { nome: "Vermelho", valor: "#ef4444" },
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Cinza", valor: "#6b7280" },
  { nome: "Preto", valor: "#1f2937" },
]

export function CardForm({ userId, cartao, onSuccess }: CardFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState(cartao?.nome || "")
  const [bandeira, setBandeira] = useState(cartao?.bandeira || "")
  const [limiteTotal, setLimiteTotal] = useState(cartao?.limite_total?.toString() || "")
  const [fechamento, setFechamento] = useState(cartao?.fechamento_fatura?.toString() || "")
  const [vencimento, setVencimento] = useState(cartao?.vencimento?.toString() || "")
  const [cor, setCor] = useState(cartao?.cor || "#3b82f6")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const cardData = {
      user_id: userId,
      nome,
      bandeira: bandeira || null,
      limite_total: Number.parseFloat(limiteTotal),
      fechamento_fatura: Number.parseInt(fechamento),
      vencimento: Number.parseInt(vencimento),
      cor,
    }

    try {
      if (cartao) {
        const { error } = await supabase.from("cartoes").update(cardData).eq("id", cartao.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("cartoes").insert(cardData)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cartao")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Cartao</Label>
          <Input
            id="nome"
            placeholder="Ex: Nubank, Itau..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bandeira">Bandeira</Label>
          <Select value={bandeira} onValueChange={setBandeira}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {bandeiras.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="limite">Limite Total (R$)</Label>
        <Input
          id="limite"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={limiteTotal}
          onChange={(e) => setLimiteTotal(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fechamento">Dia do Fechamento</Label>
          <Input
            id="fechamento"
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 15"
            value={fechamento}
            onChange={(e) => setFechamento(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vencimento">Dia do Vencimento</Label>
          <Input
            id="vencimento"
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 25"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor do Cartao</Label>
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
        {isLoading ? "Salvando..." : cartao ? "Atualizar Cartao" : "Adicionar Cartao"}
      </Button>
    </form>
  )
}
