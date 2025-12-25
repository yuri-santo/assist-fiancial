"use client"

import { useRouter, usePathname } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMonthName } from "@/lib/utils/date"
import { Calendar, CalendarDays } from "lucide-react"

interface PeriodSelectorProps {
  mes: number
  ano: number
  viewMode?: "mensal" | "anual"
}

export function PeriodSelector({ mes, ano, viewMode = "mensal" }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const handleMonthChange = (value: string) => {
    router.push(`${pathname}?mes=${value}&ano=${ano}&view=${viewMode}`)
  }

  const handleYearChange = (value: string) => {
    router.push(`${pathname}?mes=${mes}&ano=${value}&view=${viewMode}`)
  }

  const handleViewModeChange = (value: string) => {
    router.push(`${pathname}?mes=${mes}&ano=${ano}&view=${value}`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-auto">
        <TabsList className="bg-muted/50 border border-primary/10">
          <TabsTrigger
            value="mensal"
            className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            Mensal
          </TabsTrigger>
          <TabsTrigger
            value="anual"
            className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Anual
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        {viewMode === "mensal" && (
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
        )}
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
    </div>
  )
}
