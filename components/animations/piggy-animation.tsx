"use client"

import { motion } from "framer-motion"
import { PiggyBank, Coins } from "lucide-react"

interface PiggyAnimationProps {
  size?: "sm" | "md" | "lg"
  isDepositing?: boolean
}

export function PiggyAnimation({ size = "md", isDepositing = true }: PiggyAnimationProps) {
  const sizeClasses = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  return (
    <div className="relative flex items-center justify-center p-8">
      {/* Glow */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(249, 115, 22, 0.3), transparent)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      {/* Piggy bank */}
      <motion.div
        className="relative z-10 p-6 rounded-full"
        style={{
          background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.1))",
          boxShadow: "0 0 30px rgba(249, 115, 22, 0.3)",
        }}
        animate={{
          y: [0, -5, 0],
          rotate: isDepositing ? [0, -5, 5, 0] : [0, 0, 0],
        }}
        transition={{
          duration: isDepositing ? 1 : 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <PiggyBank size={sizeClasses[size]} className="text-orange-400" />
      </motion.div>

      {/* Falling coins */}
      {isDepositing &&
        [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0, y: -40, x: -10 + i * 10 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [-40, -20, 0, 10],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.4,
            }}
          >
            <Coins size={20} className="text-amber-400" />
          </motion.div>
        ))}
    </div>
  )
}
