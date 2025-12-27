import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const BodySchema = z.object({
  itemId: z.string().min(3),
  providerName: z.string().optional(),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, providerName } = parsed.data

  // NOTE: para Open Finance via Pluggy, guardamos o itemId no campo access_token.
  // Isso evita mudar o schema no MVP.
  const { error } = await supabase
    .from("bank_connections")
    .upsert(
      {
        user_id: user.id,
        provider: "openfinance",
        status: "connected",
        access_token: itemId,
        refresh_token: null,
        expires_at: null,
        scope: providerName || "pluggy",
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,provider" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
