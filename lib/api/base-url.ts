/**
 * Base URL helper for server-side fetches.
 *
 * Why this exists:
 * - On the browser, we want relative URLs ("/api/...")
 * - On the server (SSR/RSC), fetch("/api/..." ) needs an absolute URL
 * - In Render, Vercel-specific env vars don't exist, so falling back to localhost breaks.
 */

function normalizeUrlLike(value: string): string {
  const v = value.trim()
  if (!v) return ""
  // Accept either full URL or hostname
  if (v.startsWith("http://") || v.startsWith("https://")) return v.replace(/\/$/, "")
  return `https://${v.replace(/\/$/, "")}`
}

/**
 * Returns:
 * - "" on the client (so callers can use relative URLs)
 * - an absolute URL on the server
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return ""

  // 1) Explicit app URL (recommended to set in Render env vars)
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    ""

  const normalizedExplicit = explicit ? normalizeUrlLike(explicit) : ""
  if (normalizedExplicit) return normalizedExplicit

  // 2) Render / Vercel hostnames
  const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL_URL || ""
  const normalizedHostname = hostname ? normalizeUrlLike(hostname) : ""
  if (normalizedHostname) return normalizedHostname

  // 3) Local fallback
  return "http://localhost:3000"
}
