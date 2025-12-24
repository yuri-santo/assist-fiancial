"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
import { MoreVertical, Pencil, Trash, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Cartao, Despesa } from "@/lib/types"
import { CardForm } from "@/components/forms/card-form"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface CardItemProps {
  cartao: Cartao
  despesas: Despesa[]
  userId: string
}

export function CardItem({ cartao, despesas, userId }: CardItemProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const faturaAtual = despesas.filter((d) => d.cartao_id === cartao.id).reduce((sum, d) => sum + d.valor, 0)

  const limiteUsado = (faturaAtual / cartao.limite_total) * 100
  const limiteDisponivel = cartao.limite_total - faturaAtual

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from("cartoes").delete().eq("id", cartao.id)
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: cartao.cor }} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${cartao.cor}20` }}
              >
                <CreditCard className="h-5 w-5" style={{ color: cartao.cor }} />
              </div>
              <div>
                <h3 className="font-semibold">{cartao.nome}</h3>
                <p className="text-sm text-muted-foreground">{cartao.bandeira}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(true)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fatura atual</span>
              <span className="font-semibold" style={{ color: cartao.cor }}>
                {formatCurrency(faturaAtual)}
              </span>
            </div>

            <Progress
              value={Math.min(limiteUsado, 100)}
              className="h-2"
              style={{ ["--tw-gradient-from" as string]: cartao.cor }}
            />

            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Limite disponivel</p>
                <p className="font-semibold">{formatCurrency(Math.max(limiteDisponivel, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Limite total</p>
                <p className="font-semibold">{formatCurrency(cartao.limite_total)}</p>
              </div>
            </div>

            <div className="flex justify-between rounded-lg bg-muted p-2 text-xs">
              <span>Fecha dia {cartao.fechamento_fatura}</span>
              <span>Vence dia {cartao.vencimento}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cartao</DialogTitle>
          </DialogHeader>
          <CardForm userId={userId} cartao={cartao} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O cartao sera permanentemente removido.
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
