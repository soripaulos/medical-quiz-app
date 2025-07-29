/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BUILD_PHASE: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig