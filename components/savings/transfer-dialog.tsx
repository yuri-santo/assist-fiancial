"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Caixinha } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"

interface TransferDialogProps {
  caixinhaOrigem: Caixinha
  caixinhas: Caixinha[]
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function TransferDialog({ caixinhaOrigem, caixinhas, open, onOpenChange, userId }: TransferDialogProps) {
  const router = useRouter()
  const [valor, setValor] = useState("")
  const [destinoId, setDestinoId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const outrasCaixinhas = caixinhas.filter((c) => c.id !== caixinhaOrigem.id)

  const resetForm = () => {
    setValor("")
    setDestinoId("")
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()

    const valorNum = Number.parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      setError("Valor deve ser maior que zero")
      return
    }

    if (valorNum > caixinhaOrigem.saldo) {
      setError("Valor maior que o saldo disponivel")
      return
    }

    if (!destinoId) {
      setError("Selecione uma caixinha destino")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const caixinhaDestino = caixinhas.find((c) => c.id === destinoId)

    if (!caixinhaDestino) {
      setError("Caixinha destino nao encontrada")
      setIsLoading(false)
      return
    }

    try {
      const { error: origemError } = await supabase
        .from("caixinhas")
        .update({ saldo: caixinhaOrigem.saldo - valorNum })
        .eq("id", caixinhaOrigem.id)

      if (origemError) throw origemError

      const { error: destinoError } = await supabase
        .from("caixinhas")
        .update({ saldo: caixinhaDestino.saldo + valorNum })
        .eq("id", destinoId)

      if (destinoError) {
        await supabase.from("caixinhas").update({ saldo: caixinhaOrigem.saldo }).eq("id", caixinhaOrigem.id)
        throw destinoError
      }

      const { error: transferenciaError } = await supabase.from("transferencias_caixinha").insert({
        user_id: userId,
        caixinha_origem_id: caixinhaOrigem.id,
        caixinha_destino_id: destinoId,
        valor: valorNum,
        data: new Date().toISOString().split("T")[0],
      })

      if (transferenciaError) {
        console.error("[v0] Error recording transfer:", transferenciaError)
      }

      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao transferir")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir entre Caixinhas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">De: {caixinhaOrigem.nome}</p>
            <p className="font-semibold">Saldo: {formatCurrency(caixinhaOrigem.saldo)}</p>
          </div>

          <div className="space-y-2">
            <Label>Para:</Label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a caixinha destino" />
              </SelectTrigger>
              <SelectContent>
                {outrasCaixinhas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} ({formatCurrency(c.saldo)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              max={caixinhaOrigem.saldo}
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading || !destinoId || !valor}>
            {isLoading ? "Transferindo..." : "Transferir"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
