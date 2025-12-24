"use client"

import { motion } from "framer-motion"
import { Wallet, DollarSign, ArrowDownLeft, ArrowUpRight } from "lucide-react"

interface WalletAnimationProps {
  type: "income" | "expense" | "neutral"
  size?: "sm" | "md" | "lg"
}

export function WalletAnimation({ type, size = "md" }: WalletAnimationProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48,
  }

  const colors = {
    income: {
      primary: "#10b981",
      secondary: "#34d399",
      glow: "0 0 20px rgba(16, 185, 129, 0.5)",
    },
    expense: {
      primary: "#ef4444",
      secondary: "#f87171",
      glow: "0 0 20px rgba(239, 68, 68, 0.5)",
    },
    neutral: {
      primary: "#06b6d4",
      secondary: "#22d3ee",
      glow: "0 0 20px rgba(6, 182, 212, 0.5)",
    },
  }

  const color = colors[type]

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-30"
        style={{ backgroundColor: color.primary }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Main wallet */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <motion.div
          style={{ boxShadow: color.glow }}
          className="p-4 rounded-2xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10"
        >
          <Wallet size={iconSizes[size]} style={{ color: color.primary }} />
        </motion.div>
      </motion.div>

      {/* Floating money icons */}
      {type === "income" && (
        <>
          <motion.div
            className="absolute"
            initial={{ opacity: 0, y: 20, x: -10 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [20, 0, -10, -20],
              x: [-10, -5, 0, 5],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0,
            }}
          >
            <DollarSign size={16} className="text-emerald-400" />
          </motion.div>
          <motion.div
            className="absolute right-0"
            initial={{ opacity: 0, y: 20, x: 10 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [20, 0, -10, -20],
              x: [10, 5, 0, -5],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.5,
            }}
          >
            <ArrowDownLeft size={16} className="text-emerald-400" />
          </motion.div>
        </>
      )}

      {type === "expense" && (
        <>
          <motion.div
            className="absolute top-0"
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -10, -20, -30],
              x: [-5, 0, 5, 10],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0,
            }}
          >
            <DollarSign size={16} className="text-red-400" />
          </motion.div>
          <motion.div
            className="absolute top-0 right-0"
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -10, -20, -30],
              x: [5, 0, -5, -10],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.5,
            }}
          >
            <ArrowUpRight size={16} className="text-red-400" />
          </motion.div>
        </>
      )}
    </div>
  )
}
