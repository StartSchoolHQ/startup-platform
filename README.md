# StartSchool Platform

A startup accelerator platform built with Next.js 16, React 19, and Supabase. Helps early-stage startups track progress, manage teams, and stay accountable through gamified task management and structured weekly reporting.

## Features

- **Task Management** — Individual and team tasks with submission/approval workflows
- **Team Journey** — Collaborative team management with role-based permissions and progress tracking
- **Weekly Reports** — Structured weekly accountability with deadlines, penalties, and admin review
- **Gamification** — Points, XP, achievements, and leaderboards to drive engagement
- **Peer Review** — Cross-team accountability and feedback system
- **Notifications** — Real-time updates on task status, team activity, and deadlines
- **Admin Dashboard** — User management, team oversight, task creation, audit logs, and student progress tracking
- **Support System** — In-app support tickets with Discord webhook integration

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) + [ShadCN/UI](https://ui.shadcn.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
- **State:** [TanStack Query](https://tanstack.com/query) + React Context
- **Analytics:** [PostHog](https://posthog.com/) + [Sentry](https://sentry.io/)
- **Deployment:** [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18.17+
- npm
- A [Supabase](https://supabase.com/) project

### Installation

```bash
git clone https://github.com/your-username/startup-platform.git
cd startup-platform
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`. See [`.env.example`](.env.example) for all available variables and descriptions.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes (admin ops under api/admin/)
│   ├── auth/              # Auth callback & password reset
│   └── dashboard/         # Protected pages
│       ├── admin/         # Admin panel (users, teams, tasks, audit-logs, progress)
│       ├── leaderboard/   # Points & XP leaderboard
│       ├── my-journey/    # Personal task dashboard
│       ├── peer-review/   # Cross-team reviews
│       ├── support/       # Support tickets
│       ├── team-journey/  # Team management & progress
│       └── transaction-history/  # Points & XP transaction log
├── components/            # React components (feature-based + ui/)
├── contexts/              # React contexts (AppContext)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, Supabase clients, validation
│   └── supabase/         # Browser, server, and admin clients
└── types/                 # TypeScript type definitions
```

## Scripts

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (Vitest)
npm run test:watch   # Tests in watch mode
```

## Branch Workflow

| Branch | Purpose | Deployment |
|--------|---------|------------|
| `master` | Production | Main domain |
| `develop` | Testing | Vercel preview |
| `feature/*` | Feature work | Created from `develop` |

Always test on `develop` before merging to `master`.

## Documentation

Detailed system documentation lives in [`docs/documentation/`](docs/documentation/):

- [Authorization & Auth Flow](docs/documentation/authorization.md)
- [Task System](docs/documentation/task-system.md)
- [Team Journey](docs/documentation/team-journey.md)
- [Leaderboard & Gamification](docs/documentation/leaderboard.md)
- [Achievements](docs/documentation/achievements.md)
- [Transactions & Points](docs/documentation/transactions.md)
- [Notifications](docs/documentation/notifications.md)
- [Peer Review](docs/documentation/peer-review.md)
- [Invitations](docs/documentation/invitations.md)
- [Support](docs/documentation/support.md)
- [Account & Profile](docs/documentation/account-profile.md)
- [Dashboard](docs/documentation/dashboard.md)
- [Error Handling Guidelines](docs/errors/guidelines.md)

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
