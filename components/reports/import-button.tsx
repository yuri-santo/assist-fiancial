"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportButtonProps {
  userId: string
}

interface ImportResult {
  success: number
  errors: string[]
}

export function ImportButton({ userId }: ImportButtonProps) {
  const [open, setOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [importType, setImportType] = useState<"despesas" | "receitas" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const handleImport = async () => {
    if (!preview || !importType) return

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
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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
          <DialogDescription>Importe despesas ou receitas de um arquivo CSV ou Excel</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!preview && !result && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
