# Daily Git Workflow

## 🎯 Your Branches

- **`master`** → Production (live site)
- **`develop`** → Testing (preview site)

---

## 📅 Daily Routine

### Starting Work

```bash
# Get latest code
git checkout develop
git pull origin develop
```

### Making Changes

#### Option 1: Small Changes (Quick Fixes)

```bash
# Work directly on develop
git checkout develop

# Make your changes, then:
git add .
git commit -m "Fix: describe what you fixed"
git push origin develop
```

→ Check Vercel preview URL to test

#### Option 2: Big Features (New Functionality)

```bash
# Create feature branch
git checkout develop
git checkout -b feature/your-feature-name

# Make changes, then:
git add .
git commit -m "Add: describe what you added"
git push origin feature/your-feature-name

# Merge to develop when ready
git checkout develop
git merge feature/your-feature-name
git push origin develop
```

→ Check Vercel preview URL to test

### Deploying to Production

```bash
# Only when develop works perfectly!
# Stay on develop - push directly to master
git push origin develop:master
```

→ Goes live to users

**Why this way?** No branch switching = no OneDrive conflicts, faster, cleaner!

---

## ⚠️ Before Pushing to Master

**ALWAYS DO THIS FIRST:**

1. ✅ Test on develop preview URL
2. ✅ Take Supabase backup (if database changes)
3. ✅ Check no errors in console
4. ✅ Test on mobile (if UI changes)

---

## 🚨 Quick Fixes

### Committed to wrong branch?

```bash
# Undo last commit (keeps your changes)
git reset --soft HEAD~1

# Switch to correct branch
git checkout develop

# Commit again
git add .
git commit -m "Your message"
git push
```

### Need to go back?

```bash
# See recent commits
git log --oneline

# Go back to specific commit
git reset --hard <commit-hash>
git push --force origin develop
```

### Messed up develop?

```bash
# Reset develop to match master
git checkout develop
git reset --hard origin/master
git push --force origin develop
```

### Git says "index.lock file exists" or operations fail?

```bash
# Remove the lock file (safe to do)
Remove-Item -Force .git/index.lock

# Or on Mac/Linux:
rm -f .git/index.lock

# Then retry your git command
```

**What causes this:**

- VS Code or another process crashed during git operation
- OneDrive sync interfered with git
- Multiple git commands ran at same time

**It's safe to delete** - just a lock file to prevent simultaneous git operations

### Files keep getting deleted during branch switch?

```bash
# This is usually OneDrive cloud-only files (placeholders)
# Best solution: Don't switch branches!

# Deploy to master WITHOUT switching:
git push origin develop:master

# If you must switch branches:
1. Right-click project folder → "Always keep on this device"
2. Restore deleted files: git restore <file-path>
3. Use the push command above instead next time
```

---

## 📝 Commit Message Format

```bash
git commit -m "Fix: bug with login button"
git commit -m "Add: new profile settings page"
git commit -m "Update: improve dashboard performance"
git commit -m "Remove: unused API endpoint"
```

---

## 🎓 Remember

- **Never push directly to master** (test on develop first)
- **Commit often** (small commits = easier to fix mistakes)
- **Clear messages** (you'll thank yourself later)
- **Backup before DB changes** (Pro plan = manual backups available)

---

## 🔗 URLs

- Production: Your main domain
- Develop preview: `startup-platform-git-develop-yourname.vercel.app`
- Feature preview: `startup-platform-git-feature-name-yourname.vercel.app`
