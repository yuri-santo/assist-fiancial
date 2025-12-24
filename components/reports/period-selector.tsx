"use client"

import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getMonthName } from "@/lib/utils/date"
import { Calendar } from "lucide-react"

interface PeriodSelectorProps {
  mes: number
  ano: number
}

export function PeriodSelector({ mes, ano }: PeriodSelectorProps) {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const handleMonthChange = (value: string) => {
    router.push(`/dashboard/relatorios?mes=${value}&ano=${ano}`)
  }

  const handleYearChange = (value: string) => {
    router.push(`/dashboard/relatorios?mes=${mes}&ano=${value}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={mes.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-32 border-primary/20 bg-background/50 hover:border-primary/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-card border-primary/20">
          {months.map((m) => (
            <SelectItem key={m} value={m.toString()} className="hover:bg-primary/10">
              {getMonthName(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={ano.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-24 border-primary/20 bg-background/50 hover:border-primary/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-card border-primary/20">
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()} className="hover:bg-primary/10">
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
