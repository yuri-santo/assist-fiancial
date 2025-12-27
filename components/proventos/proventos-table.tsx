"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Provento, RendaVariavel } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"
import { ProventoForm } from "@/components/forms/provento-form"

interface ProventosTableProps {
  userId: string
  data: Provento[]
  rendaVariavel: Pick<RendaVariavel, "id" | "ticker" | "quantidade">[]
  emptyLabel: string
}

function typeLabel(tipo: Provento["tipo"]) {
  const map: Record<string, string> = {
    dividendo: "DIV",
    jcp: "JCP",
    rendimento: "REND",
    amortizacao: "AMORT",
  }
  return map[tipo] || tipo.toUpperCase()
}

function statusLabel(status?: Provento["status"] | null) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    provisionado: { label: "Provisionado", variant: "secondary" },
    confirmado: { label: "Confirmado", variant: "outline" },
    pago: { label: "Pago", variant: "default" },
  }
  return status ? map[status] : null
}

export function ProventosTable({ userId, data, rendaVariavel, emptyLabel }: ProventosTableProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<Provento | null>(null)
  const [deleting, setDeleting] = useState<Provento | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.from("proventos").delete().eq("id", deleting.id)
      if (error) throw error
      setDeleting(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erro ao excluir provento")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<Provento>[] = useMemo(
    () => [
      {
        accessorKey: "data_pagamento",
        header: "Pagamento",
        cell: ({ row }) => {
          const d = row.original.data_pagamento
          return d ? new Date(d).toLocaleDateString("pt-BR") : "-"
        },
      },
      {
        accessorKey: "ticker",
        header: "Ticker",
        cell: ({ row }) => <span className="font-semibold">{row.original.ticker}</span>,
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => <Badge variant="secondary">{typeLabel(row.original.tipo)}</Badge>,
      },
      {
        accessorKey: "valor",
        header: "Unitário",
        cell: ({ row }) => formatCurrency(Number(row.original.valor) || 0),
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => {
          const unit = Number(row.original.valor) || 0
          const q = row.original.quantidade_base || 1
          return <span className="font-semibold">{formatCurrency(unit * q)}</span>
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = statusLabel(row.original.status)
          return s ? <Badge variant={s.variant}>{s.label}</Badge> : "-"
        },
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
              <DropdownMenuItem onClick={() => setEditing(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(row.original)}>
                <Trash className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <DataTable columns={columns} data={data} emptyMessage={emptyLabel} />

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Provento</DialogTitle>
          </DialogHeader>
          {editing && (
            <ProventoForm userId={userId} rendaVariavel={rendaVariavel} provento={editing} onSuccess={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir provento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O provento será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
