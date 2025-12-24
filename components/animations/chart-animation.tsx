"use client"

import { motion } from "framer-motion"
import { TrendingUp, BarChart3 } from "lucide-react"

interface ChartAnimationProps {
  type?: "line" | "bar"
  trend?: "up" | "down" | "neutral"
}

export function ChartAnimation({ type = "line", trend = "up" }: ChartAnimationProps) {
  const colors = {
    up: "#10b981",
    down: "#ef4444",
    neutral: "#06b6d4",
  }

  const barHeights = [40, 60, 45, 80, 55, 90, 70]

  return (
    <div className="relative flex items-end justify-center gap-2 p-8 h-40">
      {/* Glow */}
      <motion.div
        className="absolute bottom-0 w-full h-20"
        style={{
          background: `linear-gradient(to top, ${colors[trend]}20, transparent)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      {type === "bar" ? (
        // Bar chart animation
        barHeights.map((height, i) => (
          <motion.div
            key={i}
            className="w-4 rounded-t-md"
            style={{
              background: `linear-gradient(to top, ${colors[trend]}, ${colors[trend]}80)`,
              boxShadow: `0 0 10px ${colors[trend]}50`,
            }}
            initial={{ height: 0 }}
            animate={{
              height: [`${height * 0.8}%`, `${height}%`, `${height * 0.9}%`],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))
      ) : (
        // Line chart animation
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <motion.path
            d="M 0 80 Q 30 60, 50 50 T 100 30 T 150 20 T 200 10"
            fill="none"
            stroke={colors[trend]}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1],
              opacity: [0, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 1,
            }}
          />
          <motion.circle
            r="6"
            fill={colors[trend]}
            style={{ filter: `drop-shadow(0 0 5px ${colors[trend]})` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              cx: [0, 50, 100, 150, 200],
              cy: [80, 50, 30, 20, 10],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 1,
            }}
          />
        </svg>
      )}

      {/* Trend icon */}
      <motion.div
        className="absolute top-2 right-2"
        animate={{
          y: [0, -5, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {type === "bar" ? (
          <BarChart3 size={24} style={{ color: colors[trend] }} />
        ) : (
          <TrendingUp size={24} style={{ color: colors[trend] }} />
        )}
      </motion.div>
    </div>
  )
}
