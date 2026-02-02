import { PostHog } from "posthog-node";

/**
 * Server-side PostHog client for API routes and server components
 * Use this to track events from the backend
 */
export default function PostHogClient() {
  const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Because server-side functions in Next.js can be short-lived,
    // we set flushAt to 1 and flushInterval to 0 to ensure events are sent immediately
    flushAt: 1,
    flushInterval: 0,
  });
  return posthogClient;
}

/**
 * Example usage in API route:
 *
 * import PostHogClient from '@/lib/posthog-server';
 *
 * export async function POST(request: Request) {
 *   const posthog = PostHogClient();
 *
 *   posthog.capture({
 *     distinctId: userId,
 *     event: 'user_signed_up',
 *     properties: {
 *       email: email,
 *       source: 'api'
 *     }
 *   });
 *
 *   // IMPORTANT: Always shutdown when done
 *   await posthog.shutdown();
 *
 *   return NextResponse.json({ success: true });
 * }
 */
