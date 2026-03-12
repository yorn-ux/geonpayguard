/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Remove async headers() function entirely
  // Let Stripe handle its own CSP
};

export default nextConfig;