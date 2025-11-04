# 🚀 Migration Plan: Activity Type Tracking (Option B - Simple & Clean)

**Date:** November 4, 2025  
**Approach:** Single source of truth (transactions table)  
**Estimated Effort:** 3-4 hours total  
**Risk Level:** 🟢 LOW (minimal changes, additive only)

---

## 📋 Core Concept

### Current State

```sql
users:
  individual_points INTEGER  -- Actually stores ALL points
  total_xp INTEGER           -- Stores ALL XP

transactions:
  points_change INTEGER
  xp_change INTEGER
  type ENUM (...)            -- Has 'meeting', 'task', 'validation', etc.
```

### New State (SIMPLE!)

```sql
users:
  total_points INTEGER       -- Renamed from individual_points
  total_xp INTEGER           -- Unchanged

transactions:
  points_change INTEGER
  xp_change INTEGER
  type ENUM (...)
  activity_type VARCHAR(20)  -- NEW: 'individual' or 'team'
```

**Key Insight:** We ONLY need breakdown in transaction history. Everywhere else shows totals!

---

## 🎯 Where Breakdown is Actually Needed

### Need Activity Type (10% of use cases)

1. 📊 **Transaction History Page** - "Earned 50 team points from Task X"
2. 📈 **User Profile Stats** - "500 individual + 300 team = 800 total" (optional)

### Only Need Totals (90% of use cases)

1. 💰 **Wallet** - `total_points` for purchasing
2. 🏆 **Leaderboard** - `total_xp`, `total_points`
3. 👥 **Team Stats** - `SUM(members.total_points)`
4. 📱 **Dashboard** - All cards show totals
5. 🎯 **Task Rewards** - Show total amounts

**No overengineering - we aggregate only when we need the breakdown!**

---

## 🗄️ Part 1: Database Changes (30-45 mins)

### 1.1 Users Table - Rename Column

**Current:**

```sql
users:
  individual_points INTEGER DEFAULT 0
  total_xp INTEGER DEFAULT 0
```

**After:**

```sql
users:
  total_points INTEGER DEFAULT 0  -- Renamed from individual_points
  total_xp INTEGER DEFAULT 0      -- Unchanged
```

**Migration:**

```sql
-- Simple rename
ALTER TABLE users
  RENAME COLUMN individual_points TO total_points;

-- No data loss, instant operation!
```

**Why Rename?**

- Semantic clarity: It's the total, not just individual
- Matches our new model where totals are cached
- All existing code that reads `individual_points` will need updating anyway

---

### 1.2 Transactions Table - Add Column

**Current Schema:**

```sql
transactions:
  id UUID PRIMARY KEY
  user_id UUID REFERENCES auth.users
  team_id UUID (nullable)
  task_id UUID (nullable)
  achievement_id UUID (nullable)
  revenue_stream_id UUID (nullable)
  type transaction_type  -- ENUM: 'meeting', 'task', 'validation', 'team_cost', etc.
  points_type VARCHAR (nullable) -- Sometimes has 'individual'
  points_change INTEGER
  xp_change INTEGER
  description TEXT
  created_at TIMESTAMP
```

**Add:**

```sql
-- Step 1: Add column (nullable first)
ALTER TABLE transactions
  ADD COLUMN activity_type VARCHAR(20);

-- Step 2: Populate from existing data
UPDATE transactions
SET activity_type = CASE
  -- If points_type already set, use it
  WHEN points_type = 'individual' THEN 'individual'
  WHEN points_type = 'team' THEN 'team'
  -- If team_id exists, it's team activity
  WHEN team_id IS NOT NULL THEN 'team'
  -- Default to individual for historical data
  ELSE 'individual'
END;

-- Step 3: Make NOT NULL and add constraint
ALTER TABLE transactions
  ALTER COLUMN activity_type SET NOT NULL,
  ADD CONSTRAINT check_activity_type
    CHECK (activity_type IN ('individual', 'team'));

-- Step 4: Add index for performance
CREATE INDEX idx_transactions_activity_type
  ON transactions(user_id, activity_type);
```

**Data Impact:**

- Current: 12 transactions (5 meetings, 3 tasks, 2 team_costs, 2 validations)
- All will get `activity_type = 'individual'` (correct based on current data)
- No data loss

---

### 1.3 Task Progress Table - Add Column

