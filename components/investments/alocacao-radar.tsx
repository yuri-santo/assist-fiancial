"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"

interface AlocacaoRadarProps {
  rendaVariavel: number
  rendaFixa: number
  caixinhas: number
  objetivos: number
}

export function AlocacaoRadar({ rendaVariavel, rendaFixa, caixinhas, objetivos }: AlocacaoRadarProps) {
  const total = rendaVariavel + rendaFixa + caixinhas + objetivos

  const data = [
    { subject: "Renda Variavel", value: total > 0 ? (rendaVariavel / total) * 100 : 0, fullMark: 100 },
    { subject: "Renda Fixa", value: total > 0 ? (rendaFixa / total) * 100 : 0, fullMark: 100 },
    { subject: "Caixinhas", value: total > 0 ? (caixinhas / total) * 100 : 0, fullMark: 100 },
    { subject: "Objetivos", value: total > 0 ? (objetivos / total) * 100 : 0, fullMark: 100 },
  ]

  if (total === 0) {
    return (
      <Card className="card-3d glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Radar de Alocacao</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -10 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="card-3d glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle">Radar de Alocacao</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="hsl(var(--primary) / 0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Radar
                name="Alocacao"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
                className="drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                animationDuration={1500}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
