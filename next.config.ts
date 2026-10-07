import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Old UI URLs (deleted in phase 16, D-36) land on Trips. Fixed internal
  // destinations only. Not permanent, so 16.1 can bring a /chat route back.
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/chat', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
