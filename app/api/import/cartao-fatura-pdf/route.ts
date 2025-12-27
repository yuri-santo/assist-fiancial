// app/api/import/cartao-fatura-pdf/route.ts
import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createRequire } from "node:module"
import { createClient } from "@/lib/supabase/server"
import { parsePdfFaturaTextToItems } from "@/lib/import/pdfFaturaParser"

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

function pickJson<T = any>(form: FormData, keys: string[]): T | null {
  const raw = pickString(form, keys)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isValidISODate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d)
}

function sanitizeItem(x: any): ParsedItem | null {
  if (!x || typeof x !== "object") return null
  const dataISO = String(x.dataISO || x.data || "").trim()
  const descricao = String(x.descricao || "").trim()
  const valor = typeof x.valor === "number" ? x.valor : safeToNumberBR(String(x.valor ?? ""))
  if (!isValidISODate(dataISO) || !descricao || valor == null) return null
  const parcela_atual = x.parcela_atual == null ? null : Number(x.parcela_atual)
  const parcela_total = x.parcela_total == null ? null : Number(x.parcela_total)
  const categoria_sugerida = x.categoria_sugerida ? String(x.categoria_sugerida) : null
  return {
    dataISO,
    descricao,
    valor,
    parcela_atual: Number.isFinite(parcela_atual as any) ? (parcela_atual as number) : null,
    parcela_total: Number.isFinite(parcela_total as any) ? (parcela_total as number) : null,
    categoria_sugerida,
  }
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

function parseLinesToItems(text: string) {
  const base = parsePdfFaturaTextToItems(text)
  const items: ParsedItem[] = []

  for (const it of base) {
    const desc = it.description.replace(/\s+/g, " ").trim()
    const inst = detectInstallments(desc)
    const categoria = guessCategoria(desc)
    items.push({
      dataISO: it.date,
      descricao: desc,
      valor: it.amount,
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

    // Fluxos adicionais:
    // - OCR client-side: o frontend pode enviar o texto via "ocr_text".
    // - Preview/edição: frontend pode pedir dry_run=1 para receber itens sem inserir.
    // - Confirmação: frontend pode enviar items_json com a lista já ajustada.
    const ocr_text = pickString(form, ["ocr_text", "ocrText", "text", "extracted_text"])
    const dry_run = pickBool(form, ["dry_run", "dryRun", "preview"], false)
    const items_json = pickJson<any[]>(form, ["items_json", "itemsJson", "items"]) // lista de itens ajustados

    const replicar_parcelas = pickBool(form, ["replicar_parcelas", "replicarParcelas"], true)
    const criar_categorias = pickBool(form, ["criar_categorias", "criarCategorias"], true)

    if ((!file && !ocr_text && !items_json) || !cartao_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Campos obrigatórios ausentes. É necessário enviar o PDF e o identificador do cartão.",
          expected: {
            file: ["file (recomendado)", "pdf", "fatura", "arquivo"],
            cartao_id: ["cartao_id (recomendado)", "cartaoId", "cardId"],
            alternative: ["ocr_text (texto extraído por OCR)", "items_json (lista de lançamentos)"]
          },
          receivedKeys,
          hints: [
            "No frontend, use FormData e faça: formData.append('file', arquivoPDF) e formData.append('cartao_id', cartaoIdSelecionado).",
            "Se o PDF for imagem/escaneado, rode OCR no navegador e envie como formData.append('ocr_text', textoExtraido).",
            "Para permitir revisão do usuário, primeiro chame com dry_run=1 e depois envie items_json confirmados.",
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

    // 1) obtém texto (PDF -> texto) OU usa OCR enviado pelo cliente
    let pdfText = ""
    if (items_json && Array.isArray(items_json)) {
      // pular extração/parsing: já veio a lista pronta
      pdfText = ""
    } else if (ocr_text && ocr_text.length >= 10) {
      pdfText = normalizeText(ocr_text)
    } else {
      const buf = Buffer.from(await (file as File).arrayBuffer())
      pdfText = await extractPdfText(buf)
    }

    if ((!items_json || !Array.isArray(items_json)) && (!pdfText || pdfText.length < 20)) {
      // MUITO comum em faturas escaneadas (imagem): sem OCR não tem como “ler”
      return NextResponse.json(
        {
          ok: false,
          needsOcr: true,
          error:
            "Não foi possível extrair texto do PDF. Ele parece ser uma imagem/escaneado (sem texto selecionável).",
          suggestion:
            "Rode OCR no navegador (tesseract.js) e reenvie como ocr_text, ou exporte o PDF diretamente do app/banco (não como foto).",
        },
        { status: 422 }
      )
    }

    // 2) parseia linhas em lançamentos (ou usa lista já enviada)
    const items: ParsedItem[] = Array.isArray(items_json)
      ? (items_json.map(sanitizeItem).filter(Boolean) as ParsedItem[])
      : parseLinesToItems(pdfText)

    if (items.length === 0) {
      // Se ainda não tentou OCR, força o fluxo de OCR do frontend.
      // Muitos PDFs “texto selecionável” vêm com colunas quebradas e o OCR (imagem) acaba ficando melhor para o parser.
      if (!ocr_text) {
        return NextResponse.json(
          {
            ok: false,
            needsOcr: true,
            reason: "no_items",
            error:
              "Texto extraído, mas não consegui identificar lançamentos no formato esperado. Vou tentar OCR (imagem) para melhorar a estrutura.",
            debug: {
              extractedTextPreview: pdfText.slice(0, 1200),
            },
          },
          { status: 422 }
        )
      }

      // Já veio via OCR (ou o usuário colou) e mesmo assim não achou: libera modo manual
      if (dry_run) {
        return NextResponse.json({
          ok: true,
          mode: "preview",
          parsed: 0,
          items: [],
          needsManual: true,
          rawText: pdfText.slice(0, 5000),
        })
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Não consegui identificar lançamentos automaticamente. Use o modo de pré-visualização (dry_run=1) para ajustar manualmente e reenviar items_json.",
        },
        { status: 422 }
      )
    }

    // 2.1) preview (sem inserir) — usado para UI de "mini planilha"
    if (dry_run) {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        parsed: items.length,
        items,
      })
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
