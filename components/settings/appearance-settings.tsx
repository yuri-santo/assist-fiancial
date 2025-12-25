"use client"

import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sun, Moon, Monitor } from "lucide-react"

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium">Tema</h3>
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
        <h3 className="font-medium">Cor Principal</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: "Teal", color: "#14b8a6" },
            { name: "Blue", color: "#3b82f6" },
            { name: "Purple", color: "#8b5cf6" },
            { name: "Pink", color: "#ec4899" },
            { name: "Orange", color: "#f97316" },
          ].map((c) => (
            <button
              key={c.name}
              className="h-10 w-full rounded-lg border-2 border-transparent hover:border-white/50 transition-colors"
              style={{ backgroundColor: c.color }}
              title={c.name}
              onClick={() => {
                document.documentElement.style.setProperty("--primary", c.color)
                localStorage.setItem("primaryColor", c.color)
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Selecione a cor principal do sistema</p>
      </div>
    </div>
  )
}
