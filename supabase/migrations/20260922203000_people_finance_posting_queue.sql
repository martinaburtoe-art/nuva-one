-- Nüva People — finance posting handoff
CREATE OR REPLACE FUNCTION public.post_people_payroll_to_finance(p_payroll_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public,private
AS $$
DECLARE p record; total_cost numeric; qid uuid;
BEGIN
  SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
  IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
  IF p.status NOT IN ('approved','closed') THEN RAISE EXCEPTION 'period must be approved before finance posting'; END IF;
  SELECT COALESCE(sum(employer_cost_amount),0) INTO total_cost FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id;
  IF total_cost <= 0 THEN RAISE EXCEPTION 'period has no positive employer cost'; END IF;
  INSERT INTO public.people_payroll_postings(business_id,payroll_period_id,posting_key,total_amount,status,created_by)
  VALUES(p.business_id,p_payroll_period_id,'payroll_employer_cost',total_cost,'pending_review',auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO qid;
  INSERT INTO public.financial_posting_queue(business_id,source_type,source_id,source_date,gross_amount,status,reason)
  VALUES(p.business_id,'people_payroll',p_payroll_period_id,make_date(p.period_year,p.period_month,1),total_cost,'pending_review','Nómina aprobada: revisión de cuentas contables antes de registrar asiento')
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('period_id',p_payroll_period_id,'status','pending_review','employer_cost',total_cost,'posting_id',qid);
END $$;
REVOKE ALL ON FUNCTION public.post_people_payroll_to_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_people_payroll_to_finance(uuid) TO authenticated;
