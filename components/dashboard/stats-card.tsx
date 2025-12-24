import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "success" | "warning" | "destructive"
}

export function StatsCard({ title, value, description, icon: Icon, trend, variant = "default" }: StatsCardProps) {
  const variantStyles = {
    default: "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_0_15px_rgba(0,229,255,0.3)]",
    success:
      "bg-gradient-to-br from-neon-green/20 to-neon-green/5 text-neon-green shadow-[0_0_15px_rgba(34,197,94,0.3)]",
    warning: "bg-gradient-to-br from-warning/20 to-warning/5 text-warning shadow-[0_0_15px_rgba(234,179,8,0.3)]",
    destructive:
      "bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  }

  const glowColors = {
    default: "shadow-[0_0_20px_rgba(0,229,255,0.2)]",
    success: "shadow-[0_0_20px_rgba(34,197,94,0.2)]",
    warning: "shadow-[0_0_20px_rgba(234,179,8,0.2)]",
    destructive: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  }

  return (
    <Card
      className={cn(
        "glass card-3d border-border/30 hover:border-primary/50 transition-all duration-300",
        glowColors[variant],
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform hover:scale-110",
            variantStyles[variant],
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 text-sm mt-1">
            {trend && (
              <span
                className={cn(
                  "font-medium px-2 py-0.5 rounded-full text-xs",
                  trend.isPositive ? "bg-neon-green/20 text-neon-green" : "bg-destructive/20 text-destructive",
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description && <span className="text-muted-foreground">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
