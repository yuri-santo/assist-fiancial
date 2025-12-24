"use client"

import { motion } from "framer-motion"
import { Target, Star, Trophy } from "lucide-react"

interface TargetAnimationProps {
  progress?: number // 0 to 100
  size?: "sm" | "md" | "lg"
}

export function TargetAnimation({ progress = 50, size = "md" }: TargetAnimationProps) {
  const sizeClasses = {
    sm: 80,
    md: 120,
    lg: 160,
  }

  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const isComplete = progress >= 100

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: sizeClasses[size],
          height: sizeClasses[size],
          background: isComplete
            ? "radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent)"
            : "radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      {/* Progress ring */}
      <svg width={sizeClasses[size]} height={sizeClasses[size]} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={sizeClasses[size] / 2}
          cy={sizeClasses[size] / 2}
          r={40}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        {/* Progress ring */}
        <motion.circle
          cx={sizeClasses[size] / 2}
          cy={sizeClasses[size] / 2}
          r={40}
          fill="none"
          stroke={isComplete ? "#10b981" : "#8b5cf6"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: [circumference, strokeDashoffset],
          }}
          transition={{
            duration: 2,
            ease: "easeOut",
          }}
          style={{
            filter: `drop-shadow(0 0 10px ${isComplete ? "#10b981" : "#8b5cf6"})`,
          }}
        />
      </svg>

      {/* Center icon */}
      <motion.div
        className="absolute"
        animate={{
          scale: isComplete ? [1, 1.2, 1] : [1, 1.05, 1],
          rotate: isComplete ? [0, 10, -10, 0] : 0,
        }}
        transition={{
          duration: isComplete ? 1 : 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {isComplete ? (
          <Trophy size={32} className="text-emerald-400" />
        ) : (
          <Target size={32} className="text-purple-400" />
        )}
      </motion.div>

      {/* Stars for complete */}
      {isComplete &&
        [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${20 + i * 20}%`,
              left: `${10 + i * 35}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
            }}
          >
            <Star size={16} className="text-amber-400 fill-amber-400" />
          </motion.div>
        ))}
    </div>
  )
}
