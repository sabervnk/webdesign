import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"},
  ]}]},
  serverExternalPackages: ['sql.js', '@netlify/blobs'],
  typescript: {tsconfigPath: process.env.NEXT_PUBLIC_HOSTING_TARGET==='netlify'?'tsconfig.netlify.json':'tsconfig.json'},
};

export default nextConfig;
