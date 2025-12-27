import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.redirect(new URL("/dashboard/integracoes?error=openfinance_disabled", "http://localhost:3000"))
}
