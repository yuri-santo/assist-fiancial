"use client"

import { Moon, Sun, Sparkles, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Profile } from "@/lib/types"
import { useTheme } from "@/components/providers/theme-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"

interface HeaderProps {
  profile: Profile | null
  userId?: string
}

export function Header({ profile, userId }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 glass-strong px-4 lg:px-6">
      <div className="lg:ml-0 ml-14">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Ola, <span className="text-primary neon-text">{profile?.nome || "Usuario"}</span>!
          </h2>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Bem-vindo ao seu painel financeiro</p>
      </div>

      <div className="flex items-center gap-2">
        {userId && <NotificationCenter userId={userId} />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
              {theme === "dark" && <Moon className="h-5 w-5" />}
              {theme === "light" && <Sun className="h-5 w-5" />}
              {theme === "system" && <Monitor className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
              <Sun className="mr-2 h-4 w-4" />
              Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
              <Moon className="mr-2 h-4 w-4" />
              Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
              <Monitor className="mr-2 h-4 w-4" />
              Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
