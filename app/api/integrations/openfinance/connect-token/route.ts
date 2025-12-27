import { NextResponse } from "next/server"

export async function POST() {
  // Open Finance DESATIVADO no projeto (sem agregador pago como Pluggy)
  // Alternativa gratuita: importação OFX/CSV/PDF com revisão manual.
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
