import crypto from "crypto"

export type MercadoPagoTokenResponse = {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  user_id?: number
  live_mode?: boolean
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

export function getMercadoPagoOAuthRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/mercadopago/callback`
}

export function getMercadoPagoOAuthStartUrl(state: string): string {
  const clientId = process.env.MP_CLIENT_ID
  if (!clientId) throw new Error("MP_CLIENT_ID is not set")

  const redirectUri = getMercadoPagoOAuthRedirectUri()

  const url = new URL("https://auth.mercadopago.com.br/authorization")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("platform_id", "mp")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

export function createState(): string {
  return crypto.randomUUID()
}

export async function exchangeCodeForToken(code: string): Promise<MercadoPagoTokenResponse> {
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("MP_CLIENT_ID/MP_CLIENT_SECRET not set")

  const redirectUri = getMercadoPagoOAuthRedirectUri()

  const body = new URLSearchParams()
  body.set("grant_type", "authorization_code")
  body.set("client_id", clientId)
  body.set("client_secret", clientSecret)
  body.set("code", code)
  body.set("redirect_uri", redirectUri)

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Mercado Pago token exchange failed: ${res.status} ${text}`)
  }

  return (await res.json()) as MercadoPagoTokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<MercadoPagoTokenResponse> {
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("MP_CLIENT_ID/MP_CLIENT_SECRET not set")

  const body = new URLSearchParams()
  body.set("grant_type", "refresh_token")
  body.set("client_id", clientId)
  body.set("client_secret", clientSecret)
  body.set("refresh_token", refreshToken)

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Mercado Pago refresh token failed: ${res.status} ${text}`)
  }

  return (await res.json()) as MercadoPagoTokenResponse
}

export type MercadoPagoPayment = {
  id: number
  status?: string
  status_detail?: string
  date_created?: string
  date_approved?: string
  date_last_updated?: string
  transaction_amount?: number
  currency_id?: string
  description?: string
  statement_descriptor?: string
  payment_method_id?: string
  payment_type_id?: string
  operation_type?: string
  payer?: {
    email?: string
  }
}

export async function searchPayments(accessToken: string, opts?: { beginDate?: string; endDate?: string }) {
  const url = new URL("https://api.mercadopago.com/v1/payments/search")
  if (opts?.beginDate) url.searchParams.set("begin_date", opts.beginDate)
  if (opts?.endDate) url.searchParams.set("end_date", opts.endDate)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Mercado Pago payments search failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const results: MercadoPagoPayment[] = Array.isArray(data?.results) ? data.results : []
  return { results, paging: data?.paging }
}
