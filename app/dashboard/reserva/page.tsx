import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, AlertTriangle, CheckCircle, TrendingUp, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Objetivo, Despesa } from "@/lib/types"
import { EmergencyReserveSetup } from "@/components/reserve/emergency-reserve-setup"
import { ReserveActions } from "@/components/reserve/reserve-actions"

export default async function ReservaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get last 3 months of expenses for average calculation
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const [reservaRes, despesasRes] = await Promise.all([
    supabase.from("objetivos").select("*").eq("user_id", user.id).eq("tipo", "emergencia").single(),
    supabase.from("despesas").select("*").eq("user_id", user.id).gte("data", threeMonthsAgo.toISOString()),
  ])

  const reserva = reservaRes.data as Objetivo | null
  const despesas = (despesasRes.data || []) as Despesa[]

  // Calculate average monthly expenses (based on actual expenses, not investments)
  const mediaDespesas = despesas.length > 0 ? despesas.reduce((sum, d) => sum + d.valor, 0) / 3 : 0

  // Recommendations for emergency fund
  const meta3Meses = mediaDespesas * 3
  const meta6Meses = mediaDespesas * 6
  const meta12Meses = mediaDespesas * 12

  if (!reserva) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold neon-text">Reserva de Emergencia</h1>
          <p className="text-muted-foreground">Configure sua seguranca financeira</p>
        </div>

        <Card className="glass-card">
          <CardContent className="py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="relative mx-auto w-fit">
                <ShieldCheck className="mx-auto h-16 w-16 text-primary" />
                <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Configure sua Reserva de Emergencia</h3>
              <p className="mt-2 text-muted-foreground">
                A reserva de emergencia e essencial para sua seguranca financeira. Recomendamos guardar de 3 a 12 meses
                de despesas.
              </p>

              {mediaDespesas > 0 && (
                <div className="mt-6 space-y-3 rounded-lg bg-background/30 p-4 text-left border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    Baseado nas suas despesas ({formatCurrency(mediaDespesas)}/mes):
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>3 meses (minimo):</span>
                      <span className="font-medium">{formatCurrency(meta3Meses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>6 meses (recomendado):</span>
                      <span className="font-medium text-primary">{formatCurrency(meta6Meses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>12 meses (ideal):</span>
                      <span className="font-medium">{formatCurrency(meta12Meses)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <EmergencyReserveSetup userId={user.id} mediaDespesas={mediaDespesas} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const porcentagem = reserva.valor_total > 0 ? (reserva.valor_atual / reserva.valor_total) * 100 : 0
  const mesesCobertos = mediaDespesas > 0 ? reserva.valor_atual / mediaDespesas : 0

  let status: "critical" | "warning" | "safe"
  let statusText: string
  let StatusIcon: typeof AlertTriangle

  if (mesesCobertos < 3) {
    status = "critical"
    statusText = "Critico - Menos de 3 meses"
    StatusIcon = AlertTriangle
  } else if (mesesCobertos < 6) {
    status = "warning"
    statusText = "Atencao - Entre 3 e 6 meses"
    StatusIcon = AlertTriangle
  } else {
    status = "safe"
    statusText = "Seguro - 6+ meses"
    StatusIcon = CheckCircle
  }

  const statusColors = {
    critical: "text-red-400",
    warning: "text-amber-400",
    safe: "text-emerald-400",
  }

  const statusBgColors = {
    critical: "bg-red-500/10",
    warning: "bg-amber-500/10",
    safe: "bg-emerald-500/10",
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text">Reserva de Emergencia</h1>
          <p className="text-muted-foreground">Sua seguranca financeira</p>
        </div>
        <ReserveActions reserva={reserva} mediaDespesas={mediaDespesas} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Guardado</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text">{formatCurrency(reserva.valor_atual)}</div>
            <p className="text-sm text-muted-foreground">de {formatCurrency(reserva.valor_total)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meses Cobertos</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mesesCobertos.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">baseado em {formatCurrency(mediaDespesas)}/mes</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progresso</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{porcentagem.toFixed(0)}%</div>
            <p className="text-sm text-muted-foreground">da meta</p>
          </CardContent>
        </Card>

        <Card className={`glass-card ${statusBgColors[status]}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <StatusIcon className={`h-5 w-5 ${statusColors[status]}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${statusColors[status]}`}>
              {status === "critical" ? "Critico" : status === "warning" ? "Atencao" : "Seguro"}
            </div>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Progresso da Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso atual</span>
              <span className="font-semibold">{porcentagem.toFixed(0)}%</span>
            </div>
            <Progress
              value={Math.min(porcentagem, 100)}
              className={`h-4 ${
                status === "critical"
                  ? "[&>div]:bg-red-500"
                  : status === "warning"
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-emerald-500"
              }`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-background/30 border-primary/10">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Meta 3 meses</p>
                <p className="text-lg font-semibold">{formatCurrency(meta3Meses)}</p>
                <Progress value={Math.min((reserva.valor_atual / meta3Meses) * 100, 100)} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card className="bg-background/30 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Meta 6 meses</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(meta6Meses)}</p>
                <Progress value={Math.min((reserva.valor_atual / meta6Meses) * 100, 100)} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card className="bg-background/30 border-primary/10">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Meta 12 meses</p>
                <p className="text-lg font-semibold">{formatCurrency(meta12Meses)}</p>
                <Progress value={Math.min((reserva.valor_atual / meta12Meses) * 100, 100)} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {reserva.valor_atual < reserva.valor_total && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
              <h4 className="font-semibold text-primary">Para alcancar sua meta:</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Faltam{" "}
                <span className="font-bold text-foreground">
                  {formatCurrency(reserva.valor_total - reserva.valor_atual)}
                </span>{" "}
                para completar sua reserva de emergencia.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
