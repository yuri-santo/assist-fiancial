"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, Loader2, FileText } from "lucide-react"
import type { Despesa, Receita, Categoria } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDate, getMonthName } from "@/lib/utils/date"
import { motion } from "framer-motion"

interface ExportButtonProps {
  despesas: Despesa[]
  receitas: Receita[]
  categorias: Categoria[]
  mes: number
  ano: number
}

export function ExportButton({ despesas, receitas, categorias, mes, ano }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = () => {
    setIsExporting(true)

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add header
    csvContent += `RELATORIO FINANCEIRO - ${getMonthName(mes).toUpperCase()} ${ano}\n\n`

    // Summary
    const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0)
    const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
    const saldo = totalReceitas - totalDespesas

    csvContent += "RESUMO\n"
    csvContent += `Total Receitas;${formatCurrency(totalReceitas)}\n`
    csvContent += `Total Despesas;${formatCurrency(totalDespesas)}\n`
    csvContent += `Saldo;${formatCurrency(saldo)}\n\n`

    // Receitas
    csvContent += "RECEITAS\n"
    csvContent += "Data;Fonte;Descricao;Valor\n"
    receitas.forEach((r) => {
      csvContent += `${formatDate(r.data)};${r.fonte};${r.descricao || "-"};${formatCurrency(r.valor)}\n`
    })
    csvContent += "\n"

    // Despesas
    csvContent += "DESPESAS\n"
    csvContent += "Data;Categoria;Descricao;Forma Pagamento;Valor\n"
    despesas.forEach((d) => {
      const categoria = categorias.find((c) => c.id === d.categoria_id)
      const formaPagamento =
        {
          cartao: "Cartao",
          debito: "Debito",
          pix: "PIX",
          dinheiro: "Dinheiro",
        }[d.forma_pagamento || ""] || "-"
      csvContent += `${formatDate(d.data)};${categoria?.nome || "-"};${d.descricao || "-"};${formaPagamento};${formatCurrency(d.valor)}\n`
    })
    csvContent += "\n"

    // Despesas por categoria
    csvContent += "DESPESAS POR CATEGORIA\n"
    csvContent += "Categoria;Total;Porcentagem\n"

    const categoryTotals = despesas.reduce(
      (acc, d) => {
        const catId = d.categoria_id || "outros"
        acc[catId] = (acc[catId] || 0) + d.valor
        return acc
      },
      {} as Record<string, number>,
    )

    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([catId, total]) => {
        const categoria = categorias.find((c) => c.id === catId)
        const porcentagem = totalDespesas > 0 ? ((total / totalDespesas) * 100).toFixed(1) : "0"
        csvContent += `${categoria?.nome || "Outros"};${formatCurrency(total)};${porcentagem}%\n`
      })

    // Create and download file
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `relatorio_${mes}_${ano}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsExporting(false)
  }

  const exportToExcel = async () => {
    setIsExporting(true)

    try {
      const XLSX = await import("xlsx")

      // Create workbook
      const wb = XLSX.utils.book_new()

      // Summary sheet
      const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0)
      const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
      const saldo = totalReceitas - totalDespesas
      const economia = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0

      const summaryData = [
        [`RELATORIO FINANCEIRO - ${getMonthName(mes).toUpperCase()} ${ano}`],
        [],
        ["RESUMO GERAL"],
        ["Total de Receitas", totalReceitas],
        ["Total de Despesas", totalDespesas],
        ["Saldo do Periodo", saldo],
        ["Taxa de Economia", `${economia.toFixed(1)}%`],
        [],
        ["Quantidade de Receitas", receitas.length],
        ["Quantidade de Despesas", despesas.length],
      ]
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo")

      // Receitas sheet
      const receitasData = [
        ["RECEITAS"],
        ["Data", "Fonte", "Descricao", "Recorrente", "Valor"],
        ...receitas.map((r) => [
          formatDate(r.data),
          r.fonte,
          r.descricao || "-",
          r.recorrente ? "Sim" : "Nao",
          r.valor,
        ]),
        [],
        ["TOTAL", "", "", "", totalReceitas],
      ]
      const receitasWs = XLSX.utils.aoa_to_sheet(receitasData)
      XLSX.utils.book_append_sheet(wb, receitasWs, "Receitas")

      // Despesas sheet
      const despesasData = [
        ["DESPESAS"],
        ["Data", "Categoria", "Descricao", "Forma Pagamento", "Parcelado", "Valor"],
        ...despesas.map((d) => {
          const categoria = categorias.find((c) => c.id === d.categoria_id)
          const formaPagamento =
            {
              cartao: "Cartao de Credito",
              debito: "Cartao de Debito",
              pix: "PIX",
              dinheiro: "Dinheiro",
            }[d.forma_pagamento || ""] || "-"
          return [
            formatDate(d.data),
            categoria?.nome || "-",
            d.descricao || "-",
            formaPagamento,
            d.parcelado ? `${d.parcela_atual}/${d.total_parcelas}` : "Nao",
            d.valor,
          ]
        }),
        [],
        ["TOTAL", "", "", "", "", totalDespesas],
      ]
      const despesasWs = XLSX.utils.aoa_to_sheet(despesasData)
      XLSX.utils.book_append_sheet(wb, despesasWs, "Despesas")

      // Categorias sheet
      const categoryTotals = despesas.reduce(
        (acc, d) => {
          const catId = d.categoria_id || "outros"
          acc[catId] = (acc[catId] || 0) + d.valor
          return acc
        },
        {} as Record<string, number>,
      )

      const categoriasData = [
        ["DESPESAS POR CATEGORIA"],
        ["Categoria", "Total", "Porcentagem"],
        ...Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([catId, total]) => {
            const categoria = categorias.find((c) => c.id === catId)
            const porcentagem = totalDespesas > 0 ? ((total / totalDespesas) * 100).toFixed(1) : "0"
            return [categoria?.nome || "Outros", total, `${porcentagem}%`]
          }),
      ]
      const categoriasWs = XLSX.utils.aoa_to_sheet(categoriasData)
      XLSX.utils.book_append_sheet(wb, categoriasWs, "Por Categoria")

      // Download
      XLSX.writeFile(wb, `relatorio_financeiro_${mes}_${ano}.xlsx`)
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
    }

    setIsExporting(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            disabled={isExporting}
            className="border-primary/30 hover:border-primary neon-glow-subtle bg-transparent"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-primary/20">
        <DropdownMenuItem onClick={exportToCSV} className="hover:bg-primary/10 cursor-pointer">
          <FileText className="mr-2 h-4 w-4 text-cyan-400" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="hover:bg-primary/10 cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" />
          Exportar Excel (XLSX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
