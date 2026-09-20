-- Core validation for Chilean electronic tax documents (DTE).
-- This is a deterministic preflight layer; it does not replace SII certification,
-- digital signing, folio authorization, or SII's own validation services.
create or replace function public.validate_sii_dte_core(
  p_document_type integer,
  p_folio integer,
  p_issue_date date,
  p_net_amount numeric,
  p_exempt_amount numeric,
  p_vat_amount numeric,
  p_total_amount numeric
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  errors text[] := '{}';
  calculated_total numeric;
begin
  if p_document_type not in (33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111, 112) then
    errors := array_append(errors, 'document_type_not_supported');
  end if;

  if p_folio is null or p_folio <= 0 then
    errors := array_append(errors, 'folio_must_be_positive');
  end if;

  if p_issue_date is null then
    errors := array_append(errors, 'issue_date_required');
  end if;

  if coalesce(p_net_amount, 0) < 0 or coalesce(p_exempt_amount, 0) < 0 or coalesce(p_vat_amount, 0) < 0 or coalesce(p_total_amount, 0) < 0 then
    errors := array_append(errors, 'amounts_must_be_non_negative');
  end if;

  calculated_total := round(coalesce(p_net_amount, 0) + coalesce(p_exempt_amount, 0) + coalesce(p_vat_amount, 0), 0);
  if round(coalesce(p_total_amount, 0), 0) <> calculated_total then
    errors := array_append(errors, 'total_does_not_match_components');
  end if;

  if p_document_type in (33, 39, 43, 46, 110, 111, 112) and p_net_amount > 0
     and round(p_vat_amount, 0) <> round(p_net_amount * 0.19, 0) then
    errors := array_append(errors, 'vat_does_not_match_19_percent_net');
  end if;

  return jsonb_build_object(
    'valid', cardinality(errors) = 0,
    'errors', to_jsonb(errors),
    'calculated_total', calculated_total,
    'document_type', p_document_type,
    'folio', p_folio
  );
end;
$$;

revoke all on function public.validate_sii_dte_core(integer, integer, date, numeric, numeric, numeric, numeric) from public;
grant execute on function public.validate_sii_dte_core(integer, integer, date, numeric, numeric, numeric, numeric) to authenticated;
