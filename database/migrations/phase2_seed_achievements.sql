-- Migration: Phase 2 - Seed Sample Achievements and Link Tasks
-- Date: 2025-11-03
-- Description: Create 4 sample achievements and assign existing tasks to achievements

-- ========================================
-- 2.1 Create 4 Sample Achievement Categories
-- ========================================

-- Insert sample achievements with rewards matching the UI design
INSERT INTO achievements (name, description, icon, xp_reward, credits_reward, color_theme, sort_order, active) VALUES
('Launch Achievements', 'Complete essential startup foundation tasks to get your venture off the ground', 'rocket', 1020, 680, 'purple', 1, true),
('Development Mastery', 'Master the technical development process and build your product', 'code2', 1200, 800, 'blue', 2, true), 
('Testing & Quality', 'Ensure your product meets quality standards through comprehensive testing', 'check-circle', 900, 600, 'green', 3, true),
('Business Growth', 'Scale and optimize your business for long-term success', 'trending-up', 1500, 1000, 'orange', 4, true);

-- ========================================
-- 2.2 Assign Current Tasks to Achievements
-- ========================================

-- Map existing tasks to achievements based on their categories
-- Launch Achievements: onboarding and business tasks
UPDATE tasks SET achievement_id = (
    SELECT id FROM achievements WHERE name = 'Launch Achievements'
) WHERE category IN ('onboarding', 'business');

-- Development Mastery: development and design tasks
UPDATE tasks SET achievement_id = (
    SELECT id FROM achievements WHERE name = 'Development Mastery'
) WHERE category IN ('development', 'design');

-- Testing & Quality: testing and deployment tasks
UPDATE tasks SET achievement_id = (
    SELECT id FROM achievements WHERE name = 'Testing & Quality'
) WHERE category IN ('testing', 'deployment');

-- Business Growth: marketing and milestone tasks
UPDATE tasks SET achievement_id = (
    SELECT id FROM achievements WHERE name = 'Business Growth'
) WHERE category IN ('marketing', 'milestone');

-- ========================================
-- 2.3 Handle Uncategorized Tasks
-- ========================================

-- Assign any remaining uncategorized tasks to Launch Achievements as default
UPDATE tasks SET achievement_id = (
    SELECT id FROM achievements WHERE name = 'Launch Achievements'
) WHERE achievement_id IS NULL;

-- ========================================
-- 2.4 Verification and Cleanup
-- ========================================

-- Ensure all tasks have an achievement assigned (no orphaned tasks)
-- This query should return 0 if successful
DO $$
DECLARE
    orphaned_count integer;
BEGIN
    SELECT COUNT(*) INTO orphaned_count FROM tasks WHERE achievement_id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Warning: % tasks still have no achievement assigned', orphaned_count;
    ELSE
        RAISE NOTICE 'Success: All tasks have been assigned to achievements';
    END IF;
END
$$;