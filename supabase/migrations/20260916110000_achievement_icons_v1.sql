-- Achievement icons v1
--
-- `achievements.icon` was NULL everywhere, so every open phase card showed
-- the same medal. It now holds a lucide icon name (kebab-case, lucide.dev);
-- the client maps it in src/lib/achievement-icons.ts and falls back to the
-- medal for anything unknown. Locked cards keep the padlock, finished cards
-- the tick. Data-only; no schema or function change.
--
-- Rollback: update public.achievements set icon = null where active = true;

update public.achievements a
   set icon = v.icon
  from (values
    -- My Journey phases
    ('individual', 'Know Yourself & Experiment', 'compass'),
    ('individual', 'Get Outside the Building',   'door-open'),
    ('individual', 'Become a Builder',           'hammer'),
    ('individual', 'Think Like a Founder',       'lightbulb'),
    ('individual', 'Founder Reading List',       'book-open'),
    ('individual', 'Recurring Tasks',            'repeat'),
    -- Team Journey
    ('team', 'Customer Acquisition',  'megaphone'),
    ('team', 'Product Foundation',    'blocks'),
    ('team', 'Idea Validation',       'flask-conical'),
    ('team', 'Recurring Tasks',       'repeat'),
    ('team', 'Team Growth',           'users'),
    ('team', 'Legal & Finance',       'scale'),
    ('team', 'Pitch & Presentation',  'presentation')
  ) as v(context, name, icon)
 where a.context::text = v.context
   and a.name = v.name
   and a.icon is null;
