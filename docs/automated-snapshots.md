# Automated Leaderboard Snapshots

## Overview

The Smart Snapshot System requires weekly snapshots to be generated automatically. This document explains how to set up automated scheduling.

## API Endpoint

- **URL**: `/api/leaderboard/generate-snapshots`
- **Method**: `POST`
- **Authorization**: Bearer token using `CRON_SECRET_KEY` environment variable

## Environment Variables

Add to your `.env.local` or production environment:

```
CRON_SECRET_KEY=your-secure-random-key-here
```

## Scheduling Options

### 1. Vercel Cron Jobs (Recommended for Vercel deployments)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/leaderboard/generate-snapshots",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

Schedule runs every Monday at midnight UTC.

### 2. External Cron Services

Use services like:

- **Cron-job.org**: Free external cron service
- **EasyCron**: Paid service with better reliability
- **GitHub Actions**: Free for public repos

Example curl command:

```bash
curl -X POST https://your-domain.com/api/leaderboard/generate-snapshots \
  -H "Authorization: Bearer your-cron-secret-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Manual Trigger (Development)

For testing or manual runs:

```bash
# Health check
curl https://your-domain.com/api/leaderboard/generate-snapshots

# Generate snapshots
curl -X POST https://your-domain.com/api/leaderboard/generate-snapshots \
  -H "Authorization: Bearer your-cron-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 49, "weekYear": 2025}'
```

## Current Status

- ✅ API endpoint created and secured
- ⏳ Need to configure scheduling service
- ⏳ Need to add CRON_SECRET_KEY to environment

## Next Steps

1. Add `CRON_SECRET_KEY` to environment variables
2. Choose and configure a scheduling service
3. Test the automated generation
4. Monitor logs for successful execution

## Monitoring

The API returns detailed success/failure information:

```json
{
  "success": true,
  "message": "Generated 8 snapshots for week 49, 2025",
  "usersProcessed": 8,
  "timestamp": "2025-12-01T12:00:00.000Z"
}
```
