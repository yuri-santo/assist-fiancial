"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { BudgetForm } from "@/components/forms/budget-form"
import type { Categoria } from "@/lib/types"

interface AddBudgetDialogProps {
  userId: string
  categorias: Categoria[]
  mes: number
  ano: number
}

export function AddBudgetDialog({ userId, categorias, mes, ano }: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orcamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Definir Orcamento</DialogTitle>
        </DialogHeader>
        <BudgetForm userId={userId} categorias={categorias} mes={mes} ano={ano} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
