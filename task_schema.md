# Tasks Table Schema

Complete database schema for the `tasks` table - use this for Excel template preparation.

## Table Structure (31 columns)

```sql
-- Table: tasks
-- 31 columns total

-- Core Identity
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
template_code         text UNIQUE NOT NULL
title                 text NOT NULL
description          text

-- Classification & Priority
category             task_category_type NOT NULL
  -- enum values: onboarding, development, design, marketing, business, testing, deployment, milestone
priority             task_priority_type NOT NULL DEFAULT 'medium'
  -- enum values: low, medium, high, urgent
difficulty_level     integer

-- Gamification & Rewards
xp_reward            integer CHECK (xp_reward >= 0)
points_reward        integer CHECK (points_reward >= 0)
bonus_xp             integer CHECK (bonus_xp >= 0)
bonus_points         integer CHECK (bonus_points >= 0)

-- Review & Validation System
requires_peer_review boolean DEFAULT false
peer_review_criteria jsonb
review_count_required integer DEFAULT 1
auto_validate        boolean DEFAULT false

-- Assignment Logic
auto_assign          boolean DEFAULT false
prerequisites        text[] -- array of template codes
max_assignments      integer

-- Content & Instructions
detailed_instructions text
learning_objectives   text[]
expected_deliverables text
validation_criteria   text

-- Resources & References
reference_links      text[]
file_attachments     text[]

-- Metadata & Organization
tags                 text[]
estimated_hours      integer
is_milestone         boolean DEFAULT false
achievement_id       uuid REFERENCES achievements(id)
metadata            jsonb

-- Audit Trail
created_by_user_id   uuid REFERENCES auth.users(id)
created_at          timestamp with time zone DEFAULT now()
updated_at          timestamp with time zone DEFAULT now()
is_active           boolean DEFAULT true
```

## Enum Definitions

```sql
-- Custom enum types used by tasks table
CREATE TYPE task_category_type AS ENUM (
    'onboarding',
    'development',
    'design',
    'marketing',
    'business',
    'testing',
    'deployment',
    'milestone'
);

CREATE TYPE task_priority_type AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);
```

## Constraints Summary

- **PRIMARY KEY**: `tasks_pkey` (id)
- **UNIQUE**: `tasks_template_code_key` (template_code)
- **FOREIGN KEYS**:
  - `achievement_id` → `achievements(id)`
  - `created_by_user_id` → `auth.users(id)`
- **CHECK constraints**: 6 total on reward fields (xp_reward, points_reward, bonus_xp, bonus_points >= 0)

## Excel Template Notes

For Excel import preparation:

### Required Fields

- `template_code` (must be unique)
- `title`
- `category` (must match enum values)

### Array Fields (use comma-separated values in Excel)

- `prerequisites` - comma-separated template codes
- `learning_objectives` - comma-separated text
- `reference_links` - comma-separated URLs
- `file_attachments` - comma-separated file paths
- `tags` - comma-separated tags

### JSON Fields (use JSON string format in Excel)

- `peer_review_criteria` - JSON object
- `metadata` - JSON object

### Boolean Fields (use TRUE/FALSE in Excel)

- `requires_peer_review`
- `auto_validate`
- `auto_assign`
- `is_milestone`
- `is_active`

### Auto-Generated Fields (exclude from Excel template)

- `id` (UUID generated automatically)
- `created_at` (timestamp generated automatically)
- `updated_at` (timestamp generated automatically)
