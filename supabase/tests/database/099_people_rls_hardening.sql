-- Nüva People — RLS hardening verification (pgTAP)
-- Verifica que el endurecimiento de políticas SELECT de la migración
-- 20261025120000_people_payroll_owner_admin_select_hardening.sql esté aplicado.
-- Estas pruebas solo inspeccionan el catálogo; no escriben datos ni aplican migraciones.
-- Ejecutar con pg_prove contra una base de datos con el esquema aplicado.
begin;
select plan(26);

-- 1. RLS habilitado en las 10 tablas endurecidas
select ok(
  (select count(*) from pg_class c
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relkind='r'
     and c.relname in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and c.relrowsecurity) = 10,
  'RLS habilitado en las 10 tablas de Nüva People endurecidas'
);

-- 2. Ninguna de las 10 tablas tiene política SELECT con USING (true) (lectura sin restricción)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and p.cmd='SELECT'
     and p.qual='true') = 0,
  'Ninguna tabla sensible tiene política SELECT USING (true)'
);

-- 3. Las políticas SELECT de las 10 tablas usan private.has_business_role (owner/admin), no private.is_business_member
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%'
     and p.qual like '%owner%'
     and p.qual like '%admin%') = 10,
  'Las 10 tablas tienen política SELECT con has_business_role(owner,admin)'
);

-- 4. Las políticas SELECT de las 10 tablas NO usan private.is_business_member (lectura de cualquier miembro)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and p.cmd='SELECT'
     and p.qual like '%private.is_business_member%') = 0,
  'Ninguna tabla sensible usa is_business_member para SELECT tras endurecimiento'
);

-- 5. private.has_business_role existe y es ejecutable por authenticated
select ok(has_function_privilege('authenticated','private.has_business_role(uuid,uuid,member_role[])'::regprocedure,'EXECUTE'),'authenticated puede ejecutar private.has_business_role');

-- 6. private.is_business_member existe (helper de miembro, se conserva para tablas no sensibles)
select ok(to_regprocedure('private.is_business_member(uuid,uuid)') is not null,'private.is_business_member existe');

-- 7. people_legal_parameters mantiene SELECT para authenticated (datos de referencia públicos)
select ok(has_function_privilege('authenticated','public.people_legal_parameters'::regclass,'SELECT'),'authenticated puede leer people_legal_parameters');

-- 8. people_afp_rates mantiene SELECT para authenticated (datos de referencia públicos)
select ok(has_function_privilege('authenticated','public.people_afp_rates'::regclass,'SELECT'),'authenticated puede leer people_afp_rates');

-- 9. Las tablas de nómina sensibles no tienen política INSERT/UPDATE/DELETE con is_business_member (escritura restringida)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and p.cmd in ('INSERT','UPDATE','DELETE','ALL')
     and p.qual like '%private.is_business_member%') = 0,
  'Políticas de escritura de tablas sensibles no usan is_business_member'
);

-- 10. Tabla people_payroll_inputs ya endurecida (migración previa 20260922171000)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename='people_payroll_inputs'
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%') >= 1,
  'people_payroll_inputs tiene política SELECT con has_business_role'
);

-- 11. people_karin_cases restringido a owner/admin (migración previa 20260922150000)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename='people_karin_cases'
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%') >= 1,
  'people_karin_cases tiene política SELECT restringida a owner/admin'
);

-- 12. people_vacation_balances restringido a owner/admin para SELECT (migración previa)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename='people_vacation_balances'
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%') >= 1,
  'people_vacation_balances tiene política SELECT restringida a owner/admin'
);

-- 13. people_terminations restringido a owner/admin para SELECT (migración previa)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename='people_terminations'
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%') >= 1,
  'people_terminations tiene política SELECT restringida a owner/admin'
);

