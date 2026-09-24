/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:7860'

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

