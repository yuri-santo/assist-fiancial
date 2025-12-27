import { NextResponse } from "next/server"

// Evita 404 em navegadores que sempre tentam buscar /favicon.ico.
// O ícone real está em /public/favicon.svg.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/favicon.svg", request.url))
}
