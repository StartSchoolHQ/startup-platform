# 🔄 **Recurring Tasks Implementation Plan**

## **📋 Current System Analysis**

**✅ Good News: Minimal Impact Required**

- The system **already treats tasks as templates** - this is perfect for recurring tasks
- **Lazy progress model** makes recurring implementation clean
- **Transaction/wallet history** preservation is already handled
- **Clean separation** between `tasks` (templates) and `task_progress` (instances)

## **🎯 Proposed Implementation Strategy**

### **Phase 1: Database Schema Addition**

Add minimal fields to existing `tasks` table:

```sql
-- Add to existing tasks table (no breaking changes)
ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN recurrence_pattern JSONB DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN recurrence_enabled BOOLEAN DEFAULT TRUE;
```

**Recurrence Pattern Structure:**

```json
{
  "type": "weekly|monthly|custom",
  "interval": 1,
  "day_of_week": 1, // For weekly (1=Monday, 7=Sunday)
  "day_of_month": 15, // For monthly
  "custom_cron": "0 9 * * 1" // For custom patterns
}
```

### **Phase 2: Add Iteration Tracking**

Add to `task_progress` table:

```sql
-- Add to existing task_progress table
ALTER TABLE task_progress ADD COLUMN iteration_number INTEGER DEFAULT 1;
ALTER TABLE task_progress ADD COLUMN recurrence_parent_id UUID REFERENCES task_progress(id);
```

### **Phase 3: Cron Function Implementation**

```sql
-- New database function for recurring task generation
CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS TABLE (
    tasks_created INTEGER,
    tasks_processed INTEGER
) AS $$
DECLARE
    recurring_task RECORD;
    team_record RECORD;
    new_progress_id UUID;
    tasks_created_count INTEGER := 0;
    tasks_processed_count INTEGER := 0;
BEGIN
    -- Loop through all active recurring tasks
    FOR recurring_task IN
        SELECT * FROM tasks
        WHERE is_recurring = true
        AND recurrence_enabled = true
        AND is_active = true
    LOOP
        tasks_processed_count := tasks_processed_count + 1;

        -- Check if it's time to create new iteration
        -- (Logic based on recurrence_pattern and last completion)

        -- Loop through active teams that should get this task
        FOR team_record IN
            SELECT DISTINCT t.id as team_id
            FROM teams t
            WHERE t.status = 'active'
            -- Add additional filtering if needed
        LOOP
            -- Check if team needs new iteration of this task
            IF should_create_new_iteration(recurring_task.id, team_record.team_id) THEN
                -- Get next iteration number
                WITH max_iteration AS (
                    SELECT COALESCE(MAX(iteration_number), 0) as max_iter
                    FROM task_progress
                    WHERE task_id = recurring_task.id
                    AND team_id = team_record.team_id
                )
                -- Create new task_progress entry
                INSERT INTO task_progress (
                    task_id,
                    team_id,
                    status,
                    context,
                    activity_type,
                    iteration_number,
                    assigned_to_user_id -- Reset to NULL (unassigned)
                )
                SELECT
                    recurring_task.id,
                    team_record.team_id,
                    'not_started',
                    'team',
                    recurring_task.activity_type,
                    (SELECT max_iter + 1 FROM max_iteration),
                    NULL -- Reset assignment
                RETURNING id INTO new_progress_id;

                tasks_created_count := tasks_created_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT tasks_created_count, tasks_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to determine if new iteration needed
CREATE OR REPLACE FUNCTION should_create_new_iteration(
    task_id_param UUID,
    team_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    task_config RECORD;
    last_completion TIMESTAMP;
    should_create BOOLEAN := FALSE;
BEGIN
    -- Get task recurrence configuration
    SELECT recurrence_pattern INTO task_config
    FROM tasks
    WHERE id = task_id_param;

    -- Get last completion for this team
    SELECT MAX(completed_at) INTO last_completion
    FROM task_progress
    WHERE task_id = task_id_param
    AND team_id = team_id_param
    AND status = 'approved';

    -- Logic to determine if new iteration needed
    -- Example for weekly: if last completion was > 7 days ago
    IF task_config.recurrence_pattern->>'type' = 'weekly' THEN
        IF last_completion IS NULL OR
           last_completion < (NOW() - INTERVAL '7 days') THEN
            should_create := TRUE;
        END IF;
    END IF;

    -- Add more recurrence type logic here

    RETURN should_create;
END;
$$ LANGUAGE plpgsql;
```

## **🎯 Frontend Integration (Zero Breaking Changes)**

### **Task Display Enhancement**

