create index if not exists idx_ai_usage_events_user_created_at on public.ai_usage_events (user_id, created_at desc);
