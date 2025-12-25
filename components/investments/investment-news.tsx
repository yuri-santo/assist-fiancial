"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ExternalLink,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react"
import { motion } from "framer-motion"

interface NewsItem {
  id: string
  title: string
  summary: string
  category: "mercado" | "economia" | "criptomoedas" | "dica"
  sentiment: "positive" | "negative" | "neutral"
  date: string
  source: string
  url?: string
}

interface InvestmentTip {
  id: string
  title: string
  description: string
  category: "iniciante" | "intermediario" | "avancado"
  icon: "lightbulb" | "trending" | "shield"
}

// Dicas de investimento organizadas por categoria
const INVESTMENT_TIPS: InvestmentTip[] = [
  {
    id: "1",
    title: "Diversifique sua carteira",
    description:
      "Nunca coloque todos os ovos na mesma cesta. Distribua seus investimentos entre renda fixa, acoes, FIIs e outros ativos para reduzir riscos.",
    category: "iniciante",
    icon: "shield",
  },
  {
    id: "2",
    title: "Invista com regularidade",
    description:
      "Aporte mensalmente um valor fixo, independente do mercado. Isso reduz o impacto da volatilidade atraves do preco medio (DCA).",
    category: "iniciante",
    icon: "trending",
  },
  {
    id: "3",
    title: "Reinvista os dividendos",
    description:
      "Quando receber dividendos, reinvista-os para acelerar o crescimento do seu patrimonio atraves dos juros compostos.",
    category: "intermediario",
    icon: "lightbulb",
  },
  {
    id: "4",
    title: "Analise o P/L das acoes",
    description:
      "O indicador Preco/Lucro ajuda a identificar se uma acao esta cara ou barata em relacao ao seu lucro. Compare com empresas do mesmo setor.",
    category: "intermediario",
    icon: "trending",
  },
  {
    id: "5",
    title: "Mantenha uma reserva de emergencia",
    description:
      "Antes de investir em renda variavel, tenha de 6 a 12 meses de despesas guardados em investimentos de alta liquidez.",
    category: "iniciante",
    icon: "shield",
  },
  {
    id: "6",
    title: "Estude os fundamentos",
    description:
      "Analise o balanco patrimonial, fluxo de caixa e historico de dividendos antes de investir em qualquer empresa.",
    category: "avancado",
    icon: "lightbulb",
  },
]

// Noticias simuladas (em producao, viria de uma API)
const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Ibovespa fecha em alta com otimismo do mercado",
    summary: "O principal indice da bolsa brasileira subiu 1.2% impulsionado por acoes de bancos e commodities.",
    category: "mercado",
    sentiment: "positive",
    date: new Date().toISOString(),
    source: "InfoMoney",
  },
  {
    id: "2",
    title: "BC mantem taxa Selic estavel em 10.5%",
    summary:
      "O Comite de Politica Monetaria decidiu manter a taxa basica de juros, sinalizando cautela com a inflacao.",
    category: "economia",
    sentiment: "neutral",
    date: new Date(Date.now() - 86400000).toISOString(),
    source: "Valor Economico",
  },
  {
    id: "3",
    title: "Bitcoin atinge nova maxima historica",
    summary:
      "A principal criptomoeda do mercado ultrapassou os US$ 90 mil, impulsionada por investidores institucionais.",
    category: "criptomoedas",
    sentiment: "positive",
    date: new Date(Date.now() - 172800000).toISOString(),
    source: "CoinTelegraph",
  },
  {
    id: "4",
    title: "Setor de energia eletrica sofre com incertezas regulatorias",
    summary: "Acoes de empresas de energia caem ate 3% apos rumores de mudancas nas regras de concessao.",
    category: "mercado",
    sentiment: "negative",
    date: new Date(Date.now() - 259200000).toISOString(),
    source: "Estadao",
  },
]

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Agora"
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays < 7) return `${diffDays}d atras`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function InvestmentNews() {
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS)
  const [tips] = useState<InvestmentTip[]>(INVESTMENT_TIPS)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // Rotate tips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [tips.length])

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simula uma requisicao de API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setNews([...MOCK_NEWS].sort(() => Math.random() - 0.5))
    setIsLoading(false)
  }

  const currentTip = tips[currentTipIndex]

  return (
    <div className="space-y-6">
      {/* Dica em destaque */}
      <motion.div
        key={currentTip.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="card-3d glass-card overflow-hidden border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 -z-10" />
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                    Dica de Investimento
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {currentTip.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{currentTip.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{currentTip.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <div className="flex gap-1">
                {tips.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTipIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentTipIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTipIndex((prev) => (prev + 1) % tips.length)}
                className="text-xs gap-1"
              >
                Proxima dica <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Noticias */}
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent -z-10" />
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Noticias do Mercado</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="mercado">Mercado</TabsTrigger>
              <TabsTrigger value="economia">Economia</TabsTrigger>
              <TabsTrigger value="criptomoedas">Cripto</TabsTrigger>
            </TabsList>

            {["todas", "mercado", "economia", "criptomoedas"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {news
                  .filter((item) => tab === "todas" || item.category === tab)
                  .map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.sentiment === "positive"
                              ? "bg-emerald-500/20"
                              : item.sentiment === "negative"
                                ? "bg-red-500/20"
                                : "bg-muted"
                          }`}
                        >
                          {item.sentiment === "positive" ? (
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                          ) : item.sentiment === "negative" ? (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          ) : (
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeDate(item.date)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-primary/80">{item.source}</span>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
