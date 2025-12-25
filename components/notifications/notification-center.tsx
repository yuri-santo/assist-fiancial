"use client"

import { useState, useEffect } from "react"
import { Bell, Check, AlertTriangle, Lightbulb, Trophy, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import type { Notificacao } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface NotificationCenterProps {
  userId: string
}

const tipoIcons = {
  alerta: AlertTriangle,
  lembrete: Clock,
  conquista: Trophy,
  dica: Lightbulb,
}

const tipoColors = {
  alerta: "text-red-400",
  lembrete: "text-amber-400",
  conquista: "text-emerald-400",
  dica: "text-cyan-400",
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchNotificacoes = async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (data) setNotificacoes(data)
    }

    fetchNotificacoes()

    // Realtime subscription
    const channel = supabase
      .channel("notificacoes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${userId}` },
        () => {
          fetchNotificacoes()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const marcarComoLida = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }

  const marcarTodasComoLidas = async () => {
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", userId)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const excluirNotificacao = async (id: string) => {
    await supabase.from("notificacoes").delete().eq("id", id)
    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
  }

  const handleClick = (notificacao: Notificacao) => {
    marcarComoLida(notificacao.id)
    if (notificacao.link) {
      router.push(notificacao.link)
      setOpen(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neon-pink text-[10px] font-bold text-white shadow-[0_0_8px_rgba(236,72,153,0.8)]">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-card border-primary/20 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold">Notificacoes</h3>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={marcarTodasComoLidas}>
              <Check className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Nenhuma notificacao</p>
            </div>
          ) : (
            notificacoes.map((notificacao) => {
              const Icon = tipoIcons[notificacao.tipo]
              return (
                <div
                  key={notificacao.id}
                  className={cn(
                    "flex gap-3 p-3 border-b border-border/30 hover:bg-primary/5 cursor-pointer transition-colors",
                    !notificacao.lida && "bg-primary/10",
                  )}
                  onClick={() => handleClick(notificacao)}
                >
                  <div className={cn("mt-0.5", tipoColors[notificacao.tipo])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm", !notificacao.lida && "text-primary")}>
                      {notificacao.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notificacao.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notificacao.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      excluirNotificacao(notificacao.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })
          )}
        </ScrollArea>
        {notificacoes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => router.push("/dashboard/configuracoes")}
            >
              Gerenciar notificacoes
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
