/** @type {import('next').NextConfig} */
// Backend is a Cloudflare Python Worker. Rewrites are evaluated at build time,
// so keep the origin as a literal (env vars added in the Vercel dashboard are
// not guaranteed to be inlined here, and a localhost fallback breaks the build).
const backendOrigin =
  process.env.BACKEND_INTERNAL_URL || 'https://prompt-engine.linlizhi0210.workers.dev'

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  },
}

export default nextConfig

