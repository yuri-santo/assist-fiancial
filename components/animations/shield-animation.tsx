"use client"

import { motion } from "framer-motion"
import { Shield, ShieldCheck, Lock } from "lucide-react"

interface ShieldAnimationProps {
  status?: "safe" | "warning" | "critical"
  size?: "sm" | "md" | "lg"
}

export function ShieldAnimation({ status = "safe", size = "md" }: ShieldAnimationProps) {
  const colors = {
    safe: { primary: "#10b981", glow: "rgba(16, 185, 129, 0.4)" },
    warning: { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" },
    critical: { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
  }

  const color = colors[status]
  const iconSizes = { sm: 32, md: 48, lg: 64 }

  return (
    <div className="relative flex items-center justify-center p-8">
      {/* Pulsing glow */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.glow}, transparent)`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Shield */}
      <motion.div
        className="relative z-10 p-6 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${color.primary}20, ${color.primary}10)`,
          boxShadow: `0 0 30px ${color.glow}`,
        }}
        animate={{
          y: [0, -5, 0],
          scale: status === "critical" ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: status === "critical" ? 0.5 : 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        {status === "safe" ? (
          <ShieldCheck size={iconSizes[size]} style={{ color: color.primary }} />
        ) : (
          <Shield size={iconSizes[size]} style={{ color: color.primary }} />
        )}
      </motion.div>

      {/* Lock icon for safe status */}
      {status === "safe" && (
        <motion.div
          className="absolute bottom-4 right-4"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <Lock size={16} className="text-emerald-400" />
        </motion.div>
      )}

      {/* Warning pulses */}
      {status === "critical" &&
        [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2"
            style={{
              borderColor: color.primary,
              width: 60 + i * 30,
              height: 60 + i * 30,
            }}
            animate={{
              scale: [1, 1.5],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
            }}
          />
        ))}
    </div>
  )
}
