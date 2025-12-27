import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { pluggyCreateConnectToken, pluggyGetApiKey } from "@/lib/integrations/pluggy"

export async function POST() {
  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const apiKey = await pluggyGetApiKey()
    const token = await pluggyCreateConnectToken(apiKey, user.id)

    return NextResponse.json({ ok: true, ...token })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Falha ao gerar token de conexão (Open Finance).",
        hint: "Confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no ambiente (Render/Local).",
      },
      { status: 500 }
    )
  }
}
