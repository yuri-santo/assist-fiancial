import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      code: "OPENFINANCE_DISABLED",
      message:
        "Open Finance está desativado neste projeto. Use importação de extrato (OFX/CSV) ou PDF com revisão manual.",
    },
    { status: 410 },
  )
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "OPENFINANCE_DISABLED",
      message:
        "Open Finance está desativado neste projeto. Use importação de extrato (OFX/CSV) ou PDF com revisão manual.",
    },
    { status: 410 },
  )
}
