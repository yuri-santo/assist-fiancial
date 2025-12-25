"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Target,
  PiggyBank,
  ShieldCheck,
  BarChart3,
  Settings,
  Wallet,
  Menu,
  X,
  LogOut,
  Sparkles,
  TrendingUp,
  Landmark,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile, SaudeFinanceira } from "@/lib/types"
import { UserProfileCard } from "./user-profile-card"
import { calcularSaudeFinanceira } from "@/lib/utils/financial-health"

const navigation = [
  { name: "Carteira", href: "/dashboard", icon: Wallet },
  { name: "Despesas", href: "/dashboard/despesas", icon: ArrowDownCircle },
  { name: "Receitas", href: "/dashboard/receitas", icon: ArrowUpCircle },
  { name: "Cartoes", href: "/dashboard/cartoes", icon: CreditCard },
  { name: "Orcamento", href: "/dashboard/orcamento", icon: BarChart3 },
  { name: "Renda Variavel", href: "/dashboard/investimentos/renda-variavel", icon: TrendingUp },
  { name: "Renda Fixa", href: "/dashboard/investimentos/renda-fixa", icon: Landmark },
  { name: "Investimentos", href: "/dashboard/investimentos/carteira", icon: LineChart },
  { name: "Objetivos", href: "/dashboard/objetivos", icon: Target },
  { name: "Caixinhas", href: "/dashboard/caixinhas", icon: PiggyBank },
  { name: "Reserva", href: "/dashboard/reserva", icon: ShieldCheck },
  { name: "Relatorios", href: "/dashboard/relatorios", icon: BarChart3 },
  { name: "Configuracoes", href: "/dashboard/configuracoes", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saude, setSaude] = useState<SaudeFinanceira>({
    score: 50,
    status: "bom",
    fatores: [],
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profileData) setProfile(profileData)

      // Fetch financial data for health calculation
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const [despesasRes, receitasRes, reservaRes, objetivosRes, investimentosRes] = await Promise.all([
        supabase
          .from("despesas")
          .select("valor")
          .eq("user_id", user.id)
          .gte("data", startOfMonth)
          .lte("data", endOfMonth),
        supabase
          .from("receitas")
          .select("valor")
          .eq("user_id", user.id)
          .gte("data", startOfMonth)
          .lte("data", endOfMonth),
        supabase
          .from("objetivos")
          .select("valor_atual, valor_total")
          .eq("user_id", user.id)
          .eq("tipo", "emergencia")
          .single(),
        supabase.from("objetivos").select("valor_atual, valor_total").eq("user_id", user.id).neq("tipo", "emergencia"),
        supabase.from("renda_variavel").select("quantidade, preco_medio").eq("user_id", user.id),
      ])

      const despesas = despesasRes.data?.reduce((sum, d) => sum + d.valor, 0) || 0
      const receitas = receitasRes.data?.reduce((sum, r) => sum + r.valor, 0) || 0
      const reservaAtual = reservaRes.data?.valor_atual || 0
      const reservaMeta = reservaRes.data?.valor_total || 0
      const objetivos = objetivosRes.data || []
      const objetivosConcluidos = objetivos.filter((o) => o.valor_atual >= o.valor_total).length
      const investimentos = investimentosRes.data?.reduce((sum, i) => sum + i.quantidade * i.preco_medio, 0) || 0

      const healthData = {
        receitas,
        despesas,
        reservaAtual,
        reservaMeta,
        despesasMediaMensal: despesas,
        dividas: 0,
        investimentos,
        objetivosConcluidos,
        objetivosTotal: objetivos.length,
      }

      setSaude(calcularSaudeFinanceira(healthData))
    }

    fetchData()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="glass border-primary/30 hover:border-primary hover:neon-glow-subtle"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col glass-strong border-r border-sidebar-border transition-transform lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="relative">
            <Wallet className="h-7 w-7 text-primary" />
            <div className="absolute inset-0 blur-md bg-primary/50 rounded-full" />
          </div>
          <span className="text-xl font-bold text-primary neon-text">FinControl</span>
        </div>

        {/* User Profile Card */}
        <UserProfileCard profile={profile} saude={saude} />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]")} />
                {item.name}
                {isActive && <Sparkles className="ml-auto h-3 w-3 text-primary animate-pulse" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout button */}
        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
