"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Treemap, ResponsiveContainer, Tooltip } from "recharts"
import { LayoutGrid } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

interface AllocationData {
  name: string
  size: number
  color: string
  children?: AllocationData[]
}

interface AllocationTreemapProps {
  data: AllocationData[]
  title: string
}

const CustomContent = (props: any) => {
  const { x, y, width, height, name, size, color } = props

  if (width < 40 || height < 30) return null

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#1e293b"
        strokeWidth={2}
        rx={4}
        className="transition-opacity hover:opacity-80"
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 100 ? 12 : 10}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 100 ? 11 : 9}
            opacity={0.8}
          >
            {formatCurrency(size)}
          </text>
        </>
      )}
    </g>
  )
}

export function AllocationTreemap({ data, title }: AllocationTreemapProps) {
  const total = data.reduce((sum, d) => sum + d.size, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponivel</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-lg neon-text-subtle flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={data}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#1e293b"
              content={<CustomContent />}
              animationDuration={500}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    const percent = ((item.size / total) * 100).toFixed(1)
                    return (
                      <div className="glass-card rounded-lg border border-primary/20 p-3 shadow-xl">
                        <p className="font-bold" style={{ color: item.color }}>
                          {item.name}
                        </p>
                        <p className="text-lg font-bold">{formatCurrency(item.size)}</p>
                        <p className="text-sm text-muted-foreground">{percent}% do total</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </Treemap>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-xs">{item.name}</span>
                <span className="text-xs text-muted-foreground">({((item.size / total) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
