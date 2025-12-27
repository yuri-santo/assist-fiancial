"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, FileText, Wand2, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ocrPdfFileToText } from "@/lib/ocr/pdfOcr"

interface ImportButtonProps {
  userId: string
}

interface ImportResult {
  success: number
  errors: string[]
}

type PdfItem = {
  dataISO: string
  descricao: string
  valor: number
  parcela_atual?: number | null
  parcela_total?: number | null
  categoria_sugerida?: string | null
}

export function ImportButton({ userId }: ImportButtonProps) {
  const [open, setOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [importType, setImportType] = useState<"despesas" | "receitas" | "fatura_pdf" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [cartoes, setCartoes] = useState<Array<{ id: string; nome: string; bandeira: string | null }>>([])
  const [cartaoId, setCartaoId] = useState<string>("")
  const [replicarParcelas, setReplicarParcelas] = useState(true)
  const [criarCategorias, setCriarCategorias] = useState(true)
  const [pdfItems, setPdfItems] = useState<any[] | null>(null)
  const [pdfNeedsManual, setPdfNeedsManual] = useState(false)
  const [pdfRawText, setPdfRawText] = useState<string | null>(null)
  const [pdfStage, setPdfStage] = useState<"select" | "preview" | "importing">("select")
  const [isOcring, setIsOcring] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [autoOcr, setAutoOcr] = useState(true)
  const [pdfSummary, setPdfSummary] = useState<{ parsed: number; generated: number; skippedAsDuplicate: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("cartoes")
        .select("id,nome,bandeira")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      setCartoes((data as any) || [])
    })()
  }, [open, userId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "despesas" | "receitas") => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportType(type)
    setResult(null)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      // Skip header row
      const dataLines = lines.slice(1)
      const parsedData: any[] = []

      for (const line of dataLines) {
        // Handle CSV with semicolon or comma separator
        const separator = line.includes(";") ? ";" : ","
        const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ""))

        if (type === "despesas" && values.length >= 3) {
          // Expected format: Data, Categoria, Descricao, Valor, Forma Pagamento
          const [data, categoria, descricao, valor] = values
          if (data && valor) {
            parsedData.push({
              data: parseDate(data),
              categoria,
              descricao,
              valor: Number.parseFloat(valor.replace(",", ".").replace(/[^\d.-]/g, "")),
            })
          }
        } else if (type === "receitas" && values.length >= 3) {
          // Expected format: Data, Fonte, Descricao, Valor
          const [data, fonte, descricao, valor] = values
          if (data && valor) {
            parsedData.push({
              data: parseDate(data),
              fonte,
              descricao,
              valor: Number.parseFloat(valor.replace(",", ".").replace(/[^\d.-]/g, "")),
            })
          }
        }
      }

      setPreview(parsedData.slice(0, 10))
    } catch (error) {
      console.error("Error parsing file:", error)
      setResult({ success: 0, errors: ["Erro ao ler arquivo. Verifique o formato."] })
    }
  }

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportType("fatura_pdf")
    setResult(null)
    setPreview(null)
    setPdfSummary(null)
    setPdfFile(file)
    setPdfItems(null)
    setPdfStage("select")
  }

  const parseDate = (dateStr: string): string => {
    // Try different date formats
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ]

    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        if (format === formats[0] || format === formats[2]) {
          // DD/MM/YYYY or DD-MM-YYYY
          return `${match[3]}-${match[2]}-${match[1]}`
        } else {
          // YYYY-MM-DD
          return dateStr
        }
      }
    }

    // Default to today if parsing fails
    return new Date().toISOString().split("T")[0]
  }

  const analyzePdf = async (opts?: { ocrText?: string }) => {
    if (!pdfFile) return
    if (!cartaoId) {
      setResult({ success: 0, errors: ["Selecione um cartão para importar a fatura."] })
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      const form = new FormData()
      form.append("file", pdfFile)
      form.append("cartao_id", cartaoId)
      form.append("replicar_parcelas", replicarParcelas ? "1" : "0")
      form.append("criar_categorias", criarCategorias ? "1" : "0")
      form.append("dry_run", "1")
      if (opts?.ocrText) form.append("ocr_text", opts.ocrText)

      const res = await fetch("/api/import/cartao-fatura-pdf", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // OCR necessário
        if (res.status === 422 && data?.needsOcr && autoOcr) {
          setIsImporting(false)
          setIsOcring(true)
          setOcrProgress(0)
          try {
            const text = await ocrPdfFileToText(pdfFile, (p) => setOcrProgress(Math.round(p * 100)))
            setIsOcring(false)
            setOcrProgress(100)
            // reanalisar com o texto do OCR
            await analyzePdf({ ocrText: text })
            return
          } catch (e: any) {
            setIsOcring(false)
            setResult({ success: 0, errors: [e?.message || data?.error || "Falha ao executar OCR."] })
            return
          }
        }

        setResult({ success: 0, errors: [data?.error || "Falha ao analisar fatura."] })
        return
      }

      const items = Array.isArray(data?.items) ? data.items : []
      setPdfItems(items)
      setPdfNeedsManual(!!data?.needsManual || items.length === 0)
      setPdfRawText(typeof data?.rawText === "string" ? data.rawText : null)
      setPdfStage("preview")
      setResult(null)
    } catch (err: any) {
      setResult({ success: 0, errors: [err?.message || "Falha ao analisar fatura."] })
    } finally {
      setIsImporting(false)
    }
  }

  const submitPdfItems = async () => {
    if (!pdfFile || !cartaoId || !pdfItems) return
    setIsImporting(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append("cartao_id", cartaoId)
      form.append("replicar_parcelas", replicarParcelas ? "1" : "0")
      form.append("criar_categorias", criarCategorias ? "1" : "0")
      form.append("items_json", JSON.stringify(pdfItems))

      const res = await fetch("/api/import/cartao-fatura-pdf", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ success: 0, errors: [data?.error || "Falha ao importar fatura."] })
        return
      }
      setResult({ success: Number(data.inserted || 0), errors: [] })
      setPdfSummary({
        parsed: Number(data.parsed || 0),
        generated: Number(data.generated || 0),
        skippedAsDuplicate: Number(data.skippedAsDuplicate || 0),
      })
      setPdfStage("select")
      setPdfItems(null)
      setPdfFile(null)
      if (pdfInputRef.current) pdfInputRef.current.value = ""
      if (Number(data.inserted || 0) > 0) router.refresh()
    } catch (err: any) {
      setResult({ success: 0, errors: [err?.message || "Falha ao importar fatura."] })
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    if (!importType) return

    // Importação de fatura PDF (preview -> revisão -> confirmar)
    if (importType === "fatura_pdf") {
      if (pdfStage === "preview" && pdfItems) {
        await submitPdfItems()
      } else {
        await analyzePdf()
      }
      return
    }

    // Importação CSV (client-side)
    if (!preview) return

    setIsImporting(true)
    const supabase = createClient()
    const errors: string[] = []
    let success = 0

    for (const item of preview) {
      try {
        if (importType === "despesas") {
          const { error } = await supabase.from("despesas").insert({
            user_id: userId,
            valor: item.valor,
            data: item.data,
            descricao: item.descricao || item.categoria,
            recorrente: false,
            parcelado: false,
            total_parcelas: 1,
            parcela_atual: 1,
          })
          if (error) throw error
          success++
        } else if (importType === "receitas") {
          const { error } = await supabase.from("receitas").insert({
            user_id: userId,
            valor: item.valor,
            data: item.data,
            fonte: item.fonte || "Importado",
            descricao: item.descricao,
            recorrente: false,
          })
          if (error) throw error
          success++
        }
      } catch (error: any) {
        errors.push(`Erro na linha: ${error.message}`)
      }
    }

    setResult({ success, errors })
    setIsImporting(false)
    setPreview(null)

    if (success > 0) {
      router.refresh()
    }
  }

  const resetState = () => {
    setPreview(null)
    setResult(null)
    setImportType(null)
    setPdfFile(null)
    setPdfItems(null)
    setPdfStage("select")
    setPdfNeedsManual(false)
    setPdfRawText(null)
    setPdfSummary(null)
    setCartaoId("")
    setReplicarParcelas(true)
    setCriarCategorias(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ""
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent border-primary/30 hover:border-primary">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="neon-text">Importar Dados</DialogTitle>
          <DialogDescription>Importe despesas/receitas (CSV/Excel) ou fatura do cartão (PDF)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!preview && !result && !pdfFile && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileSelect(e, "despesas")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    ref={fileInputRef}
                  />
                  <div className="p-6 rounded-lg border-2 border-dashed border-red-500/30 hover:border-red-500/50 transition-colors text-center cursor-pointer">
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-red-400 mb-2" />
                    <p className="font-medium">Importar Despesas</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV ou Excel</p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileSelect(e, "receitas")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-6 rounded-lg border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/50 transition-colors text-center cursor-pointer">
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                    <p className="font-medium">Importar Receitas</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV ou Excel</p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    ref={pdfInputRef}
                  />
                  <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors text-center cursor-pointer">
                    <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="font-medium">Fatura Cartão (PDF)</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF (texto selecionável)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-background/30 p-4 border border-primary/10">
                <h4 className="font-medium mb-2">Formato esperado do arquivo:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Despesas:</strong> Data; Categoria; Descricao; Valor
                  </p>
                  <p>
                    <strong>Receitas:</strong> Data; Fonte; Descricao; Valor
                  </p>
                  <p className="text-xs mt-2">Formatos de data aceitos: DD/MM/YYYY ou YYYY-MM-DD</p>
                </div>
              </div>
            </>
          )}

          {pdfFile && importType === "fatura_pdf" && !result && (
            <>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  PDF selecionado: <span className="font-medium">{pdfFile.name}</span>
                </AlertDescription>
              </Alert>

              <div className="space-y-3 rounded-lg border border-primary/20 p-4 bg-background/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Cartão</p>
                  <select
                    className="w-full rounded-md bg-background border border-primary/20 px-3 py-2 text-sm"
                    value={cartaoId}
                    onChange={(e) => setCartaoId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {cartoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}{c.bandeira ? ` (${c.bandeira})` : ""}
                      </option>
                    ))}
                  </select>
                  {cartoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado ainda.</p>}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Replicar parcelas (gera 1 despesa por mês)</Label>
                  <Switch checked={replicarParcelas} onCheckedChange={(v) => setReplicarParcelas(!!v)} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Criar categorias automaticamente</Label>
                  <Switch checked={criarCategorias} onCheckedChange={(v) => setCriarCategorias(!!v)} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Executar OCR automaticamente (PDF escaneado)</Label>
                  <Switch checked={autoOcr} onCheckedChange={(v) => setAutoOcr(!!v)} />
                </div>

                {isOcring && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wand2 className="h-4 w-4" />
                      <span>Executando OCR…</span>
                      <span className="ml-auto tabular-nums">{ocrProgress}%</span>
                    </div>
                    <Progress value={ocrProgress} />
                    <p className="text-xs text-muted-foreground">
                      Se o PDF tiver muitas páginas, o OCR pode levar um pouco (depende do seu PC).
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Fluxo recomendado: <strong>Analisar</strong> → revisar/ajustar lançamentos → <strong>Importar</strong>.
                </p>
              </div>

              {pdfStage === "preview" && pdfItems && (
                <div className="space-y-2 rounded-lg border border-primary/20 p-4 bg-background/30">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Lançamentos identificados</p>
                    <p className="text-xs text-muted-foreground">{pdfItems.length} itens</p>
                  </div>

                  {pdfNeedsManual && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Não consegui identificar tudo automaticamente. Adicione/ajuste os lançamentos abaixo e clique em <strong>Importar</strong>.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={() =>
                        setPdfItems((prev) => [
                          ...((prev || []) as any[]),
                          {
                            dataISO: new Date().toISOString().split("T")[0],
                            descricao: "",
                            valor: "",
                          },
                        ])
                      }
                      disabled={isImporting || isOcring}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar lançamento
                    </Button>

                    {pdfRawText && (
                      <p className="text-xs text-muted-foreground truncate max-w-[55%]">
                        Dica: se precisar, use o texto extraído como referência (role para baixo).
                      </p>
                    )}
                  </div>
                  <ScrollArea className="h-56 rounded-md border border-primary/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-primary/20 hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Data</TableHead>
                          <TableHead className="text-muted-foreground">Descrição</TableHead>
                          <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                          <TableHead className="text-muted-foreground">Parcela</TableHead>
                          <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pdfItems.map((it: any, idx: number) => (
                          <TableRow key={idx} className="border-primary/10">
                            <TableCell className="align-top">
                              <Input
                                value={it.dataISO || ""}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setPdfItems((prev) =>
                                    (prev || []).map((x, i) => (i === idx ? { ...x, dataISO: v } : x))
                                  )
                                }}
                                className="h-8"
                                placeholder="YYYY-MM-DD"
                              />
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={it.descricao || ""}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setPdfItems((prev) =>
                                    (prev || []).map((x, i) => (i === idx ? { ...x, descricao: v } : x))
                                  )
                                }}
                                className="h-8"
                                placeholder="Descrição"
                              />
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={String(it.valor ?? "")}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setPdfItems((prev) =>
                                    (prev || []).map((x, i) => (i === idx ? { ...x, valor: v } : x))
                                  )
                                }}
                                className="h-8 text-right"
                                placeholder="0,00"
                              />
                            </TableCell>
                            <TableCell className="align-top text-xs text-muted-foreground">
                              {it.parcela_atual && it.parcela_total ? `${it.parcela_atual}/${it.parcela_total}` : "-"}
                            </TableCell>

                            <TableCell className="align-top text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPdfItems((prev) => (prev || []).filter((_, i) => i !== idx))}
                                disabled={isImporting || isOcring}
                                title="Remover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {pdfNeedsManual && pdfRawText && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Texto extraído (referência):</p>
                      <textarea
                        className="w-full h-28 rounded-md bg-background border border-primary/20 px-3 py-2 text-xs"
                        value={pdfRawText}
                        readOnly
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Você pode ajustar data/descrição/valor antes de integrar. Duplicidades são filtradas por hash.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {pdfStage === "preview" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPdfStage("select")
                      setPdfItems(null)
                      setPdfNeedsManual(false)
                      setPdfRawText(null)
                    }}
                    className="flex-1 bg-transparent"
                    disabled={isImporting}
                  >
                    Voltar
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resetState} className="flex-1 bg-transparent" disabled={isImporting}>
                    Cancelar
                  </Button>
                )}

                <Button onClick={handleImport} className="flex-1 neon-glow" disabled={isImporting || isOcring}>
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : pdfStage === "preview" ? (
                    <Upload className="mr-2 h-4 w-4" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {pdfStage === "preview" ? "Importar" : "Analisar"}
                </Button>
              </div>
            </>
          )}

          {preview && (
            <>
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  {preview.length} registros encontrados para importar como{" "}
                  {importType === "despesas" ? "despesas" : "receitas"}
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-48 rounded-lg border border-primary/20">
                <div className="p-4 space-y-2">
                  {preview.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 rounded bg-background/30">
                      <div>
                        <p className="font-medium">{item.descricao || item.fonte || item.categoria}</p>
                        <p className="text-xs text-muted-foreground">{item.data}</p>
                      </div>
                      <p className={`font-medium ${importType === "despesas" ? "text-red-400" : "text-emerald-400"}`}>
                        R$ {item.valor?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button onClick={handleImport} className="flex-1 neon-glow" disabled={isImporting}>
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Importar
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              {result.success > 0 && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-emerald-400">
                    {result.success} registros importados com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {pdfSummary && (
                <div className="text-sm text-muted-foreground rounded-lg border border-primary/10 p-3 bg-background/30">
                  <p>Itens identificados no PDF: <strong>{pdfSummary.parsed}</strong></p>
                  <p>Despesas geradas: <strong>{pdfSummary.generated}</strong></p>
                  <p>Ignoradas por duplicidade: <strong>{pdfSummary.skippedAsDuplicate}</strong></p>
                </div>
              )}

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.errors.length} erros encontrados
                    <ScrollArea className="h-20 mt-2">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs">
                          {err}
                        </p>
                      ))}
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => setOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
