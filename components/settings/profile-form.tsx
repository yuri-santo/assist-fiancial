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

  const [nome, setNome] = useState(profile?.nome || "")
  const [tipoUsuario, setTipoUsuario] = useState(profile?.tipo_usuario || "PF")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(false)

    const supabase = createClient()

    await supabase
      .from("profiles")
      .update({
        nome,
        tipo_usuario: tipoUsuario,
      })
      .eq("id", profile?.id)

    setIsLoading(false)
    setSuccess(true)
    router.refresh()

    setTimeout(() => setSuccess(false), 3000)
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

      {success && <p className="text-sm text-emerald-600">Perfil atualizado com sucesso!</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar Alteracoes"}
      </Button>
    </form>
  )
}
