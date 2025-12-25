"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bell, Wallet, CreditCard, Target, AlertTriangle, Save } from "lucide-react"

interface NotificationSettingsProps {
  userId: string
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [settings, setSettings] = useState({
    orcamentoExcedido: true,
    orcamentoPerto: true,
    faturaVencendo: true,
    objetivoAlcancado: true,
    reservaEmergenciaBaixa: true,
    receitaRecorrente: false,
    despesaRecorrente: true,
    percentualAlertaOrcamento: 80,
    diasAntesFatura: 5,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Salvar no localStorage ou banco
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Orcamento
        </h3>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="orcamentoExcedido">Alertar quando exceder orcamento</Label>
            <Switch
              id="orcamentoExcedido"
              checked={settings.orcamentoExcedido}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, orcamentoExcedido: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="orcamentoPerto">Alertar quando estiver perto do limite</Label>
            <Switch
              id="orcamentoPerto"
              checked={settings.orcamentoPerto}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, orcamentoPerto: v }))}
            />
          </div>
          {settings.orcamentoPerto && (
            <div className="flex items-center gap-2">
              <Label htmlFor="percentual" className="text-sm text-muted-foreground">
                Alertar ao atingir
              </Label>
              <Input
                id="percentual"
                type="number"
                className="w-20 border-primary/20"
                value={settings.percentualAlertaOrcamento}
                onChange={(e) => setSettings((p) => ({ ...p, percentualAlertaOrcamento: Number(e.target.value) }))}
              />
              <span className="text-sm text-muted-foreground">% do orcamento</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Cartoes de Credito
        </h3>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="faturaVencendo">Alertar antes do vencimento da fatura</Label>
            <Switch
              id="faturaVencendo"
              checked={settings.faturaVencendo}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, faturaVencendo: v }))}
            />
          </div>
          {settings.faturaVencendo && (
            <div className="flex items-center gap-2">
              <Label htmlFor="dias" className="text-sm text-muted-foreground">
                Alertar
              </Label>
              <Input
                id="dias"
                type="number"
                className="w-20 border-primary/20"
                value={settings.diasAntesFatura}
                onChange={(e) => setSettings((p) => ({ ...p, diasAntesFatura: Number(e.target.value) }))}
              />
              <span className="text-sm text-muted-foreground">dias antes</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Objetivos
        </h3>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="objetivoAlcancado">Notificar quando alcancar objetivo</Label>
            <Switch
              id="objetivoAlcancado"
              checked={settings.objetivoAlcancado}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, objetivoAlcancado: v }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Reserva de Emergencia
        </h3>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="reservaBaixa">Alertar quando reserva estiver baixa</Label>
            <Switch
              id="reservaBaixa"
              checked={settings.reservaEmergenciaBaixa}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, reservaEmergenciaBaixa: v }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Transacoes Recorrentes
        </h3>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="despesaRecorrente">Lembrar de despesas recorrentes</Label>
            <Switch
              id="despesaRecorrente"
              checked={settings.despesaRecorrente}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, despesaRecorrente: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="receitaRecorrente">Lembrar de receitas recorrentes</Label>
            <Switch
              id="receitaRecorrente"
              checked={settings.receitaRecorrente}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, receitaRecorrente: v }))}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full neon-glow">
        <Save className="mr-2 h-4 w-4" />
        {saved ? "Salvo!" : "Salvar Configuracoes"}
      </Button>
    </div>
  )
}
