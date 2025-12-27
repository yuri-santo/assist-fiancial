import { createClient } from "@/lib/supabase/server"
import { PageAnimation } from "@/components/animations/page-animation"
import type { BankConnection, BankTransaction } from "@/lib/types"
import { IntegracoesClient } from "@/components/integrations/integracoes-client"

export default async function IntegracoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, provider, status, expires_at, scope, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("imported", false)
    .order("occurred_at", { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <PageAnimation type="integracoes" />
      <IntegracoesClient
        userId={user.id}
        initialConnections={(connections || []) as BankConnection[]}
        initialTransactions={(transactions || []) as BankTransaction[]}
      />
    </div>
  )
}
