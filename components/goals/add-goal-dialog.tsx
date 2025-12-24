"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { GoalForm } from "@/components/forms/goal-form"

interface AddGoalDialogProps {
  userId: string
}

export function AddGoalDialog({ userId }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Objetivo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Objetivo</DialogTitle>
        </DialogHeader>
        <GoalForm userId={userId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
