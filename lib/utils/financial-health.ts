import type { SaudeFinanceira } from "@/lib/types"

interface HealthData {
  receitas: number
  despesas: number
  reservaAtual: number
  reservaMeta: number
  despesasMediaMensal: number
  dividas: number
  investimentos: number
  objetivosConcluidos: number
  objetivosTotal: number
}

export function calcularSaudeFinanceira(data: HealthData): SaudeFinanceira {
  const fatores: SaudeFinanceira["fatores"] = []

  // 1. Taxa de economia (peso 25)
  const taxaEconomia = data.receitas > 0 ? ((data.receitas - data.despesas) / data.receitas) * 100 : 0
  const pontuacaoEconomia = Math.min(100, Math.max(0, taxaEconomia * 5)) // 20% economia = 100 pontos
  fatores.push({ nome: "Taxa de Economia", valor: pontuacaoEconomia, peso: 25 })

  // 2. Reserva de emergencia (peso 25)
  const mesesCobertos = data.despesasMediaMensal > 0 ? data.reservaAtual / data.despesasMediaMensal : 0
  const pontuacaoReserva = Math.min(100, (mesesCobertos / 6) * 100) // 6 meses = 100 pontos
  fatores.push({ nome: "Reserva de Emergencia", valor: pontuacaoReserva, peso: 25 })

  // 3. Controle de dividas (peso 20)
  const taxaDividas = data.receitas > 0 ? (data.dividas / data.receitas) * 100 : 0
  const pontuacaoDividas = Math.max(0, 100 - taxaDividas * 3.33) // 30% divida = 0 pontos
  fatores.push({ nome: "Controle de Dividas", valor: pontuacaoDividas, peso: 20 })

  // 4. Investimentos (peso 15)
  const taxaInvestimentos = data.receitas > 0 ? (data.investimentos / (data.receitas * 12)) * 100 : 0
  const pontuacaoInvestimentos = Math.min(100, taxaInvestimentos * 10) // 10% = 100 pontos
  fatores.push({ nome: "Investimentos", valor: pontuacaoInvestimentos, peso: 15 })

  // 5. Objetivos (peso 15)
  const pontuacaoObjetivos = data.objetivosTotal > 0 ? (data.objetivosConcluidos / data.objetivosTotal) * 100 : 50
  fatores.push({ nome: "Objetivos Alcancados", valor: pontuacaoObjetivos, peso: 15 })

  // Calcular score final ponderado
  const score = fatores.reduce((sum, f) => sum + (f.valor * f.peso) / 100, 0)

  // Determinar status
  let status: SaudeFinanceira["status"]
  if (score < 30) status = "critico"
  else if (score < 50) status = "atencao"
  else if (score < 75) status = "bom"
  else status = "excelente"

  return { score, status, fatores }
}

export function getStatusColor(status: SaudeFinanceira["status"]) {
  switch (status) {
    case "critico":
      return "text-red-500"
    case "atencao":
      return "text-amber-500"
    case "bom":
      return "text-emerald-500"
    case "excelente":
      return "text-cyan-400"
  }
}

export function getStatusBgColor(status: SaudeFinanceira["status"]) {
  switch (status) {
    case "critico":
      return "bg-red-500/20"
    case "atencao":
      return "bg-amber-500/20"
    case "bom":
      return "bg-emerald-500/20"
    case "excelente":
      return "bg-cyan-400/20"
  }
}

export function getStatusLabel(status: SaudeFinanceira["status"]) {
  switch (status) {
    case "critico":
      return "Critico"
    case "atencao":
      return "Atencao"
    case "bom":
      return "Bom"
    case "excelente":
      return "Excelente"
  }
}
