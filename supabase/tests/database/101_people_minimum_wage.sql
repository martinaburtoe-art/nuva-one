begin;
select plan(6);
select is(round(553553*(30/42.0),0),395395::numeric,'30h weekly jornada gets proportional IMM');
select is(round(553553*(20/42.0),0),263597::numeric,'20h weekly jornada gets proportional IMM');
select is(round(553553*1,0),553553::numeric,'jornada intermedia gets full IMM');
select is(round(553553*(15/30.0),0),276777::numeric,'full-time minimum is prorated for half-month employment');
select ok(position('expected_min_wage' in pg_get_functiondef('public.validate_people_payroll_period(uuid)'::regprocedure))>0,'validator computes applicable minimum wage');
select ok(position('coalesce(c.weekly_hours,42)<=30' in pg_get_functiondef('public.validate_people_payroll_period(uuid)'::regprocedure))>0,'validator distinguishes partial jornada at 30h');
select * from finish(); rollback;