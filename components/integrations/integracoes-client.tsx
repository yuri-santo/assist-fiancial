"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, RefreshCcw, Link2Off } from "lucide-react"

type Conn = {
  id: string
  provider: "mercadopago" | "openfinance"
  status: "connected" | "revoked" | "error"
  scope?: string | null
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

type Tx = {
  id: string
  provider: "mercadopago" | "openfinance"
  external_id: string
  direction: "debit" | "credit"
  amount: number
  currency: string
  occurred_at: string
  description?: string | null
  imported: boolean
}

export function IntegracoesClient({
  userId,
  initialConnections,
  initialTransactions,
}: {
  userId: string
  initialConnections: Conn[]
  initialTransactions: Tx[]
}) {
  const [isSyncingMp, setIsSyncingMp] = useState(false)

  const mpConn = useMemo(
    () => (initialConnections || []).find((c) => c.provider === "mercadopago"),
    [initialConnections],
  )

  async function handleConnectMercadoPago() {
    // Abre o start (OAuth) do Mercado Pago
    window.location.href = "/api/integrations/mercadopago/start"
  }

  async function handleSyncMercadoPago() {
    try {
      setIsSyncingMp(true)
      const res = await fetch("/api/integrations/mercadopago/sync", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.message || "Falha ao sincronizar Mercado Pago.")
        return
      }
      window.location.reload()
    } finally {
      setIsSyncingMp(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mercado Pago */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">Mercado Pago</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sincronização automática via OAuth (receitas/recebimentos e movimentações disponíveis pela API).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mpConn?.status === "connected" ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                Não conectado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleConnectMercadoPago} variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {mpConn?.status === "connected" ? "Reconectar" : "Conectar"}
          </Button>

          <Button
            onClick={handleSyncMercadoPago}
            disabled={mpConn?.status !== "connected" || isSyncingMp}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isSyncingMp ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
        </CardContent>
      </Card>

      {/* Open Finance (desativado) */}
      <Card className="border-primary/10 opacity-90">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2Off className="h-5 w-5 text-muted-foreground" />
            Open Finance (desativado)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Open Finance não possui um caminho “100% gratuito e plug-and-play” para sincronizar extratos PF. Normalmente
            requer agregador/broker (pago) e requisitos regulatórios. Neste MVP grátis, use importação de extrato.
          </p>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Alternativa 100% grátis: <b>importar OFX/CSV</b> do seu banco e revisar em formato “mini planilha” antes de
              lançar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Transações pendentes */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">Transações sincronizadas pendentes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total pendente: {(initialTransactions || []).filter((t) => !t.imported).length}
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          (A listagem/ação de “importar para lançamentos” continua conforme seu fluxo atual.)
        </CardContent>
      </Card>
    </div>
  )
}
