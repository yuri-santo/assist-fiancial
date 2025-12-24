"use client"

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatMonthYear } from "@/lib/utils/date"
import { motion } from "framer-motion"

interface MonthSelectorProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onCurrentMonth: () => void
}

export function MonthSelector({ currentDate, onPrevMonth, onNextMonth, onCurrentMonth }: MonthSelectorProps) {
  const isCurrentMonth =
    currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 glass-card rounded-xl px-3 py-2"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevMonth}
        className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <motion.span
        key={currentDate.toISOString()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-w-[140px] text-center font-medium capitalize text-primary"
      >
        {formatMonthYear(currentDate)}
      </motion.span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNextMonth}
        className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCurrentMonth}
          className="ml-2 h-8 text-xs border-primary/50 hover:bg-primary/20 bg-transparent"
        >
          <Calendar className="mr-1 h-3 w-3" />
          Hoje
        </Button>
      )}
    </motion.div>
  )
}
