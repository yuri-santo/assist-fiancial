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

  const outrasCaixinhas = caixinhas.filter((c) => c.id !== caixinhaOrigem.id)

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!destinoId || !valor) return

    setIsLoading(true)
    const supabase = createClient()
    const valorNum = Number.parseFloat(valor)

    const caixinhaDestino = caixinhas.find((c) => c.id === destinoId)
    if (!caixinhaDestino) return

    // Update origin balance
    await supabase
      .from("caixinhas")
      .update({ saldo: caixinhaOrigem.saldo - valorNum })
      .eq("id", caixinhaOrigem.id)

    // Update destination balance
    await supabase
      .from("caixinhas")
      .update({ saldo: caixinhaDestino.saldo + valorNum })
      .eq("id", destinoId)

    // Record transfer
    await supabase.from("transferencias_caixinha").insert({
      user_id: userId,
      caixinha_origem_id: caixinhaOrigem.id,
      caixinha_destino_id: destinoId,
      valor: valorNum,
      data: new Date().toISOString().split("T")[0],
    })

    setIsLoading(false)
    setValor("")
    setDestinoId("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Select value={destinoId} onValueChange={setDestinoId} required>
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
              min="0"
              max={caixinhaOrigem.saldo}
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !destinoId || !valor}>
            {isLoading ? "Transferindo..." : "Transferir"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
