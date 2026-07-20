/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co', pathname: '/**' },
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' }
    ]
  },
  webpack: (config, { dev }) => {
    // Evita cache em disco corrompido no dev (Windows) — causa "Cannot find module './NNN.js'"
    if (dev) {
      config.cache = { type: 'memory' }
    }
    return config
  }
}

module.exports = nextConfig
