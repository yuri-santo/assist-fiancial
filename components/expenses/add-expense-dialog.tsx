"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { ExpenseForm } from "@/components/forms/expense-form"
import type { Categoria, Cartao } from "@/lib/types"

interface AddExpenseDialogProps {
  userId: string
  categorias: Categoria[]
  cartoes: Cartao[]
}

export function AddExpenseDialog({ userId, categorias, cartoes }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Despesa</DialogTitle>
        </DialogHeader>
        <ExpenseForm userId={userId} categorias={categorias} cartoes={cartoes} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
