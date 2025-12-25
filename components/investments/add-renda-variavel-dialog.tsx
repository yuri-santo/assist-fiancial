"use client"

import type React from "react"
import { useState, useTransition, useEffect, useCallback } from "react"
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
import { Plus, Loader2, Search, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_VARIAVEL, SETORES, MOEDAS, MERCADOS, searchAtivos, getCotacao } from "@/lib/api/brapi"
import { formatCurrency } from "@/lib/utils/currency"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AddRendaVariavelDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [cotacaoAtual, setCotacaoAtual] = useState<number | null>(null)
  const [variacao, setVariacao] = useState<number | null>(null)
  const [isLoadingCotacao, setIsLoadingCotacao] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    ticker: "",
    tipo: "acao" as keyof typeof TIPOS_RENDA_VARIAVEL,
    quantidade: "",
    preco_medio: "",
    data_compra: new Date().toISOString().split("T")[0],
    corretora: "",
    setor: "",
    moeda: "BRL" as keyof typeof MOEDAS,
    mercado: "b3" as keyof typeof MERCADOS,
    observacoes: "",
  })

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setApiError(null)
    try {
      const results = await searchAtivos(searchQuery)
      setSearchResults(results)
    } catch {
      setApiError("Erro ao buscar ativos. Tente digitar o ticker manualmente.")
    }
    setIsSearching(false)
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const handleSelectTicker = async (ticker: string) => {
    setFormData((prev) => ({ ...prev, ticker }))
    setSearchResults([])
    setSearchQuery("")
    await fetchCotacao(ticker)
  }

  const fetchCotacao = async (ticker: string) => {
    if (!ticker) return
    setIsLoadingCotacao(true)
    setApiError(null)
    try {
      const cotacao = await getCotacao(ticker.toUpperCase())
      if (cotacao) {
        setCotacaoAtual(cotacao.regularMarketPrice)
        setVariacao(cotacao.regularMarketChangePercent)
        setFormData((prev) => ({
          ...prev,
          preco_medio: cotacao.regularMarketPrice.toFixed(2),
        }))
      } else {
        setCotacaoAtual(null)
        setVariacao(null)
        setApiError("Nao foi possivel obter cotacao. Digite o preco manualmente.")
      }
    } catch {
      setCotacaoAtual(null)
      setVariacao(null)
      setApiError("Erro na API. Digite o preco manualmente.")
    }
    setIsLoadingCotacao(false)
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
      moeda: formData.moeda,
      mercado: formData.mercado,
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
      moeda: "BRL",
      mercado: "b3",
      observacoes: "",
    })
    setCotacaoAtual(null)
    setVariacao(null)
    setApiError(null)

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
      <DialogContent className="glass-card border-primary/20 max-w-lg max-h-[85vh] fixed top-[10%] left-1/2 -translate-x-1/2 translate-y-0 flex flex-col p-0 z-[100]">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="neon-text">Adicionar Ativo de Renda Variável</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha os dados do ativo para adicionar a sua carteira
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {apiError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label>Buscar Ativo</Label>
              <div className="relative">
                <Input
                  placeholder="Digite o ticker ou nome (ex: PETR4, Petrobras)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-primary/20 bg-background/50 pr-10"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="glass-card rounded-lg border border-primary/20 max-h-40 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors flex items-center justify-between"
                      onClick={() => handleSelectTicker(result.symbol)}
                    >
                      <div>
                        <span className="font-bold text-primary">{result.symbol}</span>
                        <span className="text-muted-foreground text-sm ml-2 line-clamp-1">{result.name}</span>
                      </div>
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                      setCotacaoAtual(null)
                      setVariacao(null)
                    }}
                    className="border-primary/20 bg-background/50"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchCotacao(formData.ticker)}
                    disabled={!formData.ticker || isLoadingCotacao}
                    className="shrink-0"
                  >
                    {isLoadingCotacao ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {cotacaoAtual !== null && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-primary/20">
                    <div>
                      <p className="text-xs text-muted-foreground">Cotação atual</p>
                      <p className="font-bold text-primary">{formatCurrency(cotacaoAtual)}</p>
                    </div>
                    {variacao !== null && (
                      <div className={`flex items-center gap-1 ${variacao >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {variacao >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="text-sm font-medium">{variacao.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Ativo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20 z-[200]">
                    {Object.entries(TIPOS_RENDA_VARIAVEL).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moeda">Moeda *</Label>
                <Select
                  value={formData.moeda}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, moeda: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20 z-[200]">
                    {Object.entries(MOEDAS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mercado">Mercado *</Label>
                <Select
                  value={formData.mercado}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, mercado: v as any }))}
                >
                  <SelectTrigger className="border-primary/20 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20 z-[200]">
                    {Object.entries(MERCADOS).map(([key, { label }]) => (
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
                <Label htmlFor="preco_medio">Preço Médio *</Label>
                <Input
                  id="preco_medio"
                  type="number"
                  step="0.01"
                  placeholder="Digite ou busque cotacao"
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
                  <SelectContent className="glass-card border-primary/20 z-[200]">
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
