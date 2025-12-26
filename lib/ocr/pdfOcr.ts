// Exemplo (client-side)
export async function ocrPdfFileToText(file: File, onProgress?: (p: number) => void) {
  const pdfjs = await import("pdfjs-dist/build/pdf")
  // Worker do pdf.js no browser (v5 usa .mjs)
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString()

  const { createWorker } = await import("tesseract.js")

  const worker = await createWorker("por", 1, {
    logger: (m: any) => {
      if (m?.status === "recognizing text" && typeof m?.progress === "number") {
        onProgress?.(m.progress)
      }
    },
  })

  const arrayBuffer = await file.arrayBuffer()
  // @ts-ignore
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  let fullText = ""

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2 }) // 2x melhora OCR
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({ canvasContext: ctx, viewport }).promise

    const { data } = await worker.recognize(canvas)
    fullText += "\n" + (data?.text || "")
  }

  await worker.terminate()

  return fullText.trim()
}
