"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_VARIAVEL, SETORES, searchAtivos, getCotacao } from "@/lib/api/brapi"
import { formatCurrency } from "@/lib/utils/currency"

export function AddRendaVariavelDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [cotacaoAtual, setCotacaoAtual] = useState<number | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    ticker: "",
    tipo: "acao" as keyof typeof TIPOS_RENDA_VARIAVEL,
    quantidade: "",
    preco_medio: "",
    data_compra: new Date().toISOString().split("T")[0],
    corretora: "",
    setor: "",
    observacoes: "",
  })

  const handleSearch = async () => {
    if (searchQuery.length < 2) return
    setIsSearching(true)
    const results = await searchAtivos(searchQuery)
    setSearchResults(results)
    setIsSearching(false)
  }

  const handleSelectTicker = async (ticker: string) => {
    setFormData((prev) => ({ ...prev, ticker }))
    setSearchResults([])
    setSearchQuery("")

    // Buscar cotação atual
    const cotacao = await getCotacao(ticker)
    if (cotacao) {
      setCotacaoAtual(cotacao.regularMarketPrice)
    }
  }

  const handleBuscarCotacao = async () => {
    if (!formData.ticker) return
    const cotacao = await getCotacao(formData.ticker.toUpperCase())
    if (cotacao) {
      setCotacaoAtual(cotacao.regularMarketPrice)
      setFormData((prev) => ({
        ...prev,
        preco_medio: cotacao.regularMarketPrice.toFixed(2),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("renda_variavel").insert({
      user_id: user.id,
      ticker: formData.ticker.toUpperCase(),
      tipo: formData.tipo,
      quantidade: Number.parseFloat(formData.quantidade),
      preco_medio: Number.parseFloat(formData.preco_medio),
      data_compra: formData.data_compra,
      corretora: formData.corretora || null,
      setor: formData.setor || null,
      observacoes: formData.observacoes || null,
    })

    setOpen(false)
    setFormData({
      ticker: "",
      tipo: "acao",
      quantidade: "",
      preco_medio: "",
      data_compra: new Date().toISOString().split("T")[0],
      corretora: "",
      setor: "",
      observacoes: "",
    })
    setCotacaoAtual(null)

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 neon-glow">
          <Plus className="h-4 w-4" />
          Adicionar Ativo
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="neon-text">Adicionar Ativo de Renda Variavel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Busca de ticker */}
          <div className="space-y-2">
            <Label>Buscar Ativo</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o ticker ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                className="border-primary/20 bg-background/50"
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="glass-card rounded-lg border border-primary/20 max-h-40 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                    onClick={() => handleSelectTicker(result.symbol)}
                  >
                    <span className="font-bold text-primary">{result.symbol}</span>
                    <span className="text-muted-foreground text-sm ml-2">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker *</Label>
              <div className="flex gap-2">
                <Input
                  id="ticker"
                  placeholder="Ex: PETR4"
                  value={formData.ticker}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  className="border-primary/20 bg-background/50"
                  required
                />
                <Button type="button" variant="outline" size="sm" onClick={handleBuscarCotacao}>
                  Cotar
                </Button>
              </div>
              {cotacaoAtual && (
                <p className="text-xs text-emerald-400">Cotacao atual: {formatCurrency(cotacaoAtual)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v as any }))}>
                <SelectTrigger className="border-primary/20 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  {Object.entries(TIPOS_RENDA_VARIAVEL).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.0001"
                placeholder="0"
                value={formData.quantidade}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantidade: e.target.value }))}
                className="border-primary/20 bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco_medio">Preco Medio (R$) *</Label>
              <Input
                id="preco_medio"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.preco_medio}
                onChange={(e) => setFormData((prev) => ({ ...prev, preco_medio: e.target.value }))}
                className="border-primary/20 bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_compra">Data da Compra *</Label>
              <Input
                id="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_compra: e.target.value }))}
                className="border-primary/20 bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corretora">Corretora</Label>
              <Input
                id="corretora"
                placeholder="Ex: XP, Clear, Rico..."
                value={formData.corretora}
                onChange={(e) => setFormData((prev) => ({ ...prev, corretora: e.target.value }))}
                className="border-primary/20 bg-background/50"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="setor">Setor</Label>
              <Select value={formData.setor} onValueChange={(v) => setFormData((prev) => ({ ...prev, setor: v }))}>
                <SelectTrigger className="border-primary/20 bg-background/50">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  {SETORES.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full neon-glow" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar Ativo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
