"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { WalletAnimation } from "./wallet-animation"
import { CardAnimation } from "./card-animation"
import { PiggyAnimation } from "./piggy-animation"
import { ChartAnimation } from "./chart-animation"
import { TargetAnimation } from "./target-animation"
import { ShieldAnimation } from "./shield-animation"
import { StockAnimation } from "./stock-animation"

type PageType =
  | "dashboard"
  | "receitas"
  | "despesas"
  | "cartoes"
  | "caixinhas"
  | "objetivos"
  | "reserva"
  | "investimentos"
  | "relatorios"
  | "orcamento"
  | "integracoes"
  | "configuracoes"

interface PageAnimationProps {
  type: PageType
  className?: string
}

const pageConfigs: Record<PageType, { component: React.ReactNode; title: string }> = {
  dashboard: {
    component: <WalletAnimation type="neutral" size="lg" />,
    title: "Sua carteira em tempo real",
  },
  receitas: {
    component: <WalletAnimation type="income" size="lg" />,
    title: "Dinheiro entrando na carteira",
  },
  despesas: {
    component: <WalletAnimation type="expense" size="lg" />,
    title: "Controlando suas saidas",
  },
  cartoes: {
    component: <CardAnimation size="lg" />,
    title: "Seus cartoes de credito",
  },
  caixinhas: {
    component: <PiggyAnimation size="lg" isDepositing />,
    title: "Guardando para o futuro",
  },
  objetivos: {
    component: <TargetAnimation progress={65} size="lg" />,
    title: "Alcancando suas metas",
  },
  reserva: {
    component: <ShieldAnimation status="safe" size="lg" />,
    title: "Sua seguranca financeira",
  },
  investimentos: {
    component: <StockAnimation trend="up" size="lg" />,
    title: "Fazendo seu dinheiro trabalhar",
  },
  relatorios: {
    component: <ChartAnimation type="bar" trend="up" />,
    title: "Analise completa",
  },
  orcamento: {
    component: <ChartAnimation type="line" trend="neutral" />,
    title: "Planejando seus gastos",
  },

  // Páginas de configuração / integrações
  integracoes: {
    component: <WalletAnimation type="neutral" size="lg" />,
    title: "Conectando suas contas",
  },
  configuracoes: {
    component: <ShieldAnimation status="safe" size="lg" />,
    title: "Ajustando preferências",
  },
}

export function PageAnimation({ type, className = "" }: PageAnimationProps) {
  // Em runtime, protege contra `type` inválido (evita crash do dashboard)
  const config = pageConfigs[type] ?? pageConfigs.dashboard

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className={`flex items-center justify-center mb-6 ${className}`}
      >
        <div className="relative">
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-30"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              filter: "blur(40px)",
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />

          {/* Animation container */}
          <div className="relative z-10 p-4 rounded-2xl glass-card">{config.component}</div>

          {/* Floating particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/50"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