**Current Schema:**

```sql
task_progress:
  id UUID PRIMARY KEY
  user_id UUID
  team_id UUID (nullable)
  task_id UUID
  context task_context_type  -- ENUM: 'individual', 'team'
  status task_status_type
  ... (other fields)
```

**Add:**

```sql
-- Step 1: Add column (nullable first)
ALTER TABLE task_progress
  ADD COLUMN activity_type VARCHAR(20);

-- Step 2: Populate from existing context field
UPDATE task_progress
SET activity_type = CASE
  WHEN context = 'individual' THEN 'individual'
  WHEN context = 'team' THEN 'team'
  ELSE 'individual'
END;

-- Step 3: Make NOT NULL and add constraint
ALTER TABLE task_progress
  ALTER COLUMN activity_type SET NOT NULL,
  ADD CONSTRAINT check_task_activity_type
    CHECK (activity_type IN ('individual', 'team'));
```

**Data Impact:**

- Current: 53 task_progress records
- Can derive from existing `context` field (already correct!)
- No data loss

---

## 💻 Part 2: Database Functions (1-1.5 hours)

### 2.1 Functions That Award Points (NEED UPDATES)

Let me analyze ALL functions that create transactions or update user points:

#### ✅ Function 1: `complete_individual_task`

**Current Code:**

```sql
-- Awards points
UPDATE users
SET
  individual_points = individual_points + v_points_reward,
  total_xp = total_xp + v_xp_reward
WHERE id = v_user_id;

-- Creates transaction
INSERT INTO transactions (
  user_id, task_id, type, points_change,
  points_type, xp_change, description
)
VALUES (
  v_user_id, v_task_id, 'task', v_points_reward,
  'individual', v_xp_reward, 'Completed individual task: ' || v_task_title
);
```

**Updated Code:**

```sql
-- Awards points (UPDATE COLUMN NAME)
UPDATE users
SET
  total_points = total_points + v_points_reward,  -- Changed from individual_points
  total_xp = total_xp + v_xp_reward
WHERE id = v_user_id;

-- Creates transaction (ADD ACTIVITY_TYPE)
INSERT INTO transactions (
  user_id, task_id, type, points_change,
  points_type, xp_change, description,
  activity_type  -- NEW
)
VALUES (
  v_user_id, v_task_id, 'task', v_points_reward,
  'individual', v_xp_reward, 'Completed individual task: ' || v_task_title,
  'individual'  -- NEW
);
```

**Changes:**

1. `individual_points` → `total_points` (1 line change)
2. Add `activity_type` to INSERT (2 line changes)

---

#### ✅ Function 2: `complete_client_meeting` (2 versions exist!)

**Version A: `complete_client_meeting`**

```sql
-- Current
UPDATE users
SET
  total_xp = total_xp + 50,
  individual_points = individual_points + 25  -- Change to total_points
WHERE id = v_meeting.responsible_user_id;

INSERT INTO transactions (
  user_id, type, xp_change, points_change, description, metadata
) VALUES (
  v_meeting.responsible_user_id, 'meeting', 50, 25,
  'Completed client meeting with ' || v_meeting.client_name,
  jsonb_build_object('meeting_id', p_meeting_id, 'client_name', v_meeting.client_name)
);
```

**Updated:**

```sql
UPDATE users
SET
  total_xp = total_xp + 50,
  total_points = total_points + 25  -- Changed
WHERE id = v_meeting.responsible_user_id;

INSERT INTO transactions (
  user_id, type, xp_change, points_change, description, metadata,
  activity_type  -- NEW
) VALUES (
  v_meeting.responsible_user_id, 'meeting', 50, 25,
  'Completed client meeting with ' || v_meeting.client_name,
  jsonb_build_object('meeting_id', p_meeting_id, 'client_name', v_meeting.client_name),
  'individual'  -- NEW
);
```

**Version B: `complete_meeting`** (shorter version)

- Same changes needed

---

#### 🔮 Function 3: `complete_team_task` (DOESN'T EXIST YET)

**Need to Create:**

