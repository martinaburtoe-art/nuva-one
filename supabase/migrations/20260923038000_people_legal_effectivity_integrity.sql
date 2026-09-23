-- Nüva People — vigencias legales sin solapamientos.
-- Corrige la parametrización 2026-2028 de jornada ordinaria y protege nuevas cargas.

update public.people_legal_parameters set effective_to='2026-04-25'
where id='604ed187-d84c-4c8d-88f4-8dc17f236645';

update public.people_legal_parameters set effective_to='2028-04-25'
where id='b7628925-643e-43bf-9efe-ee1516ee6509';

create or replace function public.people_validate_legal_parameter_overlap()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if exists (
   select 1 from public.people_legal_parameters p
   where p.id<>new.id and p.country_code=new.country_code and p.parameter_key=new.parameter_key
     and new.effective_from <= coalesce(p.effective_to,'9999-12-31'::date)
     and p.effective_from <= coalesce(new.effective_to,'9999-12-31'::date)
 ) then raise exception 'Parámetro legal con vigencia solapada para %, %',new.country_code,new.parameter_key; end if;
 return new;
end $$;
drop trigger if exists trg_people_legal_parameter_overlap on public.people_legal_parameters;
create trigger trg_people_legal_parameter_overlap before insert or update on public.people_legal_parameters for each row execute function public.people_validate_legal_parameter_overlap();

create or replace function public.people_validate_afp_overlap()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if exists (
   select 1 from public.people_afp_rates p
   where p.id<>new.id and p.country_code=new.country_code and lower(p.afp_name)=lower(new.afp_name)
     and new.effective_from <= coalesce(p.effective_to,'9999-12-31'::date)
     and p.effective_from <= coalesce(new.effective_to,'9999-12-31'::date)
 ) then raise exception 'Tasa AFP con vigencia solapada para %',new.afp_name; end if;
 return new;
end $$;
drop trigger if exists trg_people_afp_overlap on public.people_afp_rates;
create trigger trg_people_afp_overlap before insert or update on public.people_afp_rates for each row execute function public.people_validate_afp_overlap();