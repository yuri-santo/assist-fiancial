"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Lock, Mail, Shield, Smartphone, Key } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SecuritySettingsProps {
  userEmail: string
}

export function SecuritySettings({ userEmail }: SecuritySettingsProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [sessionTimeout, setSessionTimeout] = useState(true)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "As senhas nao coincidem" })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres" })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      setMessage({ type: "success", text: "Senha alterada com sucesso!" })
      setNewPassword("")
      setConfirmPassword("")
    }

    setIsLoading(false)
  }

  const handleResetPassword = async () => {
    setIsLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail)

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      setMessage({ type: "success", text: "Email de recuperacao enviado!" })
    }

    setIsLoading(false)
  }

  const handleLogoutAllDevices = async () => {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: "global" })
    window.location.href = "/auth/login"
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Email
        </h3>
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Email atual</p>
          <p className="font-medium">{userEmail}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Alterar Senha
        </h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-primary/20"
            />
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleChangePassword}
            disabled={isLoading || !newPassword || !confirmPassword}
            className="flex-1 neon-glow"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Alterar Senha
          </Button>
          <Button variant="outline" onClick={handleResetPassword} disabled={isLoading}>
            Enviar email de reset
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Configuracoes de Seguranca
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sessionTimeout">Timeout de Sessao</Label>
              <p className="text-xs text-muted-foreground">Desconectar apos 30 minutos de inatividade</p>
            </div>
            <Switch id="sessionTimeout" checked={sessionTimeout} onCheckedChange={setSessionTimeout} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Sessoes Ativas
        </h3>
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-sm">Dispositivo atual</p>
          <p className="text-xs text-muted-foreground mt-1">Navegador web</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full text-amber-500 border-amber-500/30 hover:bg-amber-500/10 bg-transparent"
            >
              <Key className="mr-2 h-4 w-4" />
              Desconectar de todos os dispositivos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-card border-primary/20">
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar de todos os dispositivos?</AlertDialogTitle>
              <AlertDialogDescription>
                Voce sera desconectado de todos os dispositivos, incluindo este. Precisara fazer login novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogoutAllDevices} className="bg-amber-500 hover:bg-amber-600">
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2 text-destructive">
          <Shield className="h-4 w-4" />
          Zona de Perigo
        </h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
            >
              Excluir minha conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-card border-primary/20">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acao nao pode ser desfeita. Todos os seus dados serao excluidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Excluir conta</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
