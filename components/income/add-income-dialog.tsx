"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { IncomeForm } from "@/components/forms/income-form"

interface AddIncomeDialogProps {
  userId: string
}

export function AddIncomeDialog({ userId }: AddIncomeDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Receita
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Receita</DialogTitle>
        </DialogHeader>
        <IncomeForm userId={userId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
