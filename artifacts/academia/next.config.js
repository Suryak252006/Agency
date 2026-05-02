/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking protection (superseded by CSP frame-ancestors but kept for older browsers)
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS — only send in production (prevents localhost dev issues)
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
          // Content Security Policy
          // Next.js + MUI require unsafe-inline for scripts and styles.
          // A nonce-based CSP would be stronger but requires middleware rewrite per request.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js hydration and MUI runtime require unsafe-inline + unsafe-eval
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // MUI emotion uses inline styles at runtime
              "style-src 'self' 'unsafe-inline'",
              // Images: self, data URIs, Supabase storage
              "img-src 'self' data: blob: https://*.supabase.co",
              // Fonts served locally
              "font-src 'self'",
              // API calls: self + Supabase
              "connect-src 'self' https://*.supabase.co",
              // No frames allowed (stronger than X-Frame-Options)
              "frame-ancestors 'none'",
              // Form submissions only to self
              "form-action 'self'",
              // No plugins
              "object-src 'none'",
              // No base tag hijacking
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
