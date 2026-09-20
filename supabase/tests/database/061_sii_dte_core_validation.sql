begin;
select plan(5);

select is(
  (public.validate_sii_dte_core(33, 1001, date '2026-09-20', 100000, 0, 19000, 119000)->>'valid')::boolean,
  true,
  'valid taxable invoice passes core DTE validation'
);

select is(
  (public.validate_sii_dte_core(33, 1001, date '2026-09-20', 100000, 0, 18000, 118000)->>'valid')::boolean,
  false,
  'invoice with inconsistent VAT fails validation'
);

select is(
  (public.validate_sii_dte_core(33, 0, date '2026-09-20', 100000, 0, 19000, 119000)->>'valid')::boolean,
  false,
  'non-positive folio fails validation'
);

select is(
  (public.validate_sii_dte_core(999, 1001, date '2026-09-20', 100000, 0, 19000, 119000)->>'valid')::boolean,
  false,
  'unsupported document type fails validation'
);

select is(
  (public.validate_sii_dte_core(33, 1001, date '2026-09-20', 100000, 0, 19000, 120000)->>'valid')::boolean,
  false,
  'inconsistent total fails validation'
);

select * from finish();
rollback;
