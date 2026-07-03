// GITHUB_PAGES=true (set by the deploy workflow) produces a static export
// under the /hdil-ipca base path for GitHub Pages. Local dev and any future
// Vercel deployment are unaffected.
const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGithubPages && {
    output: "export",
    basePath: "/hdil-ipca",
    trailingSlash: true,
  }),
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
