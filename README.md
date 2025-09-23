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

### Gamification

- **Achievement System**: Track tasks, credits, and XP progression
- **Leaderboard**: Competitive rankings and performance metrics
- **Revenue Tracking**: Monitor startup revenue streams and growth

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4
- **TypeScript**: Full type safety with database types
- **State Management**: React Context API

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

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Protected dashboard pages
│   ├── login/            # Authentication pages
│   ├── account/          # User account management
│   └── profile/setup/    # Profile completion flow
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── dashboard/       # Dashboard-specific components
│   └── ...              # Feature-specific components
├── contexts/            # React Context providers
├── lib/                 # Utility functions and configurations
│   └── supabase/       # Supabase client configurations
└── types/              # TypeScript type definitions
```

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

## 📈 Features Roadmap

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app companion
- [ ] Integration with external tools
- [ ] Automated reporting system

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
