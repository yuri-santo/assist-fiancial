import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForToken } from "@/lib/integrations/mercadopago"

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  if (!user) return NextResponse.redirect(new URL("/auth/login", baseUrl))

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const expectedState = cookies().get("mp_oauth_state")?.value
  cookies().delete("mp_oauth_state")

  if (!code) return NextResponse.redirect(new URL("/dashboard/integracoes?error=missing_code", baseUrl))
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/dashboard/integracoes?error=invalid_state", baseUrl))
  }

  try {
    const token = await exchangeCodeForToken(code)
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null

    const { error } = await supabase.from("bank_connections").upsert(
      {
        user_id: user.id,
        provider: "mercadopago",
        status: "connected",
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        expires_at: expiresAt,
        scope: token.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )

    if (error) {
      console.error("[MP OAuth] upsert connection failed", error)
      return NextResponse.redirect(new URL("/dashboard/integracoes?error=db", baseUrl))
    }

    return NextResponse.redirect(new URL("/dashboard/integracoes?connected=mercadopago", baseUrl))
  } catch (e) {
    console.error("[MP OAuth] callback error", e)
    return NextResponse.redirect(new URL("/dashboard/integracoes?error=oauth", baseUrl))
  }
}
