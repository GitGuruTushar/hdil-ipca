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
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? "/hdil-ipca" : "",
  },
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
};

export default nextConfig;
