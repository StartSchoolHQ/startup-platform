# StartSchool Platform

A modern startup accelerator platform built with Next.js 16, React 19, and Supabase. Designed to help early-stage startups track progress, manage teams, and stay accountable through gamified task management.

## ✨ Features

- **📋 Task Management** - Individual and team task tracking with approval workflows
- **👥 Team Journey** - Collaborative team management with role-based permissions
- **🏆 Gamification** - Points, achievements, and leaderboards to drive engagement
- **📊 Weekly Reports** - Track progress with structured reporting
- **👀 Peer Review** - Cross-team accountability and feedback system
- **🔔 Notifications** - Real-time updates on task status and team activity
- **👑 Admin Dashboard** - Comprehensive admin tools for program management

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI:** [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) + [ShadCN/UI](https://ui.shadcn.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
- **State Management:** [TanStack Query](https://tanstack.com/query)
- **Error Tracking:** [Sentry](https://sentry.io/)
- **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or pnpm
- A Supabase project

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/startup-platform.git
   cd startup-platform
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials and other required variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-side only)
   - `NEXT_PUBLIC_SENTRY_DSN` - Your Sentry DSN (optional, for error tracking)
   - `DISCORD_WEBHOOK_URL` - Discord webhook for support tickets (optional)

4. **Set up the database**

   Run the migrations in your Supabase project. The database schema includes:
   - User profiles and authentication
   - Teams and team memberships
   - Tasks, submissions, and approvals
   - Points, achievements, and leaderboards
   - Weekly reports and meetings

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard pages
│   └── ...
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── dashboard/        # Dashboard components
│   ├── ui/               # ShadCN UI components
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
│   └── supabase/         # Supabase client setup
├── types/                 # TypeScript type definitions
└── contexts/              # React contexts
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm run test:rewards
```

## 🔧 Development

### Branch Workflow

- `master` - Production branch (deployed to main domain)
- `develop` - Testing branch (deployed to preview URL)
- `feature/*` - Feature branches (created from `develop`)

**Always test on `develop` before merging to `master`!**

### Code Style

- We use ESLint for linting
- Follow the existing patterns in the codebase
- Keep components modular (aim for <200 lines per file)
- Use ShadCN components where possible

## 📖 Documentation

Additional documentation can be found in the `docs/` folder:

- Development guidelines
- Error handling patterns
- Admin modularization

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🔒 Security

For security vulnerabilities, please see [SECURITY.md](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ShadCN/UI](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Vercel](https://vercel.com/) for hosting and deployment
