import { createClient } from "@/lib/supabase/server"
import type { Provento, RendaVariavel } from "@/lib/types"
import { ProventosClient } from "@/components/proventos/proventos-client"

export default async function ProventosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Carrega tickers (para facilitar cadastrar proventos por ativo já existente)
  const { data: rvData } = await supabase.from("renda_variavel").select("id,ticker,quantidade").eq("user_id", user.id)
  const rendaVariavel = (rvData || []) as Pick<RendaVariavel, "id" | "ticker" | "quantidade">[]

  let proventos: Provento[] = []
  let tableError: string | null = null

  try {
    const { data, error } = await supabase
      .from("proventos")
      .select("*")
      .eq("user_id", user.id)
      .order("data_pagamento", { ascending: false })

    if (error) {
      tableError = error.message
    } else {
      proventos = (data || []) as Provento[]
    }
  } catch (err) {
    tableError = err instanceof Error ? err.message : "Erro ao consultar proventos"
  }

  return <ProventosClient userId={user.id} proventos={proventos} rendaVariavel={rendaVariavel} tableError={tableError} />
}
