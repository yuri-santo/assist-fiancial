import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Profile, Categoria } from "@/lib/types"
import { ProfileForm } from "@/components/settings/profile-form"
import { CategoriesManager } from "@/components/settings/categories-manager"
import { User, Tag, Bell, Shield, Palette } from "lucide-react"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { SecuritySettings } from "@/components/settings/security-settings"

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profileRes, categoriasRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("categorias").select("*").eq("user_id", user.id).order("nome"),
  ])

  const profile = profileRes.data as Profile | null
  const categorias = (categoriasRes.data || []) as Categoria[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold neon-text">Configuracoes</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferencias</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="glass-card border-primary/20 grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Aparencia</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguranca</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Atualize suas informacoes pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} userEmail={user.email || ""} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
              <CardDescription>Gerencie suas categorias de despesas e receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesManager categorias={categorias} userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Notificacoes e Alertas</CardTitle>
              <CardDescription>Configure quando deseja receber alertas</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Aparencia</CardTitle>
              <CardDescription>Personalize a aparencia do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <AppearanceSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Seguranca</CardTitle>
              <CardDescription>Gerencie a seguranca da sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettings userEmail={user.email || ""} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
