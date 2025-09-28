/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enables static export
  trailingSlash: true,  // Adds trailing slashes to routes (e.g., / becomes /index.html) for better GitHub Pages compatibility
  images: { unoptimized: true },  // Disables Next.js image optimization (GitHub Pages doesn't support it)
  // basePath: '/your-repo-name',  // Uncomment ONLY if your GitHub Pages URL is https://username.github.io/your-repo-name/ (not root domain)
};

module.exports = nextConfig;
