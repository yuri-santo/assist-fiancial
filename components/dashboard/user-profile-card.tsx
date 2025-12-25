"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import type { Profile, SaudeFinanceira } from "@/lib/types"
import { getStatusColor, getStatusLabel, getStatusBgColor } from "@/lib/utils/financial-health"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface UserProfileCardProps {
  profile: Profile | null
  saude: SaudeFinanceira
}

export function UserProfileCard({ profile, saude }: UserProfileCardProps) {
  const initials = profile?.nome
    ? profile.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  const StatusIcon = saude.score >= 50 ? TrendingUp : saude.score >= 30 ? Minus : TrendingDown

  return (
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-primary/30">
          <AvatarImage src={undefined || "/placeholder.svg"} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{profile?.nome || "Usuario"}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
        </div>
      </div>

      <div className="mt-3 p-2 rounded-lg bg-background/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Saude Financeira</span>
          <div className={cn("flex items-center gap-1 text-xs font-medium", getStatusColor(saude.status))}>
            <StatusIcon className="h-3 w-3" />
            {getStatusLabel(saude.status)}
          </div>
        </div>
        <Progress
          value={saude.score}
          className={cn("h-2", `[&>div]:${getStatusBgColor(saude.status).replace("bg-", "bg-")}`)}
        />
        <p className="text-xs text-center mt-1 font-medium">{saude.score.toFixed(0)}%</p>
      </div>
    </div>
  )
}