-- 14. people_payroll_liquidations restringido a owner/admin para SELECT (migración previa)
select ok(
  (select count(*) from pg_policies p
   where p.schemaname='public'
     and p.tablename='people_payroll_liquidations'
     and p.cmd='SELECT'
     and p.qual like '%private.has_business_role%') >= 1,
  'people_payroll_liquidations tiene política SELECT restringida a owner/admin'
);

-- 15. Todas las 10 tablas tienen columnas business_id para aislamiento multiempresa
select ok(
  (select count(*) from information_schema.columns c
   where c.table_schema='public'
     and c.table_name in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and c.column_name='business_id') = 10,
  'Las 10 tablas tienen columna business_id para aislamiento de tenant'
);

-- 16. Todas las 10 tablas tienen FK business_id -> businesses(id)
select ok(
  (select count(*) from pg_constraint con
   join pg_class t on t.oid=con.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public'
     and t.relname in (
       'people_employees','people_contracts','people_documents','people_payroll_items',
       'people_payroll_periods','people_payroll_postings','people_payroll_runs',
       'people_payroll_liquidations','people_lre_rows','people_absences'
     )
     and con.contype='f'
     and pg_get_constraintdef(con.oid) like '%businesses(id)%') = 10,
  'Las 10 tablas tienen FK business_id que referencia businesses(id)'
);

-- 17. personas_legales no tiene políticas de escritura para authenticated (protegido)
select ok(
  not has_function_privilege('authenticated','public.people_legal_parameters'::regclass,'INSERT'),
  'authenticated no puede insertar en people_legal_parameters'
);

-- 18. private es un esquema existente con las funciones de autorización
select ok(exists(select 1 from pg_namespace where nspname='private'),'Esquema private existe');

-- 19. No existen vistas públicas que expongan tablas people_* sin security_invoker
select ok(
  (select count(*) from pg_views v
   where v.schemaname='public'
     and v.viewname like 'people_%') = 0,
  'No hay vistas públicas people_* que puedan saltear RLS'
);

-- 20. Precondición: tabla people_employees existe en el esquema público
select ok(to_regclass('public.people_employees') is not null,'Tabla people_employees existe en el esquema');

-- 21. (positiva) La RPC people_dashboard_summary(uuid) existe en el esquema public
select ok(to_regprocedure('public.people_dashboard_summary(uuid)') is not null,'Función people_dashboard_summary(uuid) existe en public');

-- 22. (positiva) La RPC es SECURITY DEFINER (ejecuta con privilegios del dueño, no del llamador)
select ok(
  (select prosecdef from pg_proc where oid = 'public.people_dashboard_summary(uuid)'::regprocedure),
  'people_dashboard_summary es SECURITY DEFINER'
);

-- 23. (positiva) La RPC devuelve jsonb (estructura esperada por el frontend)
select ok(
  pg_get_function_result('public.people_dashboard_summary(uuid)'::regprocedure) = 'jsonb',
  'people_dashboard_summary devuelve jsonb'
);

-- 24. (positiva) La RPC usa search_path = public, private (evita secuestro de nombres no calificados)
select ok(
  (select proconfig[1] from pg_proc where oid = 'public.people_dashboard_summary(uuid)'::regprocedure) like 'search_path=%public%private%',
  'people_dashboard_summary usa search_path = public, private'
);

-- 25. (positiva) authenticated tiene EXECUTE sobre la RPC
select ok(has_function_privilege('authenticated','public.people_dashboard_summary(uuid)'::regprocedure,'EXECUTE'),'authenticated puede ejecutar people_dashboard_summary');

-- 26. (negativa) PUBLIC no tiene EXECUTE sobre la RPC (revocado explícitamente; por defecto PostgreSQL lo concede a PUBLIC)
select ok(
  not has_function_privilege('PUBLIC','public.people_dashboard_summary(uuid)'::regprocedure,'EXECUTE'),
  'PUBLIC no tiene EXECUTE sobre people_dashboard_summary'
);

select * from finish();
rollback;