```sql
CREATE OR REPLACE FUNCTION complete_team_task(
  p_progress_id UUID,
  p_submission_data JSONB DEFAULT NULL,
  p_submission_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_task_id UUID;
  v_team_id UUID;
  v_points_reward INTEGER;
  v_xp_reward INTEGER;
  v_task_title TEXT;
BEGIN
  -- Get task progress details
  SELECT
    tp.assigned_to_user_id,  -- The person who completed it
    tp.task_id,
    tp.team_id,
    t.base_points_reward,
    t.base_xp_reward,
    t.title
  INTO
    v_user_id, v_task_id, v_team_id,
    v_points_reward, v_xp_reward, v_task_title
  FROM task_progress tp
  JOIN tasks t ON tp.task_id = t.id
  WHERE tp.id = p_progress_id;

  -- Validation
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Task progress not found');
  END IF;

  -- Mark task as completed
  UPDATE task_progress
  SET
    status = 'completed',
    completed_at = NOW(),
    submission_data = COALESCE(p_submission_data, submission_data),
    submission_notes = COALESCE(p_submission_notes, submission_notes),
    points_awarded = v_points_reward,
    updated_at = NOW()
  WHERE id = p_progress_id;

  -- Award TEAM points to completer ONLY
  UPDATE users
  SET
    total_points = total_points + v_points_reward,
    total_xp = total_xp + v_xp_reward,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Create transaction record with activity_type = 'team'
  INSERT INTO transactions (
    user_id, team_id, task_id, type,
    points_change, xp_change, description,
    activity_type,  -- KEY FIELD
    created_at
  )
  VALUES (
    v_user_id, v_team_id, v_task_id, 'task',
    v_points_reward, v_xp_reward,
    'Completed team task: ' || v_task_title,
    'team',  -- This is what makes it team points!
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Team task completed',
    'points_awarded', v_points_reward,
    'xp_awarded', v_xp_reward,
    'activity_type', 'team'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note:** This is a NEW function - separate task from migration!

---

### 2.2 Other Functions to Check

#### ❓ Peer Review - Does reviewer get points?

**Current:** Need to investigate if there's a function for peer review rewards

**Action:** Check later - not blocking for migration

---

#### ❓ Weekly Reports - Do they award points?

**Current:** Need to investigate

**Action:** Check later - not blocking for migration

---

#### ❓ Achievements - Split rewards?

**Current:** No function exists yet for achievement completion

**Action:** Create later - separate from this migration

---

#### ❓ Penalties/Strikes - Deduct points?

**Current:** No function exists for applying penalties to points

**Action:** Create later if needed

---

## 🧑‍💻 Part 3: Code Changes (1 hour)

### 3.1 TypeScript Types (CRITICAL - 5 mins)

**Action:** Regenerate after database migration

```powershell
# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

**Expected Changes:**

```typescript
// Before:
users: {
  Row: {
    individual_points: number;
    total_xp: number;
  }
}

// After:
users: {
  Row: {
    total_points: number;  // Renamed!
    total_xp: number;
  }
}

transactions: {
  Row: {
    ...
    activity_type: string;  // NEW!
  }
}

task_progress: {
  Row: {
    ...
    activity_type: string;  // NEW!
  }
}
```

---

### 3.2 Find/Replace: `individual_points` → `total_points` (10 mins)

**Files That Reference `individual_points`:**

1. ✅ `src/app/dashboard/transaction-history/page.tsx` - Line 137
2. ✅ `src/app/dashboard/my-journey/page.tsx` - Line 332, 346, 442
3. ✅ `src/data/dashboard-data.ts` - Likely has queries
4. ✅ `src/lib/database.ts` - getUserProfile function

**Action:** Search and replace `individual_points` → `total_points`

```powershell
# VSCode: Ctrl+Shift+H
# Search: individual_points
# Replace: total_points
# Files to include: src/**/*.ts, src/**/*.tsx
```

**Verify:**

- No TypeScript errors after replacement
- All queries still work
- UI still displays correctly

---

### 3.3 Update Transaction History UI (30 mins)

**File:** `src/app/dashboard/transaction-history/page.tsx`

**Current:** Shows transaction type only
**New:** Show activity_type badge

**Changes:**

