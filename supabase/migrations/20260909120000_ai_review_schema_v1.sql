-- 20260909120000_ai_review_schema_v1.sql
-- AI task reviewer: audit/queue table + settings row. Purely additive.

create table public.ai_task_reviews (
  id                  uuid primary key default gen_random_uuid(),
  progress_id         uuid not null references public.task_progress(id) on delete cascade,
  task_id             uuid not null references public.tasks(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  attempt             int  not null,
  status              text not null default 'queued'
                      check (status in ('queued','running','approved','rejected','failed')),
  stage               text
                      check (stage is null or stage in ('fetching_evidence','reading_files','checking_links','reviewing','finalizing')),
  submission_snapshot jsonb not null,
  criteria_snapshot   jsonb not null,
  evidence_manifest   jsonb,
  model               text,
  prompt_version      text,
  decision            boolean,
  confidence          numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  criteria_results    jsonb,
  feedback            text,
  reject_reason       text
                      check (reject_reason is null or reject_reason in ('criteria','low_confidence','unverifiable_evidence','technical_failure')),
  raw_response        jsonb,
  input_tokens        int,
  output_tokens       int,
  cost_usd            numeric(8,5),
  error               text,
  decided_by          text
                      check (decided_by is null or decided_by in ('ai','system','auto_approve_fallback','self_check')),
  retry_count         int  not null default 0,
  claimed_at          timestamptz,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.ai_task_reviews is
  'One row per AI review attempt of an individual (My Journey) task submission. Audit log + job queue + attempt counter.';

create unique index ai_task_reviews_progress_attempt_uq
  on public.ai_task_reviews (progress_id, attempt);
create index ai_task_reviews_queue_idx
  on public.ai_task_reviews (status, created_at)
  where status in ('queued','running');
create index ai_task_reviews_user_idx
  on public.ai_task_reviews (user_id, created_at desc);

-- reuse the existing updated_at helper (not modified)
create trigger ai_task_reviews_set_updated_at
  before update on public.ai_task_reviews
  for each row execute function public.update_updated_at_column();

alter table public.ai_task_reviews enable row level security;
-- Deliberately no policies for anon/authenticated (deny-all).
-- Students read via get_ai_review_status_v1; admins via API route + service role.

insert into public.platform_settings (key, value)
values ('ai_review', jsonb_build_object(
  'enabled', true,
  'mode', 'ai',
  'model', 'gpt-5.4',
  'confidence_threshold', 0.75,
  'worker_url', 'https://REPLACE-WITH-DEPLOYMENT-DOMAIN/api/ai-review/run',
  'max_file_mb', 25,
  'max_pdf_pages', 40,
  'attempt_flag_threshold', 5
))
on conflict (key) do nothing;