```typescript
// Add to TaskTableItem interface (optional fields)
export interface TaskTableItem {
  // ... existing fields
  isRecurring?: boolean;
  iterationNumber?: number;
  recurrenceInfo?: {
    type: "weekly" | "monthly" | "custom";
    interval: number;
    nextDue?: string;
  };
}
```

### **Visual Indicators**

```tsx
// In TasksTable component - add recurring indicator
{
  task.isRecurring && (
    <Badge variant="outline" className="ml-2">
      <Clock className="h-3 w-3 mr-1" />
      Week {task.iterationNumber}
    </Badge>
  );
}
```

## **🔧 Implementation Benefits**

### **✅ Preserves Existing Architecture**

- **No changes to core task system**
- **Template model works perfectly** - tasks remain reusable templates
- **Progress instances** handle individual completions
- **Transaction history** preserved automatically

### **✅ Clean Separation**

- **Recurring logic** isolated in database functions
- **UI changes** are minimal and additive
- **Cron system** handles automation without affecting app logic

### **✅ Flexible Patterns**

```json
// Weekly LinkedIn post
{
  "type": "weekly",
  "interval": 1,
  "day_of_week": 1
}

// Monthly report
{
  "type": "monthly",
  "interval": 1,
  "day_of_month": 1
}

// Custom: Every Tuesday and Friday
{
  "type": "custom",
  "custom_cron": "0 9 * * 2,5"
}
```

## **🚀 Rollout Strategy**

### **Phase 1: Schema (30 minutes)**

- Add recurring columns to `tasks` table
- Add iteration tracking to `task_progress`
- Zero downtime deployment

### **Phase 2: Admin Interface (1 hour)**

- Add recurring task creation UI
- Pattern configuration form
- Enable/disable recurring functionality

### **Phase 3: Cron Implementation (45 minutes)**

- Deploy database functions
- Set up cron job scheduling
- Add monitoring and logging

### **Phase 4: UI Enhancements (30 minutes)**

- Add recurring indicators
- Show iteration numbers
- Display next due dates

## **🔍 Risk Assessment**

### **🟢 Low Risk Areas**

- **Database Changes**: Additive only, no breaking changes
- **Template System**: Already perfect for this use case
- **Transaction History**: Automatically preserved
- **Lazy Progress**: Handles new instances seamlessly

### **🟡 Medium Risk Areas**

- **Cron Reliability**: Need proper error handling and monitoring
- **Performance**: Bulk task creation for many teams
- **Time Zones**: May need consideration for global teams

### **🔴 Mitigation Strategies**

- **Batch Processing**: Process recurring tasks in smaller batches
- **Error Handling**: Log failures, retry mechanisms
- **Performance Monitoring**: Track generation times
- **Manual Override**: Admin ability to disable/force recurrence

## **💡 Example Implementation**

**Weekly LinkedIn Post Task:**

```sql
-- Create recurring task template
INSERT INTO tasks (
  template_code,
  title,
  description,
  category,
  activity_type,
  base_xp_reward,
  base_points_reward,
  is_recurring,
  recurrence_pattern
) VALUES (
  'LINKEDIN_WEEKLY_POST',
  'Weekly LinkedIn Company Post',
  'Create and publish a professional LinkedIn post about company progress',
  'marketing',
  'team',
  50,
  25,
  true,
  '{"type": "weekly", "interval": 1, "day_of_week": 1}'::jsonb
);
```

**Result:**

- Every Monday, new `task_progress` entry created for each active team
- Previous completions remain in database (wallet history preserved)
- Assignment reset to NULL (team decides who does it each week)
- Iteration numbers track: Week 1, Week 2, Week 3, etc.

## **✅ Conclusion: Perfect Fit**

**The current architecture is IDEAL for recurring tasks:**

1. **Tasks as templates** ✅ - Already implemented
2. **Progress instances** ✅ - Already implemented
3. **Wallet history preservation** ✅ - Already implemented
4. **Lazy progress creation** ✅ - Already implemented
5. **Assignment flexibility** ✅ - Already implemented

**Implementation is straightforward with minimal risk and zero breaking changes.** The system was almost designed for this use case!

## **🎯 Next Steps**

1. **Review and approve** this implementation plan
2. **Start with Phase 1** - database schema additions
3. **Test thoroughly** in development environment
4. **Deploy incrementally** - one phase at a time
5. **Monitor performance** and user feedback

## **📊 Success Metrics**

- **Zero breaking changes** to existing functionality
- **Automatic recurring task generation** working reliably
- **Transaction history** fully preserved
- **User adoption** of recurring tasks feature
- **Performance impact** within acceptable limits
