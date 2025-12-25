"use client"

import type React from "react"
import { useState, useTransition, useEffect, useCallback, useId } from "react"
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
import { Plus, Loader2, Search, RefreshCw, TrendingUp, TrendingDown, DollarSign, Calculator } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { TIPOS_RENDA_VARIAVEL, SETORES, MOEDAS, type MERCADOS, searchAtivos } from "@/lib/api/brapi"
import { searchCryptos } from "@/lib/api/crypto-service"
import { formatCurrency } from "@/lib/utils/currency"
import { getUnifiedQuote, getHistoricalPrice } from "@/lib/api/unified-quote-service"

export function AddRendaVariavelDialog() {
  const formId = useId()
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
    valor_investido: "",
    data_compra: new Date().toISOString().split("T")[0],
    corretora: "",
    setor: "",
    moeda: "BRL" as keyof typeof MOEDAS,
    mercado: "b3" as keyof typeof MERCADOS,
    observacoes: "",
  })

  const calcMode = TIPOS_RENDA_VARIAVEL[formData.tipo].calcMode || "shares"
  const isCrypto = formData.tipo === "cripto"

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setApiError(null)
    try {
      const results = isCrypto ? await searchCryptos(searchQuery) : await searchAtivos(searchQuery)
      setSearchResults(results)
    } catch {
      setApiError("Erro ao buscar ativos. Tente digitar o ticker manualmente.")
    }
    setIsSearching(false)
  }, [searchQuery, isCrypto])

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
    await fetchCotacao()
  }

  const fetchCotacao = useCallback(async () => {
    if (!formData.ticker || formData.ticker.length < 2) {
      return
    }

    setIsLoadingCotacao(true)
    setApiError(null)

    try {
      const ticker = formData.ticker.toUpperCase().trim()
      const purchaseDate = formData.data_compra
      const today = new Date().toISOString().split("T")[0]
      const useHistoricalPrice = purchaseDate && purchaseDate !== today && purchaseDate < today

      const assetType = isCrypto ? "crypto" : "stock"
      const currency = formData.moeda as "BRL" | "USD"

      if (useHistoricalPrice) {
        // Buscar preço histórico da data de compra
        const historicalPrice = await getHistoricalPrice(ticker, purchaseDate!, assetType, currency)

        if (historicalPrice && historicalPrice > 0) {
          setCotacaoAtual(historicalPrice)
          setVariacao(null)
          setFormData((prev) => ({
            ...prev,
            preco_medio: isCrypto ? historicalPrice.toFixed(8) : historicalPrice.toFixed(2),
          }))
        } else {
          // Fallback para cotação atual se histórico não disponível
          const quote = await getUnifiedQuote(ticker, assetType, currency)
          if (quote && quote.price > 0) {
            setCotacaoAtual(quote.price)
            setVariacao(quote.changePercent)
            setFormData((prev) => ({
              ...prev,
              preco_medio: isCrypto ? quote.price.toFixed(8) : quote.price.toFixed(2),
            }))
            setApiError("Preço histórico indisponível para esta data. Usando cotação atual.")
          } else {
            setApiError("Não foi possível obter a cotação. Informe o preço manualmente.")
          }
        }
      } else {
        // Buscar cotação atual
        const quote = await getUnifiedQuote(ticker, assetType, currency)

        if (quote && quote.price > 0) {
          setCotacaoAtual(quote.price)
          setVariacao(quote.changePercent)
          setFormData((prev) => ({
            ...prev,
            preco_medio: isCrypto ? quote.price.toFixed(8) : quote.price.toFixed(2),
          }))
        } else {
          setApiError("Ativo não encontrado. Verifique o ticker (ex: PETR4, AAPL, NKE, BTC).")
        }
      }
    } catch {
      setApiError("Erro ao buscar cotação. Tente novamente ou informe o preço manualmente.")
    } finally {
      setIsLoadingCotacao(false)
    }
  }, [formData.ticker, formData.data_compra, formData.moeda, isCrypto])

  useEffect(() => {
    if (calcMode === "value" && formData.valor_investido && formData.preco_medio) {
      const valorInvestido = Number.parseFloat(formData.valor_investido)
      const precoMedio = Number.parseFloat(formData.preco_medio)
      if (valorInvestido > 0 && precoMedio > 0) {
        const quantidade = valorInvestido / precoMedio
        setFormData((prev) => ({ ...prev, quantidade: quantidade.toFixed(8) }))
      }
    }
  }, [formData.valor_investido, formData.preco_medio, calcMode])

  useEffect(() => {
    if (formData.tipo === "cripto") {
      setFormData((prev) => ({ ...prev, mercado: "crypto", setor: "", moeda: "USD" }))
    } else if (
      formData.tipo === "acao" ||
      formData.tipo === "fii" ||
      formData.tipo === "etf" ||
      formData.tipo === "bdr"
    ) {
      setFormData((prev) => ({ ...prev, mercado: "b3", moeda: "BRL" }))
    } else if (formData.tipo === "stock" || formData.tipo === "reit") {
      setFormData((prev) => ({ ...prev, mercado: "nyse", moeda: "USD" }))
    }
  }, [formData.tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const quantidade = Number.parseFloat(formData.quantidade)
    const precoMedio = Number.parseFloat(formData.preco_medio)

    await supabase.from("renda_variavel").insert({
      user_id: user.id,
      ticker: formData.ticker.toUpperCase(),
      tipo: formData.tipo,
      quantidade,
      preco_medio: precoMedio,
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
      valor_investido: "",
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
      setTimeout(() => {
        router.refresh()
      }, 100)
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
      <DialogContent className="border-primary/20 bg-background max-w-[95vw] sm:max-w-3xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="text-primary">Adicionar Ativo de Renda Variável</DialogTitle>
          <DialogDescription>
            {calcMode === "value"
              ? "Informe o valor investido e a cotação. A quantidade será calculada automaticamente."
              : "Preencha os dados do ativo para adicionar à sua carteira"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40"
        >
          {apiError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
              {apiError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-tipo`}>Tipo de Ativo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, tipo: v as keyof typeof TIPOS_RENDA_VARIAVEL }))
                }
              >
                <SelectTrigger id={`${formId}-tipo`} name="tipo" className="border-primary/20 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  {Object.entries(TIPOS_RENDA_VARIAVEL).map(([key, { label, color }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-search`}>Buscar Ativo</Label>
            <div className="relative">
              <Input
                id={`${formId}-search`}
                name="search"
                placeholder={
                  isCrypto
                    ? "Digite a criptomoeda (ex: BTC, ETH)..."
                    : "Digite o ticker ou nome (ex: PETR4, Petrobras)..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-primary/20 bg-background pr-10"
                autoComplete="off"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="rounded-lg border border-primary/20 max-h-32 overflow-y-auto bg-background">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ticker`}>{isCrypto ? "Criptomoeda" : "Ticker"} *</Label>
              <div className="flex gap-2">
                <Input
                  id={`${formId}-ticker`}
                  name="ticker"
                  placeholder={isCrypto ? "Ex: BTC" : "Ex: PETR4"}
                  value={formData.ticker}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                    setCotacaoAtual(null)
                    setVariacao(null)
                  }}
                  className="border-primary/20 bg-background"
                  required
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fetchCotacao()}
                  disabled={!formData.ticker || isLoadingCotacao}
                  className="shrink-0"
                  aria-label="Buscar cotação"
                >
                  {isLoadingCotacao ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              {cotacaoAtual !== null && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted border border-primary/20 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cotação Atual</p>
                    <p className="font-bold text-primary">{formatCurrency(cotacaoAtual)}</p>
                  </div>
                  {variacao !== null && (
                    <div className={`flex items-center gap-1 ${variacao >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {variacao >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span className="text-xs font-medium">{variacao.toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-moeda`}>Moeda *</Label>
              <Select
                value={formData.moeda}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, moeda: v as keyof typeof MOEDAS }))}
              >
                <SelectTrigger id={`${formId}-moeda`} name="moeda" className="border-primary/20 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  {Object.entries(MOEDAS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {calcMode === "value" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-valor_investido`} className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Investido *
                  </Label>
                  <Input
                    id={`${formId}-valor_investido`}
                    name="valor_investido"
                    type="number"
                    step="0.01"
                    placeholder="Digite o valor investido"
                    value={formData.valor_investido}
                    onChange={(e) => setFormData((prev) => ({ ...prev, valor_investido: e.target.value }))}
                    className="border-primary/20 bg-background"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-preco_medio`}>Preço na Compra *</Label>
                  <Input
                    id={`${formId}-preco_medio`}
                    name="preco_medio"
                    type="number"
                    step="0.00000001"
                    placeholder="Digite ou busque cotação"
                    value={formData.preco_medio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preco_medio: e.target.value }))}
                    className="border-primary/20 bg-background"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${formId}-quantidade`} className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-500" />
                    Quantidade (Calculada Automaticamente)
                  </Label>
                  <Input
                    id={`${formId}-quantidade`}
                    name="quantidade"
                    type="number"
                    step="0.00000001"
                    value={formData.quantidade}
                    className="border-primary/20 bg-emerald-500/10 font-mono"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Quantidade = Valor Investido ÷ Preço na Compra</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-quantidade`}>Quantidade *</Label>
                  <Input
                    id={`${formId}-quantidade`}
                    name="quantidade"
                    type="number"
                    step="0.0001"
                    placeholder="0"
                    value={formData.quantidade}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantidade: e.target.value }))}
                    className="border-primary/20 bg-background"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-preco_medio`}>Preço Médio *</Label>
                  <Input
                    id={`${formId}-preco_medio`}
                    name="preco_medio"
                    type="number"
                    step="0.01"
                    placeholder="Digite ou busque cotação"
                    value={formData.preco_medio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preco_medio: e.target.value }))}
                    className="border-primary/20 bg-background"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor={`${formId}-data_compra`}>Data da Compra *</Label>
              <Input
                id={`${formId}-data_compra`}
                name="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, data_compra: e.target.value }))
                  if (formData.ticker) {
                    fetchCotacao()
                  }
                }}
                className="border-primary/20 bg-background"
                required
              />
              <p className="text-xs text-muted-foreground">
                O sistema buscará o preço do ativo nesta data automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-corretora`}>Corretora</Label>
              <Input
                id={`${formId}-corretora`}
                name="corretora"
                placeholder={isCrypto ? "Ex: Binance, Coinbase..." : "Ex: XP, Clear, Rico..."}
                value={formData.corretora}
                onChange={(e) => setFormData((prev) => ({ ...prev, corretora: e.target.value }))}
                className="border-primary/20 bg-background"
              />
            </div>

            {!isCrypto && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`${formId}-setor`}>Setor</Label>
                <Select value={formData.setor} onValueChange={(v) => setFormData((prev) => ({ ...prev, setor: v }))}>
                  <SelectTrigger id={`${formId}-setor`} name="setor" className="border-primary/20 bg-background">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent className="border-primary/20">
                    {SETORES.map((setor) => (
                      <SelectItem key={setor} value={setor}>
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-observacoes`}>Observações</Label>
              <Input
                id={`${formId}-observacoes`}
                name="observacoes"
                placeholder="Notas adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                className="border-primary/20 bg-background"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 sticky bottom-0 bg-background border-t border-primary/20 -mx-6 px-6 py-4">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Adicionar Ativo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
