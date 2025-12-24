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
      // você já está permitindo eval/inline; mantenho como estava
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      // ✅ necessário para workers do three/drei
      "worker-src 'self' blob:",
      // alguns browsers ainda usam child-src p/ workers/iframes
      "child-src 'self' blob:",
      // ✅ liberar chamadas externas (HDRI + Supabase + Brapi)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brapi.dev https://raw.githack.com",
      // (recomendado) imagens e blobs
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https:",
      // se você usa <canvas> / WebGL
      "media-src 'self' blob: https:",
      "frame-ancestors 'self'",
    ].join("; ")
    
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://brapi.dev wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
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
