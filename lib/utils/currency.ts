export function formatCurrency(value: number, currency: "BRL" | "USD" | "USDT" | "EUR" = "BRL"): string {
  const resolved = currency === "USDT" ? "USD" : currency
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: resolved,
  }).format(value)
}
export function parseCurrency(value: string): number {
  return Number.parseFloat(value.replace(/[^\d,-]/g, "").replace(",", ".")) || 0
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}
