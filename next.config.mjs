/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brapi.dev https://raw.githack.com",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ]
  },
  reactStrictMode: true,
  poweredByHeader: false,
}

export default nextConfig
