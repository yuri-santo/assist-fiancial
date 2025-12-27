"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { RendaVariavel } from "@/lib/types"
import { ProventoForm } from "@/components/forms/provento-form"

interface AddProventoDialogProps {
  userId: string
  rendaVariavel: Pick<RendaVariavel, "id" | "ticker" | "quantidade">[]
  disabled?: boolean
}

export function AddProventoDialog({ userId, rendaVariavel, disabled }: AddProventoDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Provento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Provento</DialogTitle>
        </DialogHeader>
        <ProventoForm userId={userId} rendaVariavel={rendaVariavel} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
