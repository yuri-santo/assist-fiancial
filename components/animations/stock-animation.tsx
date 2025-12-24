"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Zap } from "lucide-react"

interface StockAnimationProps {
  trend?: "up" | "down"
  size?: "sm" | "md" | "lg"
}

export function StockAnimation({ trend = "up", size = "md" }: StockAnimationProps) {
  const isUp = trend === "up"
  const color = isUp ? "#10b981" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center p-8 h-40">
      {/* Background glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${color}15, transparent)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      {/* Candlestick chart simulation */}
      <div className="flex items-end gap-2 h-24">
        {[...Array(7)].map((_, i) => {
          const isGreen = Math.random() > 0.4 === isUp
          const height = 20 + Math.random() * 60
          const wickTop = Math.random() * 15
          const wickBottom = Math.random() * 15

          return (
            <motion.div
              key={i}
              className="relative flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Top wick */}
              <motion.div
                className="w-0.5"
                style={{
                  height: wickTop,
                  backgroundColor: isGreen ? "#10b981" : "#ef4444",
                }}
                animate={{ height: [0, wickTop] }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
              {/* Body */}
              <motion.div
                className="w-3 rounded-sm"
                style={{
                  backgroundColor: isGreen ? "#10b981" : "#ef4444",
                  boxShadow: `0 0 10px ${isGreen ? "#10b98150" : "#ef444450"}`,
                }}
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                }}
              />
              {/* Bottom wick */}
              <motion.div
                className="w-0.5"
                style={{
                  height: wickBottom,
                  backgroundColor: isGreen ? "#10b981" : "#ef4444",
                }}
                animate={{ height: [0, wickBottom] }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Trend indicator */}
      <motion.div
        className="absolute top-4 right-4"
        animate={{
          y: isUp ? [0, -5, 0] : [0, 5, 0],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1,
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {isUp ? (
          <TrendingUp size={32} className="text-emerald-400" />
        ) : (
          <TrendingDown size={32} className="text-red-400" />
        )}
      </motion.div>

      {/* Activity pulse */}
      <motion.div
        className="absolute bottom-4 left-4"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.5,
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <Zap size={20} style={{ color }} />
      </motion.div>
    </div>
  )
}
