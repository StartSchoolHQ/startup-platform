-- 20260909120200_ai_review_cron_v1.sql
-- Re-kicks AI review jobs the worker never finished; finalises as 'failed' after 3 retries.
select cron.schedule(
  'ai-review-requeue-stale',
  '* * * * *',
  $$ select public.ai_review_requeue_stale_v1(); $$
);
