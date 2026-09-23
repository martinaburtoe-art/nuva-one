-- Nüva People — JSON shape guards.
-- Los payloads estructurados mantienen la forma esperada antes de entrar al motor.

alter table public.people_attendance_events add constraint people_attendance_metadata_object_ck check (jsonb_typeof(metadata)='object');
alter table public.people_compliance_items add constraint people_compliance_metadata_object_ck check (jsonb_typeof(metadata)='object');
alter table public.people_documents add constraint people_documents_metadata_object_ck check (jsonb_typeof(metadata)='object');
alter table public.people_karin_cases add constraint people_karin_measures_array_ck check (jsonb_typeof(measures)='array');
alter table public.people_lre_exports add constraint people_lre_exports_payload_object_ck check (jsonb_typeof(payload)='object'), add constraint people_lre_exports_errors_array_ck check (jsonb_typeof(validation_errors)='array');
alter table public.people_lre_rows add constraint people_lre_rows_data_object_ck check (jsonb_typeof(row_data)='object'), add constraint people_lre_rows_errors_array_ck check (jsonb_typeof(validation_errors)='array');
alter table public.people_payroll_items add constraint people_payroll_items_components_object_ck check (jsonb_typeof(components)='object'), add constraint people_payroll_items_snapshot_object_ck check (jsonb_typeof(parameter_snapshot)='object'), add constraint people_payroll_items_warnings_array_ck check (jsonb_typeof(warnings)='array');
alter table public.people_payroll_liquidations add constraint people_payroll_liquidations_payload_object_ck check (jsonb_typeof(document_payload)='object');
alter table public.people_payroll_periods add constraint people_payroll_periods_snapshot_object_ck check (jsonb_typeof(parameter_snapshot)='object');
alter table public.people_payroll_runs add constraint people_payroll_runs_summary_object_ck check (jsonb_typeof(result_summary)='object');
alter table public.people_terminations add constraint people_terminations_components_object_ck check (jsonb_typeof(components)='object');