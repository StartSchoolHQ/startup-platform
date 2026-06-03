import type { NextConfig } from "next";

// Get Supabase project ID from URL env var (format: https://PROJECT_ID.supabase.co)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHostname = supabaseUrl
  .replace("https://", "")
  .replace("http://", "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname || "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Keep the chromium binary out of the Next.js bundler — it must be loaded
  // at runtime by puppeteer-core (the @sparticuz/chromium binary is ~50MB
  // and bundling it explodes function size).
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // Include the scholarship Handlebars contract templates AND the
  // @sparticuz/chromium binary in the traced serverless bundle.
  //   - `.hbs` templates: renderContractHtml readFileSync's them at runtime.
  //   - @sparticuz/chromium: `serverExternalPackages` stops Next from
  //     bundling it, but the ~50MB chromium binary in its `bin/` dir is
  //     loaded dynamically, so Next's tracer never sees it. Without this
  //     include the binary is absent on Vercel and `chromium.executablePath()`
  //     throws "input directory ... does not exist", killing PDF render.
  outputFileTracingIncludes: {
    "/agreement/identity-callback": [
      "./src/lib/scholarship/templates/**/*.hbs",
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/agreements/**": [
      "./src/lib/scholarship/templates/**/*.hbs",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
