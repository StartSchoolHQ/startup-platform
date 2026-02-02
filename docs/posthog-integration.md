# PostHog Integration

PostHog is now integrated into the platform for analytics, session replay, and feature flags.

## Setup Complete ✅

1. **Client-side tracking** - `instrumentation-client.ts` (automatic)
2. **Server-side tracking** - `src/lib/posthog-server.ts`
3. **Reverse proxy** - Configured in `next.config.ts` for better reliability
4. **Environment variables** - Set in `.env.local`

## Usage

### Client-side (Components)

```tsx
'use client'
import posthog from 'posthog-js'

export default function MyComponent() {
  const handleClick = () => {
    posthog.capture('button_clicked', {
      button_name: 'signup',
      page: 'home'
    })
  }

  return <button onClick={handleClick}>Sign Up</button>
}
```

### Identify Users (on login/signup)

```tsx
'use client'
import posthog from 'posthog-js'

// After successful login
posthog.identify(userId, {
  email: user.email,
  name: user.name,
  role: user.role
})
```

### Server-side (API Routes)

```tsx
import PostHogClient from '@/lib/posthog-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const posthog = PostHogClient()
  
  posthog.capture({
    distinctId: userId,
    event: 'task_completed',
    properties: {
      task_id: taskId,
      task_type: 'weekly'
    }
  })
  
  await posthog.shutdown()
  
  return NextResponse.json({ success: true })
}
```

### Error Tracking

```tsx
try {
  // Your code
} catch (error) {
  posthog.captureException(error)
}
```

## Configuration

- **Region**: EU (configured)
- **Person profiles**: Identified only (reduces noise)
- **Exceptions**: Auto-captured
- **Debug mode**: Enabled in development

## Next Steps

1. Add identify calls to login/signup flows
2. Add custom events for key user actions
3. Set up feature flags in PostHog dashboard
4. Enable session replay for debugging

## Documentation

- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js)
- [PostHog React SDK](https://posthog.com/docs/libraries/react)
