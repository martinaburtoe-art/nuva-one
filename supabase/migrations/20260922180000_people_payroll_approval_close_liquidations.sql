-- Nüva People — controlled approval, close and liquidation generation
CREATE OR REPLACE FUNCTION public.approve_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; invalid_count integer;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 IF p.status<>'calculated' THEN RAISE EXCEPTION 'only calculated periods can be approved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id) THEN RAISE EXCEPTION 'period has no payroll items'; END IF;
 SELECT count(*) INTO invalid_count FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id AND jsonb_array_length(warnings)>0;
 IF invalid_count>0 THEN RAISE EXCEPTION 'period has % payroll items with warnings; resolve them before approval',invalid_count; END IF;
 UPDATE public.people_payroll_periods SET status='approved',approved_at=now(),approved_by=auth.uid() WHERE id=p_payroll_period_id;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'status','approved');
END $$;

CREATE OR REPLACE FUNCTION public.close_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; invalid_count integer;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 IF p.status<>'approved' THEN RAISE EXCEPTION 'only approved periods can be closed'; END IF;
 PERFORM public.prepare_people_lre(p_payroll_period_id);
 SELECT count(*) INTO invalid_count FROM public.people_lre_rows WHERE payroll_period_id=p_payroll_period_id AND validation_status='invalid';
 IF invalid_count>0 THEN RAISE EXCEPTION 'LRE validation has % invalid rows',invalid_count; END IF;
 UPDATE public.people_payroll_periods SET status='closed',closed_at=now() WHERE id=p_payroll_period_id;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'status','closed','lre_rows',(SELECT count(*) FROM public.people_lre_rows WHERE payroll_period_id=p_payroll_period_id));
END $$;

CREATE OR REPLACE FUNCTION public.generate_people_liquidations(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; i record; e record; n integer:=0;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 IF p.status NOT IN ('approved','closed') THEN RAISE EXCEPTION 'period must be approved before liquidations'; END IF;
 FOR i IN SELECT * FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id LOOP
   SELECT * INTO e FROM public.people_employees WHERE id=i.employee_id;
   INSERT INTO public.people_payroll_liquidations(business_id,payroll_period_id,employee_id,payroll_item_id,status,document_payload)
   VALUES(p.business_id,p_payroll_period_id,i.employee_id,i.id,'issued',
     jsonb_build_object('employee_name',concat_ws(' ',e.first_name,e.last_name),'national_id',e.national_id,'period',jsonb_build_object('year',p.period_year,'month',p.period_month),
       'gross_taxable',i.gross_taxable,'gross_non_taxable',i.gross_non_taxable,'deductions',i.deductions,'net_pay',i.net_pay,'employer_cost',i.employer_cost_amount,
       'components',i.components,'warnings',i.warnings,'calculation_version',i.calculation_version,'parameter_snapshot',i.parameter_snapshot))
   ON CONFLICT(payroll_period_id,employee_id) DO UPDATE SET payroll_item_id=EXCLUDED.payroll_item_id,status='issued',issued_at=now(),document_payload=EXCLUDED.document_payload;
   n:=n+1;
 END LOOP;
 UPDATE public.people_payroll_liquidations SET issued_at=COALESCE(issued_at,now()) WHERE payroll_period_id=p_payroll_period_id;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'liquidations',n);
END $$;

GRANT EXECUTE ON FUNCTION public.approve_people_payroll_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_people_payroll_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_people_liquidations(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_people_payroll_items_period_employee ON public.people_payroll_items(payroll_period_id,employee_id);
