// app/api/import/cartao-fatura-pdf/route.ts
import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createRequire } from "node:module"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const require = createRequire(import.meta.url)

/** ----------- helpers ----------- */
function normalizeText(s: string) {
  return s
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .trim()
}

function safeToNumberBR(raw: string) {
  // aceita: "1.234,56" | "123,45" | "-12,34" | "R$ 1.234,56"
  const s = raw
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function pickString(form: FormData, keys: string[]) {
  for (const k of keys) {
    const v = form.get(k)
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function pickBool(form: FormData, keys: string[], defaultValue = false) {
  const v = pickString(form, keys)
  if (v == null) return defaultValue
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "on" || v.toLowerCase() === "yes"
}

function pickFile(form: FormData, keys: string[]) {
  for (const k of keys) {
    const v = form.get(k)
    if (v instanceof File) return v
  }
  return null
}

function listFormKeys(form: FormData) {
  const keys: string[] = []
  form.forEach((_v, k) => keys.push(k))
  return Array.from(new Set(keys)).sort()
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

/** ----------- pdf text extraction ----------- */
async function extractPdfText(buffer: Buffer) {
  // pdf-parse@1.1.1 (CJS) — precisa ser carregado via require (compatível com Turbopack)
  const mod = require("pdf-parse")
  const pdfParse = (typeof mod === "function" ? mod : mod?.default) as
    | ((data: Buffer, options?: any) => Promise<{ text?: string }>)
    | undefined

  if (typeof pdfParse !== "function") {
    throw new Error(
      "pdf-parse não está exportando função. Garanta `npm i pdf-parse@1.1.1` e que não há versões duplicadas no lockfile."
    )
  }

  const parsed = await pdfParse(buffer, {
    // melhora extração em alguns PDFs
    normalizeWhitespace: true,
  })

  const text = normalizeText(parsed?.text ?? "")
  return text
}

/** ----------- parsing “inteligente” de lançamentos ----------- */
type ParsedItem = {
  dataISO: string // YYYY-MM-DD
  descricao: string
  valor: number
  parcela_atual?: number | null
  parcela_total?: number | null
  categoria_sugerida?: string | null
}

function detectInstallments(desc: string) {
  // padrões comuns: "02/10", "2/10", "PARC 02/10", "02 de 10"
  const m1 = desc.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/)
  if (m1) {
    const atual = Number(m1[1])
    const total = Number(m1[2])
    if (Number.isFinite(atual) && Number.isFinite(total) && total >= 2 && atual >= 1 && atual <= total) {
      return { atual, total }
    }
  }
  const m2 = desc.match(/(?:^|\s)(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})(?:\s|$)/i)
  if (m2) {
    const atual = Number(m2[1])
    const total = Number(m2[2])
    if (Number.isFinite(atual) && Number.isFinite(total) && total >= 2 && atual >= 1 && atual <= total) {
      return { atual, total }
    }
  }
  return null
}

function guessCategoria(desc: string) {
  const d = desc.toLowerCase()
  const rules: Array<[RegExp, string]> = [
    [/uber|99|cabify|taxi|transporte|ônibus|metro|metrô|combust|posto|gasolina|etanol|diesel/, "Transporte"],
    [/ifood|ifood|restaurante|lanchonete|pizza|hamburg|bar\b|delivery|café|cafe/, "Alimentação"],
    [/mercado|super|hortifruti|padaria|açougue|acougue|carrefour|assai|atacad|extra\b/, "Mercado"],
    [/farm|drog|droga|raia|pacheco|panvel|rem[eé]dio/, "Farmácia"],
    [/netflix|spotify|prime video|hbo|max|deezer|assinatura|subscription/, "Assinaturas"],
    [/loja|magalu|mercado livre|amazon|shein|shopee|aliexpress|compra/, "Compras"],
    [/energia|luz\b|agua\b|internet|vivo|claro|tim|oi\b|telefone|gás\b/, "Contas"],
    [/academia|gym|cross|pilates|nutri|sa[uú]de|m[eé]dico|dent|consulta/, "Saúde"],
    [/educa|curso|udemy|alura|faculdade|escola/, "Educação"],
  ]
  for (const [re, cat] of rules) if (re.test(d)) return cat
  return null
}

function parseLinesToItems(text: string, yearHint?: number) {
  const lines = text
    .split("\n")
    .map((l) => normalizeText(l))
    .filter(Boolean)

  const items: ParsedItem[] = []
  const year = yearHint ?? new Date().getFullYear()

  for (const line of lines) {
    // Ex: "12/12 SUPERMERCADO ABC 123,45"
    // Ex: "12/12 LOJA XYZ 02/10 45,67"
    // Ex: "12/12 PAGAMENTO RECEBIDO -123,45" (crédito/estorno)
    const m = line.match(
      /^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\s+(.+?)\s+(-?\s*(?:R\$)?\s*\d[\d\.]*,\d{2})$/
    )
    if (!m) continue

    const dd = Number(m[1])
    const mm = Number(m[2])
    const yyRaw = m[3]
    const descRaw = m[4]?.trim() ?? ""
    const valRaw = m[5]?.trim() ?? ""

    if (!(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12)) continue

    const y =
      yyRaw && yyRaw.length
        ? yyRaw.length === 2
          ? 2000 + Number(yyRaw)
          : Number(yyRaw)
        : year

    const valor = safeToNumberBR(valRaw)
    if (valor == null) continue

    const inst = detectInstallments(descRaw)
    const categoria = guessCategoria(descRaw)

    const dataISO = `${String(y).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`

    items.push({
      dataISO,
      descricao: descRaw.replace(/\s+/g, " ").trim(),
      valor,
      parcela_atual: inst?.atual ?? null,
      parcela_total: inst?.total ?? null,
      categoria_sugerida: categoria,
    })
  }

  return items
}

/** ----------- route ----------- */
export async function POST(req: Request) {
  try {
    // tenta FormData (upload de arquivo)
    let form: FormData | null = null
    try {
      form = await req.formData()
    } catch {
      form = null
    }

    if (!form) {
      return NextResponse.json(
        { ok: false, error: "Envie multipart/form-data (FormData) com o PDF anexado." },
        { status: 400 }
      )
    }

    const receivedKeys = listFormKeys(form)

    const file = pickFile(form, ["file", "pdf", "fatura", "arquivo", "document"])
    const cartao_id = pickString(form, ["cartao_id", "cartaoId", "card_id", "cardId", "cartao", "card"])

    const replicar_parcelas = pickBool(form, ["replicar_parcelas", "replicarParcelas"], true)
    const criar_categorias = pickBool(form, ["criar_categorias", "criarCategorias"], true)

    if (!file || !cartao_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Campos obrigatórios ausentes. É necessário enviar o PDF e o identificador do cartão.",
          expected: {
            file: ["file (recomendado)", "pdf", "fatura", "arquivo"],
            cartao_id: ["cartao_id (recomendado)", "cartaoId", "cardId"],
          },
          receivedKeys,
          hints: [
            "No frontend, use FormData e faça: formData.append('file', arquivoPDF) e formData.append('cartao_id', cartaoIdSelecionado).",
          ],
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.id) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 })
    }

    const buf = Buffer.from(await file.arrayBuffer())

    // 1) extrai texto do PDF
    const pdfText = await extractPdfText(buf)

    if (!pdfText || pdfText.length < 20) {
      // MUITO comum em faturas escaneadas (imagem): sem OCR não tem como “ler”
      return NextResponse.json(
        {
          ok: false,
          error:
            "Não foi possível extrair texto do PDF. Ele parece ser uma imagem/escaneado (sem texto selecionável). Para esse tipo de fatura, você precisa de OCR.",
          suggestion:
            "Tente exportar o PDF diretamente do app/banco (não como foto) ou habilitar OCR no pipeline (ex.: Tesseract, Google Vision, etc.).",
        },
        { status: 422 }
      )
    }

    // 2) parseia linhas em lançamentos
    const items = parseLinesToItems(pdfText)

    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Texto extraído, mas não consegui identificar lançamentos no formato esperado (data/descrição/valor).",
          debug: {
            extractedTextPreview: pdfText.slice(0, 1200),
          },
          hint:
            "Me mande um trecho do texto extraído (sem dados sensíveis) que eu ajusto o parser pro layout exato do seu banco/cartão.",
        },
        { status: 422 }
      )
    }

    // 3) garante categorias (opcional)
    const uniqueCats = Array.from(
      new Set(items.map((i) => i.categoria_sugerida).filter(Boolean) as string[])
    )

    let categoriasMap = new Map<string, string>() // nome -> id

    if (criar_categorias && uniqueCats.length) {
      const { data: existingCats } = await supabase
        .from("categorias")
        .select("id,nome")
        .eq("user_id", user.id)

      for (const c of existingCats ?? []) categoriasMap.set(String(c.nome), String(c.id))

      const missing = uniqueCats.filter((c) => !categoriasMap.has(c))
      if (missing.length) {
        const { data: insertedCats, error: insErr } = await supabase
          .from("categorias")
          .insert(missing.map((nome) => ({ user_id: user.id, nome })))
          .select("id,nome")

        if (insErr) {
          // não mata o import — só segue sem vincular categoria
          console.warn("[cartao-fatura-pdf] falha ao criar categorias:", insErr)
        } else {
          for (const c of insertedCats ?? []) categoriasMap.set(String(c.nome), String(c.id))
        }
      }
    } else {
      const { data: existingCats } = await supabase
        .from("categorias")
        .select("id,nome")
        .eq("user_id", user.id)
      for (const c of existingCats ?? []) categoriasMap.set(String(c.nome), String(c.id))
    }

    // 4) gera linhas de despesas (e replica parcelas se marcado)
    const toInsert: any[] = []
    const nowIso = new Date().toISOString()

    for (const it of items) {
      const categoria_id =
        it.categoria_sugerida && categoriasMap.has(it.categoria_sugerida)
          ? categoriasMap.get(it.categoria_sugerida)
          : null

      const base = {
        user_id: user.id,
        cartao_id,
        data: it.dataISO,
        descricao: it.descricao,
        valor: it.valor,
        categoria_id,
        origem: "cartao",
        created_at: nowIso,
        updated_at: nowIso,
      }

      const parcela_atual = it.parcela_atual ?? null
      const parcela_total = it.parcela_total ?? null

      // hash para deduplicar
      const hashBase = `${user.id}|${cartao_id}|${it.dataISO}|${it.descricao}|${it.valor}|${parcela_atual ?? ""}|${
        parcela_total ?? ""
      }`
      const hash_importacao = sha256(hashBase)

      toInsert.push({
        ...base,
        parcela_atual,
        parcela_total,
        hash_importacao,
      })

      if (replicar_parcelas && parcela_total && parcela_total >= 2 && parcela_atual && parcela_atual >= 1) {
        // gera futuras parcelas (mês a mês) mantendo mesma descrição/valor
        // OBS: aqui assumimos parcela mensal. Se seu cartão for diferente, ajustamos.
        const [y, m, d] = it.dataISO.split("-").map(Number)
        for (let next = parcela_atual + 1; next <= parcela_total; next++) {
          const date = new Date(y, (m - 1) + (next - parcela_atual), d)
          const yyyy = date.getFullYear()
          const mm = String(date.getMonth() + 1).padStart(2, "0")
          const dd = String(date.getDate()).padStart(2, "0")
          const nextISO = `${yyyy}-${mm}-${dd}`

          const nextHash = sha256(`${user.id}|${cartao_id}|${nextISO}|${it.descricao}|${it.valor}|${next}|${parcela_total}`)

          toInsert.push({
            ...base,
            data: nextISO,
            parcela_atual: next,
            parcela_total,
            hash_importacao: nextHash,
          })
        }
      }
    }

    // 5) remove duplicados (busca hashes já existentes)
    const hashes = toInsert.map((x) => x.hash_importacao)
    const { data: existing } = await supabase
      .from("despesas")
      .select("hash_importacao")
      .eq("user_id", user.id)
      .in("hash_importacao", hashes)

    const existingSet = new Set((existing ?? []).map((e) => String(e.hash_importacao)))
    const finalInsert = toInsert.filter((x) => !existingSet.has(String(x.hash_importacao)))

    if (!finalInsert.length) {
      return NextResponse.json({
        ok: true,
        message: "Nada novo para importar (tudo já existia).",
        parsed: items.length,
        generated: toInsert.length,
        inserted: 0,
        skippedAsDuplicate: toInsert.length,
      })
    }

    const { error: insErr } = await supabase.from("despesas").insert(finalInsert)
    if (insErr) {
      console.error("[cartao-fatura-pdf] insert despesas error:", insErr)
      return NextResponse.json(
        { ok: false, error: "Falha ao inserir despesas no banco.", details: insErr },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      parsed: items.length,
      generated: toInsert.length,
      inserted: finalInsert.length,
      skippedAsDuplicate: toInsert.length - finalInsert.length,
    })
  } catch (e: any) {
    console.error("[cartao-fatura-pdf] unexpected error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro inesperado ao importar PDF." },
      { status: 500 }
    )
  }
}
