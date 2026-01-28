# Contributing to StartSchool Platform

First off, thanks for taking the time to contribute! 🎉

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details** (browser, OS, Node version)

### 💡 Suggesting Features

Feature requests are welcome! Please:

- Check if the feature has already been suggested
- Provide a clear use case for the feature
- Describe the expected behavior

### 🔧 Pull Requests

1. **Fork the repo** and create your branch from `develop`
2. **Follow the branch naming convention:**
   - `feature/your-feature-name` for new features
   - `fix/issue-description` for bug fixes
   - `docs/what-you-documented` for documentation
3. **Write clear commit messages**
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Submit PR to `develop`** (never directly to `master`)

## Development Setup

### Prerequisites

- Node.js 18.17+
- npm or pnpm
- A Supabase project for development

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/startup-platform.git
cd startup-platform

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/startup-platform.git

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your Supabase credentials

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Code Style Guidelines

### General

- Keep files under 200-300 lines where possible
- Write modular, reusable code
- Use TypeScript types properly (no `any` unless absolutely necessary)
- Follow existing patterns in the codebase

### Components

- Use ShadCN components from `src/components/ui/`
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks

### File Organization

```
src/
├── components/
│   ├── feature-name/     # Feature-specific components
│   │   ├── component.tsx
│   │   └── sub-component.tsx
│   └── ui/               # ShadCN base components
├── hooks/                # Custom hooks
├── lib/                  # Utilities and configurations
└── types/                # TypeScript types
```

### Naming Conventions

- **Components:** PascalCase (`UserProfile.tsx`)
- **Hooks:** camelCase with `use` prefix (`useUserData.ts`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Types:** PascalCase (`UserProfile`, `TaskStatus`)

### Database Interactions

- Always use Supabase RPC functions for complex operations
- Check database constraints before making changes
- Use the MCP tools to verify database state

## Branch Workflow

```
master (production)
    └── develop (testing)
            └── feature/your-feature
```

1. Create feature branch from `develop`
2. Make your changes
3. Test locally and on Vercel preview
4. Submit PR to `develop`
5. After review and testing, changes get merged to `master`

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add team invitation email notifications
fix: resolve task submission race condition
docs: update README with new env variables
refactor: extract task row into separate component
```

Prefixes:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Questions?

Feel free to open an issue for any questions about contributing!
