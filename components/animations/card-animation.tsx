"use client"

import { motion } from "framer-motion"
import { CreditCard, Sparkles } from "lucide-react"

interface CardAnimationProps {
  size?: "sm" | "md" | "lg"
}

export function CardAnimation({ size = "md" }: CardAnimationProps) {
  const sizeClasses = {
    sm: "w-20 h-12",
    md: "w-32 h-20",
    lg: "w-48 h-28",
  }

  return (
    <div className="relative flex items-center justify-center p-8">
      {/* Glow effect */}
      <motion.div
        className="absolute w-40 h-24 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))",
          filter: "blur(20px)",
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Card */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden`}
        style={{
          background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
          boxShadow: "0 10px 40px rgba(139, 92, 246, 0.4)",
        }}
        animate={{
          rotateY: [0, 10, 0, -10, 0],
          rotateX: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        whileHover={{
          scale: 1.1,
          rotateY: 15,
        }}
      >
        {/* Card content */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <motion.div
              className="w-8 h-6 rounded bg-amber-300/80"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <CreditCard size={16} className="text-white/60" />
          </div>
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-0.5">
                  {[1, 2, 3, 4].map((j) => (
                    <motion.div
                      key={j}
                      className="w-1 h-1 rounded-full bg-white/60"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: (i * 4 + j) * 0.1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.3) 50%, transparent 55%)",
          }}
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 2,
          }}
        />
      </motion.div>

      {/* Sparkles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${20 + i * 20}%`,
            left: `${10 + i * 30}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.5,
          }}
        >
          <Sparkles size={12} className="text-amber-300" />
        </motion.div>
      ))}
    </div>
  )
}
