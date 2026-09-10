-- My Journey categories + individual achievements (additive).
-- Rollback: enum values cannot be dropped; delete from achievements where context='individual' and name in (...) after removing the tasks that reference them.
ALTER TYPE public.task_category_type ADD VALUE IF NOT EXISTS 'founder-mindset';
ALTER TYPE public.task_category_type ADD VALUE IF NOT EXISTS 'reading';
ALTER TYPE public.task_category_type ADD VALUE IF NOT EXISTS 'customer-discovery';
ALTER TYPE public.task_category_type ADD VALUE IF NOT EXISTS 'building';
ALTER TYPE public.task_category_type ADD VALUE IF NOT EXISTS 'business-fundamentals';

INSERT INTO public.achievements (name, description, color_theme, sort_order, xp_reward, points_reward, context, active) VALUES
  ($mj$Make Your Profile$mj$, $mj$Know where you start: name your background and write an honest founder bio.$mj$, 'violet', 10, 25, 20, 'individual', true),
  ($mj$Know Yourself & Experiment$mj$, $mj$Build the founder mindset: reflect honestly, dig into problems you care about, and ship something small.$mj$, 'blue', 11, 100, 80, 'individual', true),
  ($mj$Get Outside the Building$mj$, $mj$Talk to real people: strangers, users, founders. Collect evidence, feedback and no's.$mj$, 'orange', 12, 150, 120, 'individual', true),
  ($mj$Become a Builder$mj$, $mj$Turn ideas into prototypes, put them in front of users, and find your first real user.$mj$, 'green', 13, 150, 120, 'individual', true),
  ($mj$Think Like a Founder$mj$, $mj$Reason about markets, metrics, advantages and money like a founder would.$mj$, 'rose', 14, 120, 96, 'individual', true),
  ($mj$Founder Reading List$mj$, $mj$The suggested books and essays behind the Startup Mindset track, each with a personal reflection.$mj$, 'indigo', 15, 100, 80, 'individual', true);