```typescript
// Add activity_type to interface
interface Transaction {
  id: string;
  type: string;
  activity_type: string; // NEW
  xp_change: number;
  points_change: number;
  description: string | null;
  created_at: string | null;
  team?: { name: string } | null;
  achievement?: { name: string } | null;
  revenue_stream?: { product_name: string } | null;
}

// Update query to select activity_type
const data = await supabase
  .from("transactions")
  .select("*, activity_type") // Add this
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(50);

// Add activity type badge in UI
<div className="flex items-center gap-2">
  {/* Existing XP/Points badges */}
  {transaction.xp_change !== 0 && <Badge>...</Badge>}

  {/* NEW: Activity Type Badge */}
  <Badge
    variant="outline"
    className={
      transaction.activity_type === "team"
        ? "border-blue-500 text-blue-500"
        : "border-green-500 text-green-500"
    }
  >
    {transaction.activity_type === "team" ? "👥 Team" : "👤 Individual"}
  </Badge>

  {/* Existing type badge */}
  <Badge variant="outline">{transaction.type.replace("_", " ")}</Badge>
</div>;
```

**Optional Enhancement:** Add filter to show only individual or team transactions

---

### 3.4 Update Summary Cards (5 mins)

**File:** `src/app/dashboard/transaction-history/page.tsx`

**Current:**

```typescript
<div className="text-2xl font-bold">{user?.individual_points || 0}</div>
```

**Update:**

```typescript
<div className="text-2xl font-bold">
  {user?.total_points || 0} {/* Changed */}
</div>
```

---

### 3.5 Optional: Add Breakdown View (30 mins - OPTIONAL)

**Show individual vs team breakdown in transaction history:**

```typescript
// Calculate breakdown
const individualPoints = transactions
  .filter((t) => t.activity_type === "individual")
  .reduce((sum, t) => sum + t.points_change, 0);

const teamPoints = transactions
  .filter((t) => t.activity_type === "team")
  .reduce((sum, t) => sum + t.points_change, 0);

// Display in UI
<Card>
  <CardHeader>
    <CardTitle>Points Breakdown</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">👤 Individual:</span>
        <span className="font-semibold">{individualPoints}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">👥 Team:</span>
        <span className="font-semibold">{teamPoints}</span>
      </div>
      <div className="flex justify-between border-t pt-2">
        <span className="font-semibold">Total:</span>
        <span className="font-semibold">{user?.total_points}</span>
      </div>
    </div>
  </CardContent>
</Card>;
```

---

## 🧪 Part 4: Testing Plan (1 hour)

### 4.1 Database Testing (15 mins)

**Test 1: Column Rename**

```sql
-- Verify rename worked
SELECT total_points, total_xp FROM users LIMIT 5;

-- Should return rows without error
```

**Test 2: Activity Type Constraints**

```sql
-- Should succeed
INSERT INTO transactions (..., activity_type) VALUES (..., 'individual');
INSERT INTO transactions (..., activity_type) VALUES (..., 'team');

-- Should fail
INSERT INTO transactions (..., activity_type) VALUES (..., 'invalid');
-- ERROR: check constraint violated
```

**Test 3: Data Integrity**

```sql
-- Check all transactions have activity_type
SELECT COUNT(*) FROM transactions WHERE activity_type IS NULL;
-- Should return 0

-- Check all task_progress have activity_type
SELECT COUNT(*) FROM task_progress WHERE activity_type IS NULL;
-- Should return 0
```

---

### 4.2 Function Testing (15 mins)

**Test 1: Complete Individual Task**

```sql
-- Create test task progress
INSERT INTO task_progress (context, task_id, user_id, status, activity_type)
VALUES ('individual', 'task-uuid', 'user-uuid', 'in_progress', 'individual');

-- Complete task
SELECT complete_individual_task('progress-uuid', '{"test": true}'::jsonb);

-- Verify
SELECT total_points, total_xp FROM users WHERE id = 'user-uuid';
SELECT * FROM transactions WHERE user_id = 'user-uuid' ORDER BY created_at DESC LIMIT 1;
-- Should have activity_type = 'individual'
```

**Test 2: Complete Meeting**

```sql
-- Complete meeting
SELECT complete_client_meeting('meeting-uuid');

-- Verify transaction
SELECT activity_type FROM transactions WHERE type = 'meeting' ORDER BY created_at DESC LIMIT 1;
-- Should have activity_type = 'individual'
```

---

### 4.3 UI Testing (15 mins)

**Test 1: Transaction History**

- ✅ Navigate to `/dashboard/transaction-history`
- ✅ Verify "Total Credits" shows correct value (renamed field)
- ✅ Verify transactions list displays
- ✅ Verify activity_type badge shows for each transaction
- ✅ Verify "👤 Individual" or "👥 Team" badge appears

