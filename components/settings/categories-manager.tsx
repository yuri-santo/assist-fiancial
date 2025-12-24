"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash } from "lucide-react"
import type { Categoria } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface CategoriesManagerProps {
  categorias: Categoria[]
  userId: string
}

const cores = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
]

export function CategoriesManager({ categorias, userId }: CategoriesManagerProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa")
  const [cor, setCor] = useState(cores[0])
  const [isLoading, setIsLoading] = useState(false)

  const despesaCategorias = categorias.filter((c) => c.tipo === "despesa")
  const receitaCategorias = categorias.filter((c) => c.tipo === "receita")

  const handleAdd = async () => {
    if (!nome) return
    setIsLoading(true)

    const supabase = createClient()
    await supabase.from("categorias").insert({
      user_id: userId,
      nome,
      tipo,
      cor,
    })

    setIsLoading(false)
    setAdding(false)
    setNome("")
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("categorias").delete().eq("id", id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-medium">Categorias de Despesas</h4>
        <div className="flex flex-wrap gap-2">
          {despesaCategorias.map((cat) => (
            <Badge key={cat.id} variant="outline" style={{ borderColor: cat.cor, color: cat.cor }} className="gap-1">
              {cat.nome}
              <button type="button" onClick={() => handleDelete(cat.id)} className="ml-1 hover:text-destructive">
                <Trash className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-medium">Categorias de Receitas</h4>
        <div className="flex flex-wrap gap-2">
          {receitaCategorias.map((cat) => (
            <Badge key={cat.id} variant="outline" style={{ borderColor: cat.cor, color: cat.cor }} className="gap-1">
              {cat.nome}
              <button type="button" onClick={() => handleDelete(cat.id)} className="ml-1 hover:text-destructive">
                <Trash className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Categoria
      </Button>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da categoria" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "despesa" | "receita")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {cores.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 ${cor === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setCor(c)}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={isLoading || !nome}>
              {isLoading ? "Criando..." : "Criar Categoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
