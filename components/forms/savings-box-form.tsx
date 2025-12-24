"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { Caixinha, Objetivo } from "@/lib/types"

interface SavingsBoxFormProps {
  userId: string
  objetivos: Objetivo[]
  caixinha?: Caixinha
  onSuccess?: () => void
}

const cores = [
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Verde", valor: "#10b981" },
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Roxo", valor: "#8b5cf6" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Amarelo", valor: "#eab308" },
]

export function SavingsBoxForm({ userId, objetivos, caixinha, onSuccess }: SavingsBoxFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState(caixinha?.nome || "")
  const [saldo, setSaldo] = useState(caixinha?.saldo?.toString() || "0")
  const [objetivoId, setObjetivoId] = useState(caixinha?.objetivo_id || "none")
  const [cor, setCor] = useState(caixinha?.cor || "#f97316")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const boxData = {
      user_id: userId,
      nome,
      saldo: Number.parseFloat(saldo),
      objetivo_id: objetivoId === "none" ? null : objetivoId,
      cor,
    }

    try {
      if (caixinha) {
        const { error } = await supabase.from("caixinhas").update(boxData).eq("id", caixinha.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("caixinhas").insert(boxData)
        if (error) throw error
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar caixinha")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da Caixinha</Label>
        <Input
          id="nome"
          placeholder="Ex: Viagem, Emergencia, Reforma..."
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saldo">Saldo Inicial (R$)</Label>
        <Input
          id="saldo"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objetivo">Vincular a Objetivo (opcional)</Label>
        <Select value={objetivoId} onValueChange={setObjetivoId}>
          <SelectTrigger>
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {objetivos.map((obj) => (
              <SelectItem key={obj.id} value={obj.id}>
                {obj.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {isLoading ? "Salvando..." : caixinha ? "Atualizar" : "Criar Caixinha"}
      </Button>
    </form>
  )
}
