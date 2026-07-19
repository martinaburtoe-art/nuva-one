-- pgTAP test for public.check_rate_limit(), the generic fixed-window rate
-- limiter added this session and used by /api/billing/checkout and the
-- WhatsApp AI auto-reply endpoint.
begin;
select plan(5);

-- Use a bucket key unique to this test run so it can't collide with a real
-- key or with the previous test file (rolled back anyway, but explicit is
-- better than relying only on the rollback).
select is(
  check_rate_limit('pgtap-test-bucket-1', 3, 3600),
  true,
  'request 1 of 3 is allowed'
);
select is(
  check_rate_limit('pgtap-test-bucket-1', 3, 3600),
  true,
  'request 2 of 3 is allowed'
);
select is(
  check_rate_limit('pgtap-test-bucket-1', 3, 3600),
  true,
  'request 3 of 3 is allowed'
);
select is(
  check_rate_limit('pgtap-test-bucket-1', 3, 3600),
  false,
  'request 4 (over the limit of 3) is rejected'
);

-- A different bucket key is an entirely independent counter -- confirms
-- keys don't leak into each other's counts.
select is(
  check_rate_limit('pgtap-test-bucket-2', 1, 3600),
  true,
  'a different bucket key has its own independent counter'
);

select * from finish();
rollback;
