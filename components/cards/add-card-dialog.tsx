"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { CardForm } from "@/components/forms/card-form"

interface AddCardDialogProps {
  userId: string
}

export function AddCardDialog({ userId }: AddCardDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cartao
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Cartao</DialogTitle>
        </DialogHeader>
        <CardForm userId={userId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
