-- Additive tenant-level industry profile persistence.
-- Existing business_industry and giro semantics remain unchanged.
-- No RLS policy, grant, trigger or existing business row is rewritten.

alter table public.businesses
  add column if not exists industry_profile text,
  add column if not exists industry_secondary_profiles text[] not null default '{}'::text[],
  add column if not exists industry_config jsonb not null default '{}'::jsonb,
  add column if not exists industry_config_version integer not null default 1,
  add column if not exists industry_profile_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_industry_profile_slug_check'
  ) then
    alter table public.businesses
      add constraint businesses_industry_profile_slug_check
      check (industry_profile is null or industry_profile in (
        'hardware_store',
        'neighborhood_grocery',
        'beverage_store',
        'produce_market',
        'butcher_fishmonger',
        'apparel_footwear',
        'books_stationery_electronics',
        'wholesale_distribution',
        'restaurant_cafe',
        'bakery_pastry',
        'manufacturing_workshop',
        'auto_repair_parts',
        'agriculture_agroinputs',
        'transport_logistics',
        'construction_contractor',
        'professional_services',
        'beauty_wellness',
        'veterinary_pet',
        'lodging_tourism',
        'equipment_rental',
        'education_fitness',
        'field_technical_service',
        'general_business'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_industry_secondary_profiles_check'
  ) then
    alter table public.businesses
      add constraint businesses_industry_secondary_profiles_check
      check (
        cardinality(industry_secondary_profiles) <= 3
        and array_position(industry_secondary_profiles, null) is null
        and (
          industry_profile is null
          or not (industry_profile = any(industry_secondary_profiles))
        )
        and industry_secondary_profiles <@ array[
          'hardware_store',
          'neighborhood_grocery',
          'beverage_store',
          'produce_market',
          'butcher_fishmonger',
          'apparel_footwear',
          'books_stationery_electronics',
          'wholesale_distribution',
          'restaurant_cafe',
          'bakery_pastry',
          'manufacturing_workshop',
          'auto_repair_parts',
          'agriculture_agroinputs',
          'transport_logistics',
          'construction_contractor',
          'professional_services',
          'beauty_wellness',
          'veterinary_pet',
          'lodging_tourism',
          'equipment_rental',
          'education_fitness',
          'field_technical_service',
          'general_business'
        ]::text[]
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_industry_config_object_check'
  ) then
    alter table public.businesses
      add constraint businesses_industry_config_object_check
      check (jsonb_typeof(industry_config) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_industry_config_version_check'
  ) then
    alter table public.businesses
      add constraint businesses_industry_config_version_check
      check (industry_config_version > 0);
  end if;
end
$$;

comment on column public.businesses.industry_profile is
  'Operational Nüva sector profile slug; not an SII activity code.';
comment on column public.businesses.industry_secondary_profiles is
  'Optional additional operational profiles; maximum three, no inferred values.';
comment on column public.businesses.industry_config is
  'Non-sensitive, tenant-scoped operational configuration validated by application code.';
comment on column public.businesses.industry_config_version is
  'Version of the industry_config payload contract.';
comment on column public.businesses.industry_profile_updated_at is
  'Timestamp of the last explicit industry profile/configuration change.';
