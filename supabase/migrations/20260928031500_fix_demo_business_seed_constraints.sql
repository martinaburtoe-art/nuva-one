-- Keep the demo seed aligned with current domain constraints.
-- The base seed function is created by the preceding demo-business migration.
do $fn$
declare
  ddl text;
begin
  select pg_get_functiondef('public.create_demo_business_for_current_user()'::regprocedure)
    into ddl;

  ddl := replace(
    ddl,
    $$'customer','Los Carrera 789'$$,
    $$'won','Los Carrera 789'$$
  );

  ddl := replace(
    ddl,
    $$v_business,null,'task','Revisar productos bajo punto de reposición.'$$,
    $$v_business,v_c1,'task','Revisar productos bajo punto de reposición.'$$
  );

  execute ddl;
end
$fn$;
