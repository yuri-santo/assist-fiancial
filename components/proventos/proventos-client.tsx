"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Provento, RendaVariavel } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { AddProventoDialog } from "@/components/proventos/add-provento-dialog"
import { ProventosTable } from "@/components/proventos/proventos-table"
import { Coins, RefreshCcw, Info } from "lucide-react"

interface ProventosClientProps {
  userId: string
  proventos: Provento[]
  rendaVariavel: Pick<RendaVariavel, "id" | "ticker" | "quantidade">[]
  tableError: string | null
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function ProventosClient({ userId, proventos, rendaVariavel, tableError }: ProventosClientProps) {
  const router = useRouter()
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const now = toDateOnly(new Date())

  const { previstos30d, recebidosMes, totalPrevistos30d, totalRecebidosMes } = useMemo(() => {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const end30 = new Date(now)
    end30.setDate(end30.getDate() + 30)

    const previstos30d = proventos.filter((p) => {
      const dt = p.data_pagamento ? new Date(p.data_pagamento) : null
      return dt && toDateOnly(dt) >= now && toDateOnly(dt) <= toDateOnly(end30)
    })

    const recebidosMes = proventos.filter((p) => {
      const dt = p.data_pagamento ? new Date(p.data_pagamento) : null
      if (!dt) return false
      const d0 = toDateOnly(dt)
      return d0 >= toDateOnly(startMonth) && d0 <= toDateOnly(endMonth)
    })

    const totalPrevistos30d = previstos30d.reduce((sum, p) => sum + (Number(p.valor) || 0) * (p.quantidade_base || 1), 0)
    const totalRecebidosMes = recebidosMes.reduce((sum, p) => sum + (Number(p.valor) || 0) * (p.quantidade_base || 1), 0)

    return { previstos30d, recebidosMes, totalPrevistos30d, totalRecebidosMes }
  }, [proventos, now])

  const upcoming = useMemo(
    () =>
      [...proventos]
        .filter((p) => {
          const dt = p.data_pagamento ? new Date(p.data_pagamento) : null
          return dt && toDateOnly(dt) >= now
        })
        .sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime()),
    [proventos, now],
  )

  const history = useMemo(
    () =>
      [...proventos]
        .filter((p) => {
          const dt = p.data_pagamento ? new Date(p.data_pagamento) : null
          return dt && toDateOnly(dt) < now
        })
        .sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()),
    [proventos, now],
  )

  const handleSync = async () => {
    setSyncLoading(true)
    setSyncMsg(null)
    try {
      const res = await fetch("/api/proventos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: "2y" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao atualizar proventos")
      }
      const inserted = Number(data?.inserted || 0)
      const skipped = Number(data?.skipped || 0)
      setSyncMsg(`Atualização concluída: ${inserted} novo(s), ${skipped} ignorado(s).`)
      router.refresh()
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Falha ao atualizar")
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" /> Proventos
          </h1>
          <p className="text-muted-foreground">Dividendo, JCP, rendimentos e amortizações. Com histórico e agenda.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncLoading || !!tableError}>
            <RefreshCcw className={"h-4 w-4 " + (syncLoading ? "animate-spin" : "")} />
            {syncLoading ? "Atualizando..." : "Atualizar"}
          </Button>
          <AddProventoDialog userId={userId} rendaVariavel={rendaVariavel} disabled={!!tableError} />
        </div>
      </div>

      {tableError && (
        <Alert className="border border-destructive/30">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-destructive" />
            <div className="space-y-2">
              <p className="font-medium">Tabela de proventos ainda não está pronta no banco.</p>
              <p className="text-sm text-muted-foreground">
                Erro do Supabase: <span className="font-mono">{tableError}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Você precisa executar o script SQL em <span className="font-medium">supabase/sql/proventos.sql</span> (incluído
                neste patch) para criar/atualizar as tabelas e políticas.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {syncMsg && (
        <Alert className={syncMsg.toLowerCase().includes("falha") ? "border border-destructive/30" : "border border-primary/20"}>
          {syncMsg}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previstos (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPrevistos30d)}</div>
            <p className="text-sm text-muted-foreground">{previstos30d.length} evento(s)</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebidos (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecebidosMes)}</div>
            <p className="text-sm text-muted-foreground">{recebidosMes.length} evento(s)</p>
          </CardContent>
        </Card>

        <Card className="glass-card card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proventos.length}</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">Div</Badge>
              <Badge variant="secondary">JCP</Badge>
              <Badge variant="secondary">Rend</Badge>
              <Badge variant="secondary">Amort</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dica</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para que o total fique correto, preencha <span className="font-medium">Quantidade base</span> (qtde na data COM).
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Agenda</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <ProventosTable userId={userId} data={upcoming} rendaVariavel={rendaVariavel} emptyLabel="Nenhum provento agendado." />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ProventosTable userId={userId} data={history} rendaVariavel={rendaVariavel} emptyLabel="Nenhum provento no histórico." />
        </TabsContent>
      </Tabs>
    </div>
  )
}
