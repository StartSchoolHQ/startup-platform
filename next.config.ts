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
  // Include the scholarship Handlebars contract templates in the traced
  // serverless bundle so renderContractHtml can readFileSync them at runtime.
  outputFileTracingIncludes: {
    "/agreement/identity-callback": [
      "./src/lib/scholarship/templates/**/*.hbs",
    ],
    "/api/agreements/**": ["./src/lib/scholarship/templates/**/*.hbs"],
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