**Test 2: User Profile**

- ✅ Navigate to `/dashboard/my-journey`
- ✅ Verify total points display correctly
- ✅ Verify total XP displays correctly
- ✅ No console errors

**Test 3: Leaderboard**

- ✅ Navigate to `/dashboard/leaderboard`
- ✅ Verify points/XP columns display correctly
- ✅ No console errors

**Test 4: Dashboard**

- ✅ Navigate to `/dashboard`
- ✅ Verify all stat cards show correct values
- ✅ No console errors

---

### 4.4 Integration Testing (15 mins)

**Test 1: Complete an Individual Task**

- ✅ Go to My Journey
- ✅ Start a task
- ✅ Complete the task
- ✅ Verify points/XP increase
- ✅ Check transaction history - should show activity_type = 'individual'

**Test 2: Complete a Meeting**

- ✅ Create a client meeting
- ✅ Mark as completed
- ✅ Verify points/XP increase
- ✅ Check transaction history - should show activity_type = 'individual'

**Test 3: User Registration**

- ✅ Register new user (or use test account)
- ✅ Verify `total_points = 0` and `total_xp = 0`
- ✅ No errors in RLS policies

---

## 📊 Part 5: Functionality Checklist

### ✅ Peer Review

**Status:** Not implemented yet (no points awarded currently)

**Current:** Peer review exists but doesn't award points to reviewer
**Impact:** No changes needed
**Future:** When we add reviewer rewards, include `activity_type`

---

### ✅ Individual Tasks

**Status:** Fully implemented

**Current:** `complete_individual_task` function exists
**Changes Needed:**

1. Update `individual_points` → `total_points`
2. Add `activity_type = 'individual'` to transaction

**Testing:**

- ✅ Assign individual task
- ✅ Start task
- ✅ Complete task
- ✅ Verify points awarded
- ✅ Verify transaction has `activity_type = 'individual'`

---

### ✅ Team Tasks

**Status:** Partially implemented (no completion function yet)

**Current:**

- `assign_team_task_to_progress` exists
- No completion function yet

**Changes Needed:**

1. Create `complete_team_task` function (NEW - separate task)
2. Add `activity_type = 'team'` to transactions

**Testing (Future):**

- 🔮 Assign team task
- 🔮 Start team task
- 🔮 Complete team task
- 🔮 Verify points awarded with `activity_type = 'team'`

---

### ✅ Team Task Assigning

**Status:** Implemented

**Current:** `assign_team_task_to_progress` function exists
**Changes Needed:** None! Assignment doesn't award points
**Testing:**

- ✅ Create team
- ✅ Assign task to team
- ✅ Assign task to specific team member
- ✅ Verify task_progress has correct `activity_type = 'team'`

---

### ✅ Client Meetings

**Status:** Fully implemented

**Current:** 2 functions exist (`complete_client_meeting`, `complete_meeting`)
**Changes Needed:**

1. Update `individual_points` → `total_points`
2. Add `activity_type = 'individual'` to transaction

**Testing:**

- ✅ Create meeting
- ✅ Mark as completed
- ✅ Verify points/XP awarded
- ✅ Verify transaction has `activity_type = 'individual'`

---

### ✅ Data Reading/Displaying

**Status:** Multiple locations

**Current:** Many components read `individual_points`, `total_xp`
**Changes Needed:**

1. Update all `individual_points` → `total_points` references
2. Regenerate TypeScript types
3. Update transaction history to show `activity_type`

**Testing:**

- ✅ Dashboard - all stat cards
- ✅ My Journey - user profile stats
- ✅ Leaderboard - points/XP columns
- ✅ Transaction History - list with activity badges
- ✅ Team Journey - team stats (aggregated from members)

---

### ✅ Achievements

**Status:** Not implemented (no completion function)

**Current:** Achievement tracking exists, but no reward distribution
**Impact:** No changes needed for this migration
**Future:** When implementing achievement rewards:

```sql
-- For team achievements, split rewards:
CREATE FUNCTION complete_achievement(p_achievement_id UUID, p_team_id UUID)
AS $$
  -- Calculate reward per team member
  v_reward_per_member := v_total_reward / v_team_member_count;

  -- Award to each member with activity_type = 'team'
  INSERT INTO transactions (user_id, activity_type, ...)
  SELECT member.user_id, 'team', ...
  FROM team_members WHERE team_id = p_team_id;
$$;
```

