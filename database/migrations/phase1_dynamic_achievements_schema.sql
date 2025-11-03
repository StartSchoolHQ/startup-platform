-- Migration: Phase 1 - Dynamic Achievements System Schema Updates
-- Date: 2025-11-03
-- Description: Clean up old system, update achievements table, link tasks to achievements, create user achievement tracking

-- ========================================
-- 1.1 Clean Up Old System
-- ========================================

-- Remove old foreign key constraint that was causing issues
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_tx_achievement_task_id;

-- Drop the unused achievement_tasks table (confirmed empty)
DROP TABLE IF EXISTS achievement_tasks CASCADE;

-- ========================================
-- 1.2 Update Achievements Table Structure
-- ========================================

-- Ensure achievements table has all required fields for dynamic achievement cards
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS icon text DEFAULT 'trophy';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS credits_reward integer DEFAULT 0;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'purple';

-- Update existing columns if they have different names
DO $$
BEGIN
    -- Rename 'name' to match if it exists, otherwise add it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'name') THEN
        -- Column exists, ensure it's not null
        ALTER TABLE achievements ALTER COLUMN name SET NOT NULL;
    ELSE
        -- Add name column if it doesn't exist
        ALTER TABLE achievements ADD COLUMN name text NOT NULL DEFAULT 'Unnamed Achievement';
    END IF;
END
$$;

-- ========================================
-- 1.3 Link Tasks to Achievements
-- ========================================

-- Add achievement_id foreign key to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS achievement_id uuid REFERENCES achievements(id);

-- Create index for better performance on achievement filtering
CREATE INDEX IF NOT EXISTS idx_tasks_achievement_id ON tasks(achievement_id);

-- ========================================
-- 1.4 User Achievement Tracking
-- ========================================

-- Create user_achievements table to track which achievements users have completed
CREATE TABLE IF NOT EXISTS user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    completed_at timestamp with time zone DEFAULT now(),
    xp_awarded integer DEFAULT 0,
    credits_awarded integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- ========================================
-- 1.5 Update Transaction System
-- ========================================

-- Add 'achievement' to transaction_type enum if it doesn't exist
DO $$
BEGIN
    -- Check if 'achievement' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'achievement' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'achievement';
    END IF;
END
$$;

-- ========================================
-- 1.6 Clean Up and Optimize
-- ========================================

-- Update existing achievements table to ensure consistency
UPDATE achievements SET 
    icon = COALESCE(icon, 'trophy'),
    xp_reward = COALESCE(xp_reward, 0),
    credits_reward = COALESCE(credits_reward, 0),
    color_theme = COALESCE(color_theme, 'purple'),
    active = COALESCE(active, true);

-- Add comments for documentation
COMMENT ON TABLE achievements IS 'Achievement categories that group related tasks together';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have completed and rewards awarded';
COMMENT ON COLUMN tasks.achievement_id IS 'Links tasks to their parent achievement category';

-- Ensure RLS is enabled for new tables (matching existing pattern)
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_achievements (users can only see their own achievements)
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
    
    -- Create policy for viewing own achievements
    CREATE POLICY "Users can view own achievements" ON user_achievements
        FOR SELECT USING (auth.uid() = user_id);
        
    -- Policy for inserting achievements (system can insert)
    DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
    CREATE POLICY "System can insert achievements" ON user_achievements
        FOR INSERT WITH CHECK (true);
END
$$;