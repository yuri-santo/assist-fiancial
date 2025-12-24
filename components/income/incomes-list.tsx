"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDate } from "@/lib/utils/date"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Trash, RefreshCw } from "lucide-react"
import type { Receita } from "@/lib/types"
import { IncomeForm } from "@/components/forms/income-form"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface IncomesListProps {
  receitas: Receita[]
  userId: string
}

export function IncomesList({ receitas, userId }: IncomesListProps) {
  const router = useRouter()
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
  const [deletingReceita, setDeletingReceita] = useState<Receita | null>(null)

  const handleDelete = async () => {
    if (!deletingReceita) return

    const supabase = createClient()
    await supabase.from("receitas").delete().eq("id", deletingReceita.id)
    setDeletingReceita(null)
    router.refresh()
  }

  const columns: ColumnDef<Receita>[] = [
    {
      accessorKey: "data",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.data),
    },
    {
      accessorKey: "fonte",
      header: "Fonte",
      cell: ({ row }) => (
        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
          {row.original.fonte}
        </Badge>
      ),
    },
    {
      accessorKey: "descricao",
      header: "Descricao",
      cell: ({ row }) => row.original.descricao || "-",
    },
    {
      accessorKey: "recorrente",
      header: "Recorrente",
      cell: ({ row }) =>
        row.original.recorrente ? (
          <Badge variant="secondary">
            <RefreshCw className="mr-1 h-3 w-3" />
            Sim
          </Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => <span className="font-semibold text-emerald-600">{formatCurrency(row.original.valor)}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingReceita(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingReceita(row.original)}>
              <Trash className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={receitas} emptyMessage="Nenhuma receita registrada" />

      <Dialog open={!!editingReceita} onOpenChange={() => setEditingReceita(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          {editingReceita && (
            <IncomeForm userId={userId} receita={editingReceita} onSuccess={() => setEditingReceita(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingReceita} onOpenChange={() => setDeletingReceita(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A receita sera permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
