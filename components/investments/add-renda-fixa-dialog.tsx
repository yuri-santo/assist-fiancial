"use client"

import type React from "react"
import { useState, useTransition, useEffect, useId } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Calculator } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_FIXA, INDEXADORES } from "@/lib/api/brapi"
import { formatCurrency } from "@/lib/utils/currency"

const CDI_ATUAL = 10.65
const IPCA_ATUAL = 4.5

export function AddRendaFixaDialog() {
  const formId = useId()
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

      if (dias > 0 && valorInicial > 0 && taxa > 0) {
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
      taxa: formData.taxa ? Number.parseFloat(formData.taxa) : 0,
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

  const getTaxaLabel = () => {
    switch (formData.indexador) {
      case "cdi":
        return "Taxa (% do CDI) *"
      case "selic":
        return "Taxa (% da Selic) *"
      case "ipca":
        return "Taxa (% + IPCA) *"
      case "prefixado":
        return "Taxa (% a.a.) *"
      default:
        return "Taxa (%) *"
    }
  }

  const getTaxaPlaceholder = () => {
    switch (formData.indexador) {
      case "cdi":
      case "selic":
        return "Ex: 110 para 110%"
      case "ipca":
        return "Ex: 5.5 para IPCA + 5,5%"
      case "prefixado":
        return "Ex: 12.5 para 12,5% a.a."
      default:
        return "Ex: 10"
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 neon-glow">
          <Plus className="h-4 w-4" />
          Adicionar Aplicacao
        </Button>
      </DialogTrigger>
      <DialogContent className="border-primary/20 bg-background max-w-[95vw] sm:max-w-2xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="text-primary">Adicionar Aplicacao de Renda Fixa</DialogTitle>
          <DialogDescription>Preencha os dados da aplicacao incluindo a taxa de juros</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 max-h-[calc(95vh-120px)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-nome`}>Nome da Aplicacao *</Label>
              <Input
                id={`${formId}-nome`}
                name="nome"
                placeholder="Ex: CDB Banco Inter 110% CDI"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                className="border-primary/20 bg-background"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-tipo`}>Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v as keyof typeof TIPOS_RENDA_FIXA }))}
              >
                <SelectTrigger id={`${formId}-tipo`} name="tipo" className="border-primary/20 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  {Object.entries(TIPOS_RENDA_FIXA).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-instituicao`}>Instituicao *</Label>
              <Input
                id={`${formId}-instituicao`}
                name="instituicao"
                placeholder="Ex: Banco Inter, XP, BTG..."
                value={formData.instituicao}
                onChange={(e) => setFormData((prev) => ({ ...prev, instituicao: e.target.value }))}
                className="border-primary/20 bg-background"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-valor_investido`}>Valor Investido (R$) *</Label>
              <Input
                id={`${formId}-valor_investido`}
                name="valor_investido"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.valor_investido}
                onChange={(e) => setFormData((prev) => ({ ...prev, valor_investido: e.target.value }))}
                className="border-primary/20 bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-valor_atual`}>Valor Atual (R$)</Label>
              <Input
                id={`${formId}-valor_atual`}
                name="valor_atual"
                type="number"
                step="0.01"
                placeholder="Igual ao investido se vazio"
                value={formData.valor_atual}
                onChange={(e) => setFormData((prev) => ({ ...prev, valor_atual: e.target.value }))}
                className="border-primary/20 bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-indexador`}>Indexador *</Label>
              <Select
                value={formData.indexador}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, indexador: v as keyof typeof INDEXADORES }))}
              >
                <SelectTrigger id={`${formId}-indexador`} name="indexador" className="border-primary/20 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  {Object.entries(INDEXADORES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-taxa`}>{getTaxaLabel()}</Label>
              <Input
                id={`${formId}-taxa`}
                name="taxa"
                type="number"
                step="0.01"
                placeholder={getTaxaPlaceholder()}
                value={formData.taxa}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxa: e.target.value }))}
                className="border-primary/20 bg-background"
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.indexador === "cdi" && "Digite 110 para 110% do CDI"}
                {formData.indexador === "ipca" && "Digite 5.5 para IPCA + 5,5%"}
                {formData.indexador === "prefixado" && "Digite 12.5 para 12,5% a.a."}
                {formData.indexador === "selic" && "Digite 100 para 100% da Selic"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-data_aplicacao`}>Data Aplicacao *</Label>
              <Input
                id={`${formId}-data_aplicacao`}
                name="data_aplicacao"
                type="date"
                value={formData.data_aplicacao}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_aplicacao: e.target.value }))}
                className="border-primary/20 bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-data_vencimento`}>Data Vencimento</Label>
              <Input
                id={`${formId}-data_vencimento`}
                name="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_vencimento: e.target.value }))}
                className="border-primary/20 bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-liquidez`}>Liquidez</Label>
              <Select
                value={formData.liquidez}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, liquidez: v as "diaria" | "vencimento" | "carencia" }))
                }
              >
                <SelectTrigger id={`${formId}-liquidez`} name="liquidez" className="border-primary/20 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  <SelectItem value="diaria">Diaria</SelectItem>
                  <SelectItem value="vencimento">No Vencimento</SelectItem>
                  <SelectItem value="carencia">Com Carencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.liquidez === "carencia" && (
              <div className="space-y-2">
                <Label htmlFor={`${formId}-dias_carencia`}>Dias de Carencia</Label>
                <Input
                  id={`${formId}-dias_carencia`}
                  name="dias_carencia"
                  type="number"
                  placeholder="Ex: 90"
                  value={formData.dias_carencia}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dias_carencia: e.target.value }))}
                  className="border-primary/20 bg-background"
                />
              </div>
            )}
          </div>

          {valorProjetado !== null && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Simulacao de Rendimento
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Valor Investido</p>
                  <p className="font-bold">{formatCurrency(Number.parseFloat(formData.valor_investido) || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Projetado</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(valorProjetado)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Rendimento Estimado</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(valorProjetado - Number.parseFloat(formData.valor_investido))} (
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar Aplicacao
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
