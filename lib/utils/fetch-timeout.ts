/**
 * Node/browser compatible fetch with timeout.
 *
 * Avoids depending on AbortSignal.timeout(), which may not exist depending on
 * the Node runtime used by the host.
 */

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), Math.max(0, timeoutMs))

  // If caller already provided a signal, forward aborts to our controller.
  const externalSignal = init.signal
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
