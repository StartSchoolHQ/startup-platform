-- Startie: record OpenAI's cache_write_tokens per reply so "0 cached" can be
-- diagnosed (0 writes + 0 reads = request never qualified for caching).
alter table public.assistant_messages add column cache_write_tokens integer;

create or replace function public.get_assistant_admin_stats_v1()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  select case when not public.is_admin_v1() then null else jsonb_build_object(
    'messages_today', (
      select count(*) from public.assistant_messages
      where role = 'user'
        and created_at >= (date_trunc('day', now() at time zone 'utc')) at time zone 'utc'),
    'cost_month_usd', (
      select coalesce(sum(cost_usd), 0) from public.assistant_messages
      where role = 'assistant' and created_at >= date_trunc('month', now())),
    'cache_hit_rate', (
      select case when coalesce(sum(input_tokens), 0) = 0 then null
        else round(sum(cached_tokens)::numeric / sum(input_tokens), 3) end
      from public.assistant_messages where role = 'assistant'),
    'cache_write_tokens', (
      select coalesce(sum(cache_write_tokens), 0) from public.assistant_messages where role = 'assistant'),
    'avg_output_tokens', (
      select round(avg(output_tokens)) from public.assistant_messages
      where role = 'assistant'),
    'threads_total', (select count(*) from public.assistant_threads),
    'flagged_total', (
      select count(*) from public.assistant_messages where role = 'system_note')
  ) end;
$$;
