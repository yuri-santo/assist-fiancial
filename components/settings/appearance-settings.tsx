"use client"

import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon, Monitor, Palette, Type, Layout } from "lucide-react"
import { useState, useEffect } from "react"

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [primaryColor, setPrimaryColor] = useState("#14b8a6")
  const [compactMode, setCompactMode] = useState(false)
  const [animations, setAnimations] = useState(true)

  useEffect(() => {
    const savedColor = localStorage.getItem("primaryColor")
    const savedCompact = localStorage.getItem("compactMode")
    const savedAnimations = localStorage.getItem("animations")

    if (savedColor) {
      setPrimaryColor(savedColor)
      document.documentElement.style.setProperty("--primary", savedColor)
    }
    if (savedCompact) setCompactMode(savedCompact === "true")
    if (savedAnimations !== null) setAnimations(savedAnimations !== "false")
  }, [])

  const handleColorChange = (color: string) => {
    setPrimaryColor(color)
    document.documentElement.style.setProperty("--primary", color)
    localStorage.setItem("primaryColor", color)
  }

  const handleCompactChange = (value: boolean) => {
    setCompactMode(value)
    localStorage.setItem("compactMode", String(value))
    document.documentElement.classList.toggle("compact-mode", value)
  }

  const handleAnimationsChange = (value: boolean) => {
    setAnimations(value)
    localStorage.setItem("animations", String(value))
    document.documentElement.classList.toggle("reduce-motion", !value)
  }

  const colors = [
    { name: "Teal", color: "#14b8a6" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Purple", color: "#8b5cf6" },
    { name: "Pink", color: "#ec4899" },
    { name: "Orange", color: "#f97316" },
    { name: "Green", color: "#22c55e" },
    { name: "Red", color: "#ef4444" },
    { name: "Yellow", color: "#eab308" },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          Tema
        </h3>
        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
          <Label
            htmlFor="light"
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              theme === "light" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="light" id="light" className="sr-only" />
            <Sun className="h-6 w-6" />
            <span className="text-sm">Claro</span>
          </Label>
          <Label
            htmlFor="dark"
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="dark" id="dark" className="sr-only" />
            <Moon className="h-6 w-6" />
            <span className="text-sm">Escuro</span>
          </Label>
          <Label
            htmlFor="system"
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              theme === "system" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="system" id="system" className="sr-only" />
            <Monitor className="h-6 w-6" />
            <span className="text-sm">Sistema</span>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Cor Principal
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {colors.map((c) => (
            <button
              key={c.name}
              className={`h-10 w-full rounded-lg border-2 transition-all ${
                primaryColor === c.color
                  ? "border-white ring-2 ring-white/50 scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c.color }}
              title={c.name}
              onClick={() => handleColorChange(c.color)}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Selecione a cor principal do sistema</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" />
          Layout
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact">Modo Compacto</Label>
              <p className="text-xs text-muted-foreground">Reduz o espacamento entre elementos</p>
            </div>
            <Switch id="compact" checked={compactMode} onCheckedChange={handleCompactChange} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animations">Animacoes</Label>
              <p className="text-xs text-muted-foreground">Ativar animacoes e transicoes</p>
            </div>
            <Switch id="animations" checked={animations} onCheckedChange={handleAnimationsChange} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          Formato de Moeda
        </h3>
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-sm">Formato atual: R$ 1.234,56</p>
          <p className="text-xs text-muted-foreground mt-1">Padrao brasileiro (BRL)</p>
        </div>
      </div>
    </div>
  )
}
