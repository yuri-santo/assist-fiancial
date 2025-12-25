"use client"

import type React from "react"
import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Calculator } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_FIXA, INDEXADORES } from "@/lib/api/brapi"
import { formatCurrency } from "@/lib/utils/currency"
import { ScrollArea } from "@/components/ui/scroll-area"

const CDI_ATUAL = 10.65 // % a.a.
const IPCA_ATUAL = 4.5 // % a.a.

export function AddRendaFixaDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [valorProjetado, setValorProjetado] = useState<number | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "cdb" as keyof typeof TIPOS_RENDA_FIXA,
    instituicao: "",
    valor_investido: "",
    valor_atual: "",
    taxa: "",
    indexador: "cdi" as keyof typeof INDEXADORES | "",
    data_aplicacao: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    liquidez: "vencimento" as "diaria" | "vencimento" | "carencia",
    dias_carencia: "",
    observacoes: "",
  })

  useEffect(() => {
    if (formData.valor_investido && formData.taxa && formData.data_vencimento && formData.data_aplicacao) {
      const valorInicial = Number.parseFloat(formData.valor_investido)
      const taxa = Number.parseFloat(formData.taxa)
      const dataInicio = new Date(formData.data_aplicacao)
      const dataFim = new Date(formData.data_vencimento)
      const dias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))

      if (dias > 0 && valorInicial > 0) {
        let taxaAnual = 0

        if (formData.indexador === "cdi") {
          taxaAnual = (CDI_ATUAL * taxa) / 100
        } else if (formData.indexador === "ipca") {
          taxaAnual = IPCA_ATUAL + taxa
        } else if (formData.indexador === "prefixado") {
          taxaAnual = taxa
        } else if (formData.indexador === "selic") {
          taxaAnual = (CDI_ATUAL * taxa) / 100
        } else {
          taxaAnual = taxa
        }

        // Calcular juros compostos
        const anos = dias / 365
        const valorFinal = valorInicial * Math.pow(1 + taxaAnual / 100, anos)
        setValorProjetado(valorFinal)
      }
    } else {
      setValorProjetado(null)
    }
  }, [formData.valor_investido, formData.taxa, formData.indexador, formData.data_aplicacao, formData.data_vencimento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const valorInvestido = Number.parseFloat(formData.valor_investido)
    const valorAtual = formData.valor_atual ? Number.parseFloat(formData.valor_atual) : valorInvestido

    await supabase.from("renda_fixa").insert({
      user_id: user.id,
      nome: formData.nome,
      tipo: formData.tipo,
      instituicao: formData.instituicao,
      valor_investido: valorInvestido,
      valor_atual: valorAtual,
      taxa: Number.parseFloat(formData.taxa),
      indexador: formData.indexador || null,
      data_aplicacao: formData.data_aplicacao,
      data_vencimento: formData.data_vencimento || null,
      liquidez: formData.liquidez,
      dias_carencia: formData.dias_carencia ? Number.parseInt(formData.dias_carencia) : null,
      observacoes: formData.observacoes || null,
    })

    setOpen(false)
    setFormData({
      nome: "",
      tipo: "cdb",
      instituicao: "",
      valor_investido: "",
      valor_atual: "",
      taxa: "",
      indexador: "cdi",
      data_aplicacao: new Date().toISOString().split("T")[0],
      data_vencimento: "",
      liquidez: "vencimento",
      dias_carencia: "",
      observacoes: "",
    })

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 neon-glow">
          <Plus className="h-4 w-4" />
          Adicionar Aplicacao
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="neon-text">Adicionar Aplicacao de Renda Fixa</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome da Aplicacao *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: CDB Banco Inter 110% CDI"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    {Object.entries(TIPOS_RENDA_FIXA).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instituicao">Instituicao *</Label>
                <Input
                  id="instituicao"
                  placeholder="Ex: Banco Inter, XP, BTG..."
                  value={formData.instituicao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instituicao: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_investido">Valor Investido (R$) *</Label>
                <Input
                  id="valor_investido"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor_investido}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valor_investido: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_atual">Valor Atual (R$)</Label>
                <Input
                  id="valor_atual"
                  type="number"
                  step="0.01"
                  placeholder="Igual ao investido se vazio"
                  value={formData.valor_atual}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valor_atual: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa (%) *</Label>
                <Input
                  id="taxa"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 110 (para 110% CDI)"
                  value={formData.taxa}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxa: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="indexador">Indexador</Label>
                <Select
                  value={formData.indexador}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, indexador: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    {Object.entries(INDEXADORES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_aplicacao">Data Aplicacao *</Label>
                <Input
                  id="data_aplicacao"
                  type="date"
                  value={formData.data_aplicacao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data_aplicacao: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data_vencimento: e.target.value }))}
                  className="border-primary/20 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidez">Liquidez</Label>
                <Select
                  value={formData.liquidez}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, liquidez: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="diaria">Diaria</SelectItem>
                    <SelectItem value="vencimento">No Vencimento</SelectItem>
                    <SelectItem value="carencia">Com Carencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.liquidez === "carencia" && (
                <div className="space-y-2">
                  <Label htmlFor="dias_carencia">Dias de Carencia</Label>
                  <Input
                    id="dias_carencia"
                    type="number"
                    placeholder="Ex: 90"
                    value={formData.dias_carencia}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dias_carencia: e.target.value }))}
                    className="border-primary/20 bg-background/50"
                  />
                </div>
              )}
            </div>

            {valorProjetado !== null && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Simulacao de Rendimento</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor Investido</p>
                    <p className="font-bold">{formatCurrency(Number.parseFloat(formData.valor_investido) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Projetado</p>
                    <p className="font-bold text-emerald-400">{formatCurrency(valorProjetado)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Rendimento Estimado</p>
                    <p className="font-bold text-emerald-400">
                      +{formatCurrency(valorProjetado - Number.parseFloat(formData.valor_investido))}(
                      {(
                        ((valorProjetado - Number.parseFloat(formData.valor_investido)) /
                          Number.parseFloat(formData.valor_investido)) *
                        100
                      ).toFixed(2)}
                      %)
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Simulacao baseada em CDI {CDI_ATUAL}% a.a. e IPCA {IPCA_ATUAL}% a.a.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full neon-glow" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Adicionar Aplicacao
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
