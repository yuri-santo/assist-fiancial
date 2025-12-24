"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils/currency"

interface EmergencyReserveSetupProps {
  userId: string
  mediaDespesas: number
}

export function EmergencyReserveSetup({ userId, mediaDespesas }: EmergencyReserveSetupProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [meses, setMeses] = useState("6")
  const [valorAtual, setValorAtual] = useState("0")
  const [isLoading, setIsLoading] = useState(false)

  const valorMeta = mediaDespesas * Number.parseInt(meses)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    await supabase.from("objetivos").insert({
      user_id: userId,
      nome: "Reserva de Emergencia",
      valor_total: valorMeta,
      valor_atual: Number.parseFloat(valorAtual),
      tipo: "emergencia",
      cor: "#10b981",
    })

    setIsLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Configurar Reserva</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Reserva de Emergencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Meta em meses de despesas</Label>
            <RadioGroup value={meses} onValueChange={setMeses} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="3" id="3meses" className="peer sr-only" />
                <Label
                  htmlFor="3meses"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-lg font-semibold">3</span>
                  <span className="text-xs text-muted-foreground">meses</span>
                  <span className="mt-1 text-xs">{formatCurrency(mediaDespesas * 3)}</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="6" id="6meses" className="peer sr-only" />
                <Label
                  htmlFor="6meses"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-lg font-semibold">6</span>
                  <span className="text-xs text-muted-foreground">meses</span>
                  <span className="mt-1 text-xs">{formatCurrency(mediaDespesas * 6)}</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="12" id="12meses" className="peer sr-only" />
                <Label
                  htmlFor="12meses"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="text-lg font-semibold">12</span>
                  <span className="text-xs text-muted-foreground">meses</span>
                  <span className="mt-1 text-xs">{formatCurrency(mediaDespesas * 12)}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorAtual">Quanto voce ja tem guardado? (R$)</Label>
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

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Meta selecionada:</p>
            <p className="text-lg font-semibold">{formatCurrency(valorMeta)}</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Criando..." : "Criar Reserva de Emergencia"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
