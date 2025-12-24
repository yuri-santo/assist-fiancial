"use client"

import { Moon, Sun, Bell, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import type { Profile } from "@/lib/types"

interface HeaderProps {
  profile: Profile | null
}

export function Header({ profile }: HeaderProps) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    if (!isDarkMode) {
      document.documentElement.classList.add("dark")
    }
    setIsDark(true)
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 glass-strong px-4 lg:px-6">
      <div className="lg:ml-0 ml-14">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Ola, <span className="text-primary neon-text">{profile?.nome || "Usuario"}</span>!
          </h2>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Bem-vindo ao seu painel financeiro do futuro</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-neon-pink animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