---

### ✅ Weekly Reports

**Status:** Implemented but no points system

**Current:** Weekly reports exist but don't award/deduct points
**Impact:** No changes needed
**Future:** If adding points for weekly reports, include `activity_type`

---

### ✅ Strikes/Penalties

**Status:** Tracking exists but no points deduction

**Current:** Strikes can have `xp_penalty` and `points_penalty` fields
**Impact:** No changes needed for this migration
**Future:** If implementing penalties:

```sql
-- Deduct points with negative amount
INSERT INTO transactions (
  user_id, points_change, xp_change,
  activity_type, type, description
) VALUES (
  user_id, -50, -25,
  'individual', 'penalty', 'Strike for missing meeting'
);

UPDATE users
SET
  total_points = total_points - 50,
  total_xp = total_xp - 25
WHERE id = user_id;
```

---

## 📦 Part 6: Implementation Order

### Phase 1: Database Migration (30 mins)

```sql
-- Run in Supabase SQL Editor

-- 1. Rename column
ALTER TABLE users RENAME COLUMN individual_points TO total_points;

-- 2. Add activity_type to transactions
ALTER TABLE transactions ADD COLUMN activity_type VARCHAR(20);
UPDATE transactions SET activity_type =
  CASE WHEN team_id IS NOT NULL THEN 'team' ELSE 'individual' END;
ALTER TABLE transactions
  ALTER COLUMN activity_type SET NOT NULL,
  ADD CONSTRAINT check_activity_type CHECK (activity_type IN ('individual', 'team'));
CREATE INDEX idx_transactions_activity_type ON transactions(user_id, activity_type);

-- 3. Add activity_type to task_progress
ALTER TABLE task_progress ADD COLUMN activity_type VARCHAR(20);
UPDATE task_progress SET activity_type =
  CASE WHEN context = 'team' THEN 'team' ELSE 'individual' END;
ALTER TABLE task_progress
  ALTER COLUMN activity_type SET NOT NULL,
  ADD CONSTRAINT check_task_activity_type CHECK (activity_type IN ('individual', 'team'));
```

---

### Phase 2: Update Functions (1 hour)

**Priority 1: complete_individual_task**

```sql
CREATE OR REPLACE FUNCTION complete_individual_task(
  p_progress_id UUID,
  p_submission_data JSONB DEFAULT NULL,
  p_submission_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_task_id UUID;
  v_context task_context_type;
  v_points_reward INTEGER;
  v_xp_reward INTEGER;
  v_task_title TEXT;
BEGIN
  SELECT
    tp.user_id, tp.task_id, tp.context,
    t.base_points_reward, t.base_xp_reward, t.title
  INTO v_user_id, v_task_id, v_context, v_points_reward, v_xp_reward, v_task_title
  FROM task_progress tp
  JOIN tasks t ON tp.task_id = t.id
  WHERE tp.id = p_progress_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Task progress not found');
  END IF;

  IF v_context != 'individual' THEN
    RETURN json_build_object('success', false, 'message', 'Not an individual task');
  END IF;

  -- Mark task as completed
  UPDATE task_progress
  SET status = 'completed', completed_at = NOW(),
      submission_data = COALESCE(p_submission_data, submission_data),
      submission_notes = COALESCE(p_submission_notes, submission_notes),
      points_awarded = v_points_reward, updated_at = NOW()
  WHERE id = p_progress_id;

  -- Award individual points
  UPDATE users
  SET total_points = total_points + v_points_reward,  -- CHANGED
      total_xp = total_xp + v_xp_reward, updated_at = NOW()
  WHERE id = v_user_id;

  -- Create transaction with activity_type
  INSERT INTO transactions (
    user_id, task_id, type, points_change, points_type, xp_change,
    description, activity_type, created_at  -- ADDED activity_type
  ) VALUES (
    v_user_id, v_task_id, 'task', v_points_reward, 'individual', v_xp_reward,
    'Completed individual task: ' || v_task_title, 'individual', NOW()  -- ADDED 'individual'
  );

  RETURN json_build_object('success', true, 'message', 'Individual task completed',
    'points_awarded', v_points_reward, 'xp_awarded', v_xp_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Priority 2: complete_client_meeting** (similar changes)

---

### Phase 3: Code Updates (1 hour)

**Step 1: Regenerate Types**

```powershell
npx supabase gen types typescript --project-id <your-id> > src/types/database.ts
```

**Step 2: Find/Replace**

- Search: `individual_points`
- Replace: `total_points`
- Files: `src/**/*.{ts,tsx}`

**Step 3: Update Transaction History UI**

- Add `activity_type` to query
- Add activity badge to display

---

### Phase 4: Testing (1 hour)

1. ✅ Run database tests
2. ✅ Test individual task completion
3. ✅ Test meeting completion
4. ✅ Test transaction history UI
5. ✅ Test all pages (dashboard, leaderboard, profile)

---

## ⚠️ Risk Assessment

### 🟢 LOW Risks (Well Mitigated)

**Risk 1: TypeScript Compilation**

- **Issue:** Code references old `individual_points` field
- **Mitigation:** Regenerate types immediately, then find/replace
- **Impact:** 30 mins to fix all references

**Risk 2: Old Transactions Without activity_type**

- **Issue:** Migration must populate all existing rows
- **Mitigation:** UPDATE statement sets defaults before constraint
- **Impact:** Zero data loss

**Risk 3: UI Display Issues**

- **Issue:** Renamed field might break displays
- **Mitigation:** Find/replace all references, test each page
- **Impact:** All totals still work correctly

---

## 🔄 Rollback Plan

### If Migration Fails

```sql
-- Step 1: Rename back
ALTER TABLE users RENAME COLUMN total_points TO individual_points;

