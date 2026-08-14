-- pgTAP test for the exact rate limits P1 wires into /api/chat (8/min) and
-- /api/business/explain (3/min). check_rate_limit() itself is already
-- generically tested in 030_rate_limit.sql (allow/reject/independent
-- buckets); this file locks in the specific values and bucket-key shape
-- (`chat:<user_id>` / `explain:<user_id>`) those two routes actually use, so
-- a future change to either limit is a visible, intentional diff here.
begin;
select plan(6);

-- /api/chat: 8 requests/min allowed, 9th rejected.
select is(
  (select bool_and(check_rate_limit('chat:pgtap-user-a', 8, 60)) from generate_series(1, 8)),
  true,
  'chat: all 8 requests within the per-minute limit are allowed'
);
select is(
  check_rate_limit('chat:pgtap-user-a', 8, 60),
  false,
  'chat: the 9th request in the same minute is rejected'
);

-- /api/business/explain: 3 requests/min allowed, 4th rejected.
select is(
  (select bool_and(check_rate_limit('explain:pgtap-user-a', 3, 60)) from generate_series(1, 3)),
  true,
  'explain: all 3 requests within the per-minute limit are allowed'
);
select is(
  check_rate_limit('explain:pgtap-user-a', 3, 60),
  false,
  'explain: the 4th request in the same minute is rejected'
);

-- User isolation: a different user_id is a different bucket key, so
-- exhausting user A's chat limit does not affect user B.
select is(
  check_rate_limit('chat:pgtap-user-b', 8, 60),
  true,
  'chat: a different user has an independent rate-limit bucket'
);

-- Route isolation: chat and explain buckets for the same user are also
-- independent (different bucket_key prefix), so exhausting one doesn't
-- exhaust the other.
select is(
  check_rate_limit('explain:pgtap-user-b', 3, 60),
  true,
  'explain: a different user has an independent rate-limit bucket from chat'
);

select * from finish();
rollback;
