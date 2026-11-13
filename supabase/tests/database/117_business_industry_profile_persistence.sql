begin;
select plan(13);

select has_column('public', 'businesses', 'industry_profile', 'businesses has nullable operational profile');
select has_column('public', 'businesses', 'industry_secondary_profiles', 'businesses has secondary profiles');
select has_column('public', 'businesses', 'industry_config', 'businesses has sector configuration');
select has_column('public', 'businesses', 'industry_config_version', 'businesses has configuration version');
select has_column('public', 'businesses', 'industry_profile_updated_at', 'businesses has explicit profile update timestamp');

select col_type_is('public', 'businesses', 'industry_profile', 'text', 'profile is stored as a text slug');
select col_type_is('public', 'businesses', 'industry_secondary_profiles', '_text', 'secondary profiles are stored as text array');
select col_type_is('public', 'businesses', 'industry_config', 'jsonb', 'configuration is JSONB');
select col_type_is('public', 'businesses', 'industry_config_version', 'integer', 'configuration version is integer');
select col_not_null('public', 'businesses', 'industry_secondary_profiles', 'secondary profile list has safe empty default');
select col_not_null('public', 'businesses', 'industry_config', 'configuration has safe object default');
select col_not_null('public', 'businesses', 'industry_config_version', 'configuration version is always present');

select ok(
  (select is_nullable = 'YES' from information_schema.columns
   where table_schema = 'public' and table_name = 'businesses' and column_name = 'industry_profile'),
  'existing businesses can remain without an inferred sector profile'
);

select * from finish();
rollback;
