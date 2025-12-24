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
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { Despesa, Categoria, Cartao } from "@/lib/types"
import { ExpenseForm } from "@/components/forms/expense-form"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ExpensesListProps {
  despesas: Despesa[]
  categorias: Categoria[]
  cartoes: Cartao[]
  userId: string
}

export function ExpensesList({ despesas, categorias, cartoes, userId }: ExpensesListProps) {
  const router = useRouter()
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null)
  const [deletingDespesa, setDeletingDespesa] = useState<Despesa | null>(null)

  const handleDelete = async () => {
    if (!deletingDespesa) return

    const supabase = createClient()
    await supabase.from("despesas").delete().eq("id", deletingDespesa.id)
    setDeletingDespesa(null)
    router.refresh()
  }

  const columns: ColumnDef<Despesa>[] = [
    {
      accessorKey: "data",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.data),
    },
    {
      accessorKey: "descricao",
      header: "Descricao",
      cell: ({ row }) => row.original.descricao || "-",
    },
    {
      accessorKey: "categoria",
      header: "Categoria",
      cell: ({ row }) => {
        const categoria = row.original.categoria
        return categoria ? (
          <Badge variant="outline" style={{ borderColor: categoria.cor, color: categoria.cor }}>
            {categoria.nome}
          </Badge>
        ) : (
          "-"
        )
      },
    },
    {
      accessorKey: "forma_pagamento",
      header: "Pagamento",
      cell: ({ row }) => {
        const forma = row.original.forma_pagamento
        const labels: Record<string, string> = {
          cartao: "Cartao",
          debito: "Debito",
          pix: "PIX",
          dinheiro: "Dinheiro",
        }
        return forma ? labels[forma] || forma : "-"
      },
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => <span className="font-semibold text-red-600">{formatCurrency(row.original.valor)}</span>,
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
            <DropdownMenuItem onClick={() => setEditingDespesa(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingDespesa(row.original)}>
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
      <DataTable columns={columns} data={despesas} emptyMessage="Nenhuma despesa registrada" />

      <Dialog open={!!editingDespesa} onOpenChange={() => setEditingDespesa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          {editingDespesa && (
            <ExpenseForm
              userId={userId}
              categorias={categorias}
              cartoes={cartoes}
              despesa={editingDespesa}
              onSuccess={() => setEditingDespesa(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDespesa} onOpenChange={() => setDeletingDespesa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A despesa sera permanentemente removida.
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
