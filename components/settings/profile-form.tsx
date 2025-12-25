"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types"

interface ProfileFormProps {
  profile: Profile | null
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState(profile?.nome || "")
  const [tipoUsuario, setTipoUsuario] = useState(profile?.tipo_usuario || "PF")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(false)
    setError(null)

    if (!nome.trim()) {
      setError("Nome e obrigatorio")
      setIsLoading(false)
      return
    }

    if (!profile?.id) {
      setError("Perfil nao encontrado")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nome: nome.trim(),
          tipo_usuario: tipoUsuario,
        })
        .eq("id", profile.id)

      if (updateError) throw updateError

      setSuccess(true)
      router.refresh()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar perfil")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={profile?.email || ""} disabled className="bg-muted" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo de Usuario</Label>
        <Select value={tipoUsuario} onValueChange={setTipoUsuario}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PF">Pessoa Fisica</SelectItem>
            <SelectItem value="PJ">Pessoa Juridica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Perfil atualizado com sucesso!</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar Alteracoes"}
      </Button>
    </form>
  )
}
