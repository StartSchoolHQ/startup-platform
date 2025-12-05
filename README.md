# StartSchool Platform

A comprehensive startup accelerator platform built with Next.js and Supabase, designed to track team progress, manage achievements, and facilitate peer learning in a gamified environment.

## 🚀 Features

### Authentication & User Management

- **Secure Authentication**: Supabase SSR authentication with protected routes
- **Profile Management**: Complete user profiles with avatar upload and account settings
- **Role-based Access**: User and admin roles with appropriate permissions

### Dashboard & Analytics

- **Personalized Dashboard**: Real-time progress tracking and team insights
- **Loading States**: Smooth page transitions with skeleton loaders
- **Responsive Design**: Mobile-first design with shadcn/ui components

### Team Collaboration

- **Team Management**: Create and manage teams with role assignments
- **Progress Tracking**: Monitor individual and team achievements
- **Peer Review System**: Collaborative feedback and validation system
- **Real-time Notifications**: Unified notification system for invitations, peer reviews, and achievements

### Gamification

- **Achievement System**: Track tasks, credits, and XP progression
- **Leaderboard**: Competitive rankings and performance metrics
- **Revenue Tracking**: Monitor startup revenue streams and growth
- **Automated Strike System**: Automated tracking of missed weekly reports with strike penalties

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4
- **TypeScript**: Full type safety with database types
- **State Management**: React Context API
- **Automation**: Supabase Edge Functions + pg_cron for scheduled tasks
- **HTTP Client**: pg_net for database-driven HTTP requests

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/eliassbaranovs/startup-platform.git
   cd startup-platform
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Set up the database schema (see `/src/types/database.ts` for structure)
   - Configure Row Level Security (RLS) policies
   - Create storage bucket for avatar uploads

## 🚀 Getting Started

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Login or Create Account**
   - Use the authentication flow to create your profile
   - Complete profile setup with name and avatar
   - Access the dashboard and explore features

## 📁 Project Structure

src/
├── app/ # Next.js App Router
│ ├── dashboard/ # Protected dashboard pages
│ ├── login/ # Authentication pages
│ ├── account/ # User account management
│ └── profile/setup/ # Profile completion flow
├── components/ # Reusable UI components
│ ├── ui/ # shadcn/ui base components
│ ├── dashboard/ # Dashboard-specific components
│ └── ... # Feature-specific components
├── contexts/ # React Context providers
├── lib/ # Utility functions and configurations
│ └── supabase/ # Supabase client configurations
└── types/ # TypeScript type definitions

src/
├── app/ # Next.js App Router
│ ├── dashboard/ # Protected dashboard pages
│ ├── login/ # Authentication pages
│ ├── account/ # User account management
│ └── profile/setup/ # Profile completion flow
├── components/ # Reusable UI components
│ ├── ui/ # shadcn/ui base components
│ ├── dashboard/ # Dashboard-specific components
│ └── ... # Feature-specific components
├── contexts/ # React Context providers
├── lib/ # Utility functions and configurations
│ └── supabase/ # Supabase client configurations
└── types/ # TypeScript type definitions

src/
├── app/ # Next.js App Router
│ ├── dashboard/ # Protected dashboard pages
│ ├── login/ # Authentication pages
│ ├── account/ # User account management
│ └── profile/setup/ # Profile completion flow
├── components/ # Reusable UI components
│ ├── ui/ # shadcn/ui base components
│ ├── dashboard/ # Dashboard-specific components
│ └── ... # Feature-specific components
├── contexts/ # React Context providers
├── lib/ # Utility functions and configurations
│ └── supabase/ # Supabase client configurations
└── types/ # TypeScript type definitions

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🗃️ Database Schema

The platform uses a comprehensive PostgreSQL schema including:

- **Users**: User profiles and authentication data
- **Teams**: Team management and membership
- **Tasks & Achievements**: Gamification system
- **Transactions**: Credit and XP tracking
- **Revenue Streams**: Startup revenue monitoring

## 🔐 Authentication Flow

1. **Login**: Email/password authentication via Supabase
2. **Profile Setup**: Complete profile with name and avatar
3. **Dashboard Access**: Redirect to personalized dashboard
4. **Route Protection**: Middleware ensures authenticated access

## 🎨 UI Components

Built with a modern design system:

- **shadcn/ui**: Accessible and customizable components
- **Radix UI**: Primitive components for complex interactions
- **Tailwind CSS**: Utility-first styling approach
- **Lucide Icons**: Consistent iconography

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform supporting Node.js:

- Netlify
- Railway
- Digital Ocean App Platform

## 🔔 Notification System

The platform features a comprehensive real-time notification system:

### Notification Types

- **Team Invitations**: New invitations, acceptances, and declines
- **Peer Reviews**: Task approvals, rejections, and resubmissions with task names
- **Auto-decline Notifications**: Transparent feedback when invitations are auto-declined
- **Achievements**: Individual and team achievement completions

### Technical Implementation

- **Database Triggers**: Automatic notification creation via PostgreSQL triggers
- **Unified Architecture**: Persistent notifications table with legacy metadata support
- **Modern UI**: Shadcn-based NotificationCenter with Popover, ScrollArea, and Badge components
- **Smart Routing**: Context-aware navigation to relevant sections

### Features

- **Bell Icon**: Accessible notification center in sidebar header
- **Badge Indicators**: Unread notification count with visual feedback
- **Mark All Read**: Bulk notification management
- **Time Formatting**: User-friendly "X minutes ago" timestamps
- **Duplicate Prevention**: Intelligent deduplication to prevent spam

## 🤖 Automation System

### Weekly Report Strike System

The platform includes a fully automated system for tracking missed weekly reports:

- **Edge Function**: `weekly-strikes-automation` processes all teams and generates strikes for missed reports
- **Scheduled Execution**: Runs every Monday at 9:00 AM UTC via pg_cron
- **Database Functions**:
  - `check_missed_weekly_reports`: Identifies teams with missing reports
  - `get_team_strikes`: Retrieves team strike history
  - `update_team_strikes_count`: Maintains strike counters
- **Frontend Integration**: Dynamic loading and display of strikes in team journey pages

### Manual Testing

```bash
# Test the Edge Function manually
curl -X POST https://ksoohvygoysofvtqdumz.supabase.co/functions/v1/weekly-strikes-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"manual_test": true}'
```

### Monitoring

- Check cron job status: `SELECT * FROM cron.job WHERE jobname = 'weekly-strikes-automation';`
- View execution history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
- Monitor HTTP responses: `SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;`

## 📈 Features Roadmap

- [x] Automated weekly report strike system
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app companion
- [ ] Integration with external tools
- [ ] Email notifications for strikes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary to StartSchool.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.
