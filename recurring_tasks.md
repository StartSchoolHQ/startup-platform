# 🔄 **Recurring Tasks Implementation Options**

## **📋 Current System Analysis**

**✅ Good News: Pre-Production = Low Risk**

- The system **already treats tasks as templates** - perfect for recurring tasks
- **Lazy progress model** makes recurring implementation clean
- **Transaction/wallet history** preservation is already handled
- **Clean separation** between `tasks` (templates) and `task_progress` (instances)
- **Not in production yet** - can implement changes safely

## **🚀 Option 1: Template-Based Recurring (RECOMMENDED)**

**Risk Level: VERY LOW** ✅

### **How It Works**

- Mark certain task templates as recurring with simple flag
- When team completes a recurring task → automatically create new instance
- No cron jobs, no scheduling complexity - just completion-triggered recreation

### **Implementation**

**Step 1: Add Simple Column (5 minutes)**

```sql
-- Just add one column to tasks table
ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;

-- Mark tasks as recurring
UPDATE tasks SET is_recurring = true WHERE template_code IN (
  'LINKEDIN_WEEKLY_POST',
  'WEEKLY_TEAM_CHECK_IN',
  'CLIENT_OUTREACH_WEEKLY'
);
```

**Step 2: Add Trigger Function (10 minutes)**

```sql
-- Simple trigger on task completion
CREATE OR REPLACE FUNCTION recreate_recurring_task()
RETURNS TRIGGER AS $$
BEGIN
  -- If completed task is recurring, create new instance for same team
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO task_progress (task_id, team_id, context, status, activity_type)
    SELECT t.id, NEW.team_id, 'team', 'not_started', 'team'
    FROM tasks t
    WHERE t.id = NEW.task_id AND t.is_recurring = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recreate_recurring
  AFTER UPDATE ON task_progress
  FOR EACH ROW
  EXECUTE FUNCTION recreate_recurring_task();
```

**Step 3: UI Indicator (15 minutes)**

```tsx
// In TasksTable component, add recurring badge
{
  task.isRecurring && (
    <Badge variant="outline" className="ml-2">
      <RotateCcw className="h-3 w-3 mr-1" />
      Recurring
    </Badge>
  );
}
```

### **Benefits**

✅ **Zero cron complexity** - no scheduling needed  
✅ **Natural flow** - new tasks appear when old ones are completed  
✅ **Self-regulating** - no accumulation of unfinished recurring tasks  
✅ **Immediate feedback** - teams see new task right after completion  
✅ **Easy to disable** - just set `is_recurring = false`  
✅ **30-minute implementation**

### **Example Flow**

1. Team completes "Weekly LinkedIn Post" ✅
2. Trigger automatically creates new "Weekly LinkedIn Post" for same team
3. New task appears in their task list immediately
4. Assignment reset to NULL - team decides who does it

---

## **🔄 Option 2: Simple Weekly Reset (EVEN SIMPLER)**

**Risk Level: MINIMAL** ✅

### **How It Works**

- Use existing achievement system for weekly recurring tasks
- Create "Weekly Tasks" achievement containing weekly tasks
- When achievement completed → simply reset all tasks to `not_started`
- No triggers, no complex logic - just simple reset

### **Implementation**

**Step 1: Create Weekly Achievement (3 minutes)**

```sql
-- Create weekly tasks achievement
INSERT INTO achievements (name, description, context, xp_reward, points_reward)
VALUES (
  'Weekly Team Tasks',
  'Complete all weekly recurring tasks',
  'team',
  100,
  50
);
```

**Step 2: Assign Tasks to Achievement (2 minutes)**

```sql
-- Link weekly tasks to achievement
UPDATE tasks SET achievement_id = (
  SELECT id FROM achievements WHERE name = 'Weekly Team Tasks'
) WHERE template_code IN (
  'LINKEDIN_WEEKLY_POST',
  'WEEKLY_TEAM_CHECK_IN',
  'CLIENT_OUTREACH_WEEKLY'
);
```

**Step 3: Manual Weekly Reset Button (10 minutes)**

```typescript
// Simple admin function - click every Monday
async function resetWeeklyTasks() {
  const weeklyAchievementId = "weekly-tasks-achievement-id";

  // Reset all weekly tasks for all teams
  await supabase
    .from("task_progress")
    .update({
      status: "not_started",
      assigned_to_user_id: null,
      started_at: null,
      completed_at: null,
    })
    .in(
      "task_id",
      (
        await supabase
          .from("tasks")
          .select("id")
          .eq("achievement_id", weeklyAchievementId)
      ).data?.map((t) => t.id) || []
    );
}
```

### **Benefits**

✅ **Extremely simple** - just reset task status weekly  
✅ **Uses existing systems** - no new database concepts  
✅ **Manual control** - admin decides when to reset  
✅ **Zero complexity** - no triggers or automation to break  
✅ **15-minute implementation**  
✅ **Easy to test** - just click button and see results

### **Example Flow**

1. Teams work on weekly tasks throughout the week
2. Some complete them, some don't
3. Monday morning: Admin clicks "Reset Weekly Tasks" button
4. All weekly tasks reset to "not_started" for all teams
5. Fresh week begins!

---

## **🤔 Comparison**

| Feature                 | Option 1: Template-Based | Option 2: Simple Weekly Reset |
| ----------------------- | ------------------------ | ----------------------------- |
| **Complexity**          | Very Simple              | Extremely Simple              |
| **Implementation Time** | 30 minutes               | 15 minutes                    |
| **Dependencies**        | Add one database column  | Existing achievement system   |
| **Task Flow**           | Individual recreation    | Manual weekly reset           |
| **Automation**          | Fully automatic          | Manual admin button           |
| **Flexibility**         | Each task independent    | All tasks reset together      |

---

## **💡 Recommendation**

**Choose Option 1 (Completion-Triggered)** if you want:

- Tasks to flow naturally as teams complete them
- Maximum flexibility (some teams might complete tasks at different times)
- Simple, predictable behavior

**Choose Option 2 (Achievement Reset)** if you want:

- Teams to complete weekly tasks as a coordinated set
- Bonus achievement rewards for completing all weekly tasks
- To leverage your existing achievement system

Both options are **safe, simple, and quick to implement** since you're pre-production!
