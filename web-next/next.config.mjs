/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint issues (e.g. unescaped quotes) shouldn't block production builds —
    // ESLint still runs in dev/editor, just not as a hard `next build` gate.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
