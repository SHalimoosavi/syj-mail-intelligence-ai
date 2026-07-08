/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained .next/standalone/ folder with only the files
  // needed to run — keeps the Docker image small (no full node_modules copy).
  output: "standalone",
};

export default nextConfig;
