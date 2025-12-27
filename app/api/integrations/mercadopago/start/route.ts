import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createState, getAppUrl, getMercadoPagoOAuthStartUrl } from "@/lib/integrations/mercadopago"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const baseUrl = getAppUrl()
  if (!user) return NextResponse.redirect(new URL("/auth/login", baseUrl))

  // valida env antes (evita 500)
  if (!process.env.MP_CLIENT_ID || !process.env.NEXT_PUBLIC_APP_URL) {
    console.error("[MP OAuth] missing env", {
      MP_CLIENT_ID: Boolean(process.env.MP_CLIENT_ID),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    })
    return NextResponse.redirect(new URL("/dashboard/integracoes?error=mp_env", baseUrl))
  }

  const state = createState()
  const cookieStore = await cookies()

  cookieStore.set("mp_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  })

  try {
    const url = getMercadoPagoOAuthStartUrl(state)
    return NextResponse.redirect(url)
  } catch (e: any) {
    console.error("[MP OAuth] start error", e)
    return NextResponse.redirect(new URL("/dashboard/integracoes?error=mp_start", baseUrl))
  }
}