-- Step 2: Drop activity_type columns
ALTER TABLE transactions DROP COLUMN activity_type;
ALTER TABLE task_progress DROP COLUMN activity_type;

-- Step 3: Revert functions (restore from backup)
-- Re-deploy old versions of complete_individual_task, complete_client_meeting

-- Step 4: Revert code
git checkout src/types/database.ts
# Undo find/replace changes
```

---

## ✅ Success Criteria

### Database

- ✅ Column renamed without data loss
- ✅ activity_type populated for all rows
- ✅ Constraints enforced
- ✅ Indexes created

### Functions

- ✅ Updated to use total_points
- ✅ Insert activity_type in transactions
- ✅ Tests pass

### Code

- ✅ TypeScript compiles
- ✅ All pages load without errors
- ✅ Transaction history shows activity badges
- ✅ Points/XP display correctly everywhere

### User Experience

- ✅ Task completion works
- ✅ Meeting completion works
- ✅ Transaction history shows breakdown
- ✅ Leaderboard displays correctly

---

## 📊 Effort Summary

| Phase              | Time          | Complexity      |
| ------------------ | ------------- | --------------- |
| Database Migration | 30 mins       | 🟢 Easy         |
| Update Functions   | 1 hour        | 🟡 Medium       |
| Code Updates       | 1 hour        | 🟢 Easy         |
| Testing            | 1 hour        | 🟢 Easy         |
| **TOTAL**          | **3-4 hours** | 🟢 **Low Risk** |

---

## 🎯 Next Steps After This Migration

### Phase 5: Team Task Completion (Separate PR - 2-3 hours)

- Create `complete_team_task` function
- Update team journey UI to call new function
- Test team points attribution with `activity_type = 'team'`

### Phase 6: Achievement Rewards (Separate PR - 3-4 hours)

- Create `complete_achievement` function
- Implement even split for team achievements
- Test reward distribution

### Phase 7: UI Enhancements (Separate PR - 2-3 hours)

- Add breakdown display to user profile
- Add filters to transaction history (individual/team)
- Add tooltips showing contribution sources

---

## 🚀 Let's Get Started!

**Ready to proceed?**

1. ✅ Review this plan thoroughly
2. ✅ Backup production database
3. ✅ Confirm no active users during migration
4. ✅ Run Phase 1 (database migration)
5. ✅ Verify data integrity
6. ✅ Run Phase 2 (update functions)
7. ✅ Run Phase 3 (code updates)
8. ✅ Run Phase 4 (testing)
9. ✅ Deploy to production

**Estimated Total Time:** 3-4 hours

**Risk Level:** 🟢 LOW

**Breaking Changes:** ❌ NONE

**Let's do this! 💪🚀**
