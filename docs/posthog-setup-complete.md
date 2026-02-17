# PostHog Setup Complete ✅

## Custom Insights Created

### 1. **Task Completions Over Time**

- **URL:** <https://eu.posthog.com/project/121888/insights/gYrBwkeN>
- **Tracks:** Daily task submissions
- **Use for:** Monitoring task completion trends

### 2. **Team Activity Over Time**

- **URL:** <https://eu.posthog.com/project/121888/insights/RXsb5KFG>
- **Tracks:** Team created, disbanded, member removed, role changes
- **Use for:** Understanding team dynamics

### 3. **Weekly Report Submissions**

- **URL:** <https://eu.posthog.com/project/121888/insights/PLE0MpaH>
- **Tracks:** Reports submitted vs drafts saved (weekly)
- **Use for:** Monitoring report completion rates

### 4. **Authentication Activity**

- **URL:** <https://eu.posthog.com/project/121888/insights/8hjxs0wl>
- **Tracks:** Login success, failures, password resets
- **Use for:** Security monitoring and user access issues

### 5. **Task Lifecycle Events**

- **URL:** <https://eu.posthog.com/project/121888/insights/Wpbs5inY>
- **Tracks:** Started, submitted, cancelled, retried tasks
- **Use for:** Full task funnel analysis

### 6. **Invitation Activity**

- **URL:** <https://eu.posthog.com/project/121888/insights/BRaDFLJy>
- **Tracks:** Single vs bulk invitations (weekly)
- **Use for:** User acquisition tracking

## Custom Dashboard

**Startup Platform Analytics**

- **URL:** <https://eu.posthog.com/project/121888/dashboard/523947>
- **Description:** Core metrics for tasks, teams, reports, and user activity
- **Note:** Dashboard created - manually add the insights above through PostHog UI

## Feature Flags Created

### 1. Beta: Enhanced Gamification Features

- **Key:** `beta-enhanced-gamification`
- **Status:** Inactive (0% rollout)
- **Use:** Enable for beta testers to preview achievements and streaks
- **URL:** <https://eu.posthog.com/project/121888/feature_flags/141930>

### 2. Beta: Team Collaboration V2

- **Key:** `beta-team-collaboration-v2`
- **Status:** Inactive (0% rollout)
- **Use:** Enable new team features for selected users
- **URL:** <https://eu.posthog.com/project/121888/feature_flags/141931>

### 3. Improved Onboarding Flow

- **Key:** `improved-onboarding-flow`
- **Status:** Active (100% rollout)
- **Use:** New onboarding improvements for all users
- **URL:** <https://eu.posthog.com/project/121888/feature_flags/141932>

### 4. Task UI Redesign

- **Key:** `task-ui-redesign`
- **Status:** Inactive (10% rollout ready)
- **Use:** Gradual rollout of redesigned task submission interface
- **URL:** <https://eu.posthog.com/project/121888/feature_flags/141933>

## How to Use Feature Flags in Code

### Client-Side (React Components)

```tsx
'use client'
import { useFeatureFlagEnabled } from 'posthog-js/react'

export default function TaskSubmission() {
  const showNewUI = useFeatureFlagEnabled('task-ui-redesign')

  if (showNewUI) {
    return <NewTaskSubmissionUI />
  }

  return <OldTaskSubmissionUI />
}
```

### Server-Side (API Routes)

```tsx
import PostHogClient from '@/lib/posthog-server'

export async function POST(request: Request) {
  const posthog = PostHogClient()

  const isEnabled = await posthog.isFeatureEnabled(
    'beta-enhanced-gamification',
    userId
  )

  await posthog.shutdown()

  if (isEnabled) {
    // Grant access to beta features
  }
}
```

### Bootstrap Flags (Avoid Flicker)

Add to your PostHog initialization:

```tsx
posthog.init(apiKey, {
  bootstrap: {
    featureFlags: {
      'improved-onboarding-flow': true,
      // ... other flags
    }
  }
})
```

## Next Steps

1. **Add insights to dashboard** - Go to each insight URL and click "Add to dashboard" → Select "Startup Platform Analytics"

2. **Enable feature flags** - When ready to test:
   - Go to feature flag URL
   - Change rollout percentage or add specific user targeting
   - Set `active: true`

3. **Monitor your metrics** - Check dashboard daily/weekly

4. **Set up alerts** (optional) - Create PostHog alerts for critical metrics like login failures

## Recommended Alerts to Create

- **High login failure rate** - Alert when login failures spike
- **Task submission drop** - Alert when daily submissions drop below threshold
- **Team disbandments** - Notify when teams are disbanded frequently

## Integration with Existing Events

All your existing events are already being tracked:

- ✅ Task lifecycle (started, submitted, cancelled, retried, reassigned)
- ✅ Team management (created, disbanded, member changes)
- ✅ Weekly reports (submitted, drafts saved)
- ✅ Authentication (login, logout, password reset)
- ✅ Invitations (single and bulk)
- ✅ User profile setup

No code changes needed - insights are now visualizing this data!
