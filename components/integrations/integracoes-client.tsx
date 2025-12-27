"use client"

import { useMemo, useState } from "react"
import Script from "next/script"
import type { BankConnection, BankTransaction } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Link2, ShieldAlert } from "lucide-react"

async function apiJson<T>(...args: Parameters<typeof fetch>): Promise<T> {
  const res = await fetch(...args)
  const data = (await res.json().catch(() => ({}))) as any
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

function providerLabel(p: string) {
  if (p === "mercadopago") return "Mercado Pago"
  if (p === "openfinance") return "Open Finance"
  return p
}

export function IntegracoesClient({
  userId,
  initialConnections,
  initialTransactions,
}: {
  userId: string
  initialConnections: BankConnection[]
  initialTransactions: BankTransaction[]
}) {
  const [connections, setConnections] = useState<BankConnection[]>(initialConnections)
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loadingSync, setLoadingSync] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)

  const mpConn = useMemo(() => connections.find((c) => c.provider === "mercadopago"), [connections])
  const ofConn = useMemo(() => connections.find((c) => c.provider === "openfinance"), [connections])

  const [loadingOpenFinance, setLoadingOpenFinance] = useState(false)
  const [openFinanceDays, setOpenFinanceDays] = useState(60)
  const [pluggyReady, setPluggyReady] = useState(false)

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])

  const refreshAll = async () => {
    const c = await apiJson<{ ok: boolean; connections: BankConnection[] }>("/api/integrations/connections")
    const t = await apiJson<{ ok: boolean; transactions: BankTransaction[] }>(
      "/api/integrations/transactions?pending=1",
    )
    setConnections(c.connections)
    setTransactions(t.transactions)
  }

  const handleSyncMercadoPago = async () => {
    setLoadingSync(true)
    try {
      await apiJson<{ ok: boolean; synced: number }>("/api/integrations/mercadopago/sync?days=60", {
        method: "POST",
      })
      await refreshAll()
    } finally {
      setLoadingSync(false)
    }
  }

  const handleConnectOpenFinance = async () => {
    setLoadingOpenFinance(true)
    try {
      const tok = await apiJson<{ ok: boolean; connectToken: string }>("/api/integrations/openfinance/connect-token", {
        method: "POST",
      })

      const ConnectCtor = (window as any).PluggyConnect
      if (!ConnectCtor) {
        throw new Error("Pluggy Connect não carregou. Recarregue a página.")
      }

      const instance = new ConnectCtor({
        connectToken: tok.connectToken,
        onSuccess: async (payload: any) => {
          const itemId =
            payload?.item?.id || payload?.itemId || payload?.id || payload?.data?.item?.id || payload?.data?.itemId
          if (!itemId) throw new Error("Open Finance: não recebi itemId do provedor")

          await apiJson("/api/integrations/openfinance/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: String(itemId),
              providerName: payload?.connector?.name || payload?.connectorName || "pluggy",
            }),
          })
          await refreshAll()
        },
        onError: (err: any) => {
          console.error("PluggyConnect error", err)
        },
      })

      instance.init()
    } finally {
      setLoadingOpenFinance(false)
    }
  }

  const handleSyncOpenFinance = async () => {
    if (!ofConn || ofConn.status !== "connected") return
    setLoadingOpenFinance(true)
    try {
      const days = Math.max(1, Math.min(365, Number(openFinanceDays) || 60))
      const to = new Date()
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)

      await apiJson("/api/integrations/openfinance/sync?from=" + fromStr + "&to=" + toStr, {
        method: "POST",
      })
      await refreshAll()
    } finally {
      setLoadingOpenFinance(false)
    }
  }

  const patchTx = async (id: string, patch: Partial<Pick<BankTransaction, "direction" | "description" | "occurred_at" | "amount">>) => {
    await apiJson<{ ok: boolean }>(`/api/integrations/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as any : t)))
  }

  const importSelected = async () => {
    if (!selectedIds.length) return
    setLoadingImport(true)
    try {
      await apiJson("/api/integrations/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })
      setSelected({})
      await refreshAll()
    } finally {
      setLoadingImport(false)
    }
  }

  const importAll = async () => {
    setLoadingImport(true)
    try {
      await apiJson("/api/integrations/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importAllPending: true }),
      })
      setSelected({})
      await refreshAll()
    } finally {
      setLoadingImport(false)
    }
  }

  return (
    <div className="space-y-6">
      <Script
        src="https://connect.pluggy.ai/pluggy-connect.js"
        strategy="afterInteractive"
        onLoad={() => setPluggyReady(true)}
      />
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Integrações (Sync Bancos)</h1>
          <p className="text-sm text-muted-foreground">
            Conecte suas contas e sincronize transações. Antes de importar, você pode ajustar os lançamentos.
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Mercado Pago
              </span>
              <Badge variant={mpConn?.status === "connected" ? "default" : "secondary"}>
                {mpConn?.status === "connected" ? "Conectado" : "Não conectado"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conexão via OAuth. Sincroniza pagamentos do Mercado Pago e cria uma lista de lançamentos para revisão.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <a href="/api/integrations/mercadopago/start">
                  <Link2 className="h-4 w-4" />
                  Conectar
                </a>
              </Button>

              <Button
                variant="outline"
                onClick={handleSyncMercadoPago}
                disabled={!mpConn || mpConn.status !== "connected" || loadingSync}
                className="gap-2"
              >
                {loadingSync ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizar
              </Button>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-yellow-600" />
                <div>
                  <div className="font-medium">Atenção (MVP)</div>
                  <div className="text-muted-foreground">
                    Os lançamentos entram como <b>gasto (debit)</b> por padrão. Ajuste para <b>receita (credit)</b> na
                    mini-planilha antes de importar.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Open Finance (Pluggy)
              </span>
              <Badge variant={ofConn?.status === "connected" ? "default" : "secondary"}>
                {ofConn?.status === "connected" ? "Conectado" : "Não conectado"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte seus bancos via agregador (Pluggy). Você poderá sincronizar transações e importá-las como
              despesas/receitas.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleConnectOpenFinance}
                disabled={loadingOpenFinance || !!(ofConn && ofConn.status === "connected") || !pluggyReady}
                className="gap-2"
              >
                {loadingOpenFinance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar Open Finance
              </Button>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={openFinanceDays}
                  onChange={(e) => setOpenFinanceDays(Number(e.target.value || 60))}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">dias para sincronizar</span>

                <Button
                  variant="outline"
                  onClick={handleSyncOpenFinance}
                  disabled={!ofConn || ofConn.status !== "connected" || loadingOpenFinance}
                  className="ml-auto gap-2"
                >
                  {loadingOpenFinance ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sincronizar
                </Button>
              </div>
            </div>

            {!pluggyReady ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="font-medium">Carregando provedor…</div>
                    <div className="text-muted-foreground">Se ficar preso aqui, recarregue a página.</div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-strong border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lançamentos sincronizados (revisão)</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={importAll}
                disabled={!transactions.length || loadingImport}
                className="gap-2"
              >
                {loadingImport ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importar tudo
              </Button>
              <Button onClick={importSelected} disabled={!selectedIds.length || loadingImport} className="gap-2">
                {loadingImport ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importar selecionadas ({selectedIds.length})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions.length ? (
            <div className="text-sm text-muted-foreground">Nenhuma transação pendente. Use “Sincronizar”.</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[140px]">Tipo</TableHead>
                    <TableHead className="text-right w-[140px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Checkbox
                          checked={Boolean(selected[tx.id])}
                          onCheckedChange={(v) => setSelected((p) => ({ ...p, [tx.id]: Boolean(v) }))}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.occurred_at}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{providerLabel(tx.provider)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={tx.description || ""}
                          onBlur={(e) => {
                            const v = e.target.value
                            if ((tx.description || "") !== v) patchTx(tx.id, { description: v })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={tx.direction}
                          onValueChange={(v) => patchTx(tx.id, { direction: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Gasto</SelectItem>
                            <SelectItem value="credit">Receita</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(tx.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
