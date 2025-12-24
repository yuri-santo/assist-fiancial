"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { SavingsBoxForm } from "@/components/forms/savings-box-form"
import type { Objetivo } from "@/lib/types"

interface AddSavingsBoxDialogProps {
  userId: string
  objetivos: Objetivo[]
}

export function AddSavingsBoxDialog({ userId, objetivos }: AddSavingsBoxDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Caixinha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Caixinha</DialogTitle>
        </DialogHeader>
        <SavingsBoxForm userId={userId} objetivos={objetivos} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
