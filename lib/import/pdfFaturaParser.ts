export type PdfFaturaItem = {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  currency: string
}

// Aceita: "1.234,56", "1234,56", "1234.56", "- 123,45", "123,45-", "(123,45)", "R$ 123,45"
export function parseMoneyBR(input: string): number {
  let s = (input ?? '').toString().trim()
  if (!s) return NaN

  // remove moeda e espaços estranhos
  s = s
    .replace(/R\$\s*/gi, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let negative = false
  // parênteses
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1).trim()
  }
  // traço no final
  if (/-$/.test(s)) {
    negative = true
    s = s.replace(/-+$/, '').trim()
  }
  // sinal no início
  if (/^-/.test(s)) {
    negative = true
    s = s.replace(/^-+/, '').trim()
  }

  // remove possíveis sufixos (CR/C/D)
  s = s.replace(/\b(CR|C|D)\b/gi, '').trim()

  // normaliza separadores: se tiver vírgula, ela é decimal; se não, usa ponto
  const hasComma = s.includes(',')
  if (hasComma) {
    s = s.replace(/\./g, '').replace(/,/g, '.')
  }

  // remove qualquer coisa que não seja número ou ponto
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return NaN

  const n = Number(s)
  if (!Number.isFinite(n)) return NaN
  return negative ? -n : n
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function normalizeLine(s: string): string {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// dd/mm, dd/mm/yyyy, dd-mm, dd.mm
const DATE_RE = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/i

// "12 DEZ" / "12 DEZEMBRO" (pt-br)
const MONTHS_PT: Record<string, number> = {
  JAN: 1,
  JANEIRO: 1,
  FEV: 2,
  FEVEREIRO: 2,
  MAR: 3,
  MARCO: 3,
  MARÇO: 3,
  ABR: 4,
  ABRIL: 4,
  MAI: 5,
  MAIO: 5,
  JUN: 6,
  JUNHO: 6,
  JUL: 7,
  JULHO: 7,
  AGO: 8,
  AGOSTO: 8,
  SET: 9,
  SETEMBRO: 9,
  OUT: 10,
  OUTUBRO: 10,
  NOV: 11,
  NOVEMBRO: 11,
  DEZ: 12,
  DEZEMBRO: 12,
}

const DATE_PT_RE = /^(\d{1,2})\s+([A-ZÇ]{3,9})(?:\s+(\d{2,4}))?$/i

function toISODate(day: number, month: number, year: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function guessYear(text: string): number {
  // tenta encontrar algum ano explícito no texto
  const m = text.match(/\b(20\d{2})\b/)
  if (m) return Number(m[1])
  return new Date().getFullYear()
}

function parseDateFromLineStart(line: string, fallbackYear: number): { iso: string; rest: string } | null {
  const l = normalizeLine(line)
  if (!l) return null

  // dd/mm[/yyyy]
  const m1 = l.match(DATE_RE)
  if (m1) {
    const day = Number(m1[1])
    const month = Number(m1[2])
    let year = fallbackYear
    if (m1[3]) {
      const y = Number(m1[3])
      year = y < 100 ? 2000 + y : y
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const rest = l.slice(m1[0].length).trim()
      return { iso: toISODate(day, month, year), rest }
    }
  }

  // dd MMM[ yyyy]
  const firstTwo = l.split(' ').slice(0, 2).join(' ')
  const m2 = firstTwo.match(/^(\d{1,2})\s+([A-ZÇ]{3,9})$/i)
  if (m2) {
    const day = Number(m2[1])
    const monRaw = m2[2].toUpperCase()
    const month = MONTHS_PT[monRaw]
    if (month) {
      const rest = l.slice(m2[0].length).trim()
      return { iso: toISODate(day, month, fallbackYear), rest }
    }
  }

  // dd MMM yyyy (quando vier junto)
  const m3 = l.split(' ').slice(0, 3).join(' ').match(DATE_PT_RE)
  if (m3) {
    const day = Number(m3[1])
    const monRaw = m3[2].toUpperCase()
    const month = MONTHS_PT[monRaw]
    let year = fallbackYear
    if (m3[3]) {
      const y = Number(m3[3])
      year = y < 100 ? 2000 + y : y
    }
    if (month) {
      const rest = l.slice(m3[0].length).trim()
      return { iso: toISODate(day, month, year), rest }
    }
  }

  return null
}

function findLastAmountToken(s: string): { amount: number; token: string; index: number } | null {
  // procura o ÚLTIMO token parecido com dinheiro
  // exemplos: "1.234,56" | "123,45" | "1234.56" | "R$ 12,34" | "12,34-"
  const moneyTokenRe = /(R\$\s*)?\(?-?\s*\d{1,3}(?:[\d\.\s]*\d)?(?:[\.,]\d{2})\)?-?\b/g
  let match: RegExpExecArray | null
  let last: { amount: number; token: string; index: number } | null = null
  while ((match = moneyTokenRe.exec(s)) !== null) {
    const token = match[0]
    const amount = parseMoneyBR(token)
    if (Number.isFinite(amount)) {
      last = { amount, token, index: match.index }
    }
  }
  return last
}

export function parsePdfFaturaTextToItems(text: string): PdfFaturaItem[] {
  const raw = (text ?? '').toString()
  const year = guessYear(raw)

  // normaliza quebras e remove linhas "vazias" demais
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => normalizeLine(l))
    .filter(Boolean)

  const items: PdfFaturaItem[] = []
  let current: { date: string; desc: string[]; amount?: number } | null = null

  const flush = () => {
    if (!current) return
    const description = normalizeLine(current.desc.join(' '))
    if (current.date && description && typeof current.amount === 'number' && Number.isFinite(current.amount)) {
      items.push({
        date: current.date,
        description,
        amount: current.amount,
        currency: 'BRL',
      })
    }
    current = null
  }

  for (const line of lines) {
    // ignora cabeçalhos comuns
    const up = line.toUpperCase()
    if (
      up.includes('TOTAL') ||
      up.includes('PAGAMENTO') ||
      up.includes('SALDO') ||
      up.includes('VENCIMENTO') ||
      up.includes('FECHAMENTO')
    ) {
      continue
    }

    const d = parseDateFromLineStart(line, year)
    if (d) {
      // começou novo lançamento
      flush()
      current = { date: d.iso, desc: [d.rest] }

      const found = findLastAmountToken(d.rest)
      if (found) {
        current.amount = found.amount
        // remove o trecho do valor da descrição
        const before = d.rest.slice(0, found.index).trim()
        current.desc = [before]
      }
      continue
    }

    // linha de continuação
    if (current) {
      // tenta capturar valor se ainda não capturou
      if (typeof current.amount !== 'number') {
        const found = findLastAmountToken(line)
        if (found) {
          current.amount = found.amount
          const before = line.slice(0, found.index).trim()
          if (before) current.desc.push(before)
          continue
        }
      }
      // sem valor: só concatena na descrição
      current.desc.push(line)
    }
  }

  flush()

  // Dedup (algumas faturas repetem linhas no rodapé)
  const seen = new Set<string>()
  const unique = items.filter((it) => {
    const k = `${it.date}|${it.description}|${it.amount}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return unique
}
