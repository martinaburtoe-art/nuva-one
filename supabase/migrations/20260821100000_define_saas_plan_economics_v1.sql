CREATE TABLE IF NOT EXISTS public.plan_catalog (
  plan text PRIMARY KEY CHECK (plan IN ('starter','pro')),
  display_name text NOT NULL,
  monthly_price_clp integer NOT NULL CHECK (monthly_price_clp >= 0),
  annual_price_clp integer NOT NULL CHECK (annual_price_clp >= 0),
  included_users integer NOT NULL CHECK (included_users >= 1),
  extra_user_price_clp integer NOT NULL CHECK (extra_user_price_clp >= 0),
  ai_messages_monthly integer NOT NULL CHECK (ai_messages_monthly >= 0),
  storage_mb integer NOT NULL CHECK (storage_mb >= 0),
  max_products integer NOT NULL CHECK (max_products >= 0),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plan_catalog(plan,display_name,monthly_price_clp,annual_price_clp,included_users,extra_user_price_clp,ai_messages_monthly,storage_mb,max_products,features)
VALUES
('starter','Nüva Start',11990,119900,1,2990,100,2048,500,jsonb_build_object('scanner',true,'inventory',true,'sales',true,'customers',true,'quotes',true,'cash',true,'purchases',true,'shipments',true,'nuva_score','basic','ai','basic','explain_business','basic','crm','basic','advanced_finance',false,'nuva_radar',false,'nuva_copilot',false,'automations',false,'advanced_reports',false)),
('pro','Nüva Pro',27990,279900,3,3990,500,10240,5000,jsonb_build_object('scanner',true,'inventory',true,'sales',true,'customers',true,'quotes',true,'cash',true,'purchases',true,'shipments',true,'nuva_score','advanced','ai','advanced','explain_business','advanced','crm','advanced','advanced_finance',true,'nuva_radar',true,'nuva_copilot',true,'automations',true,'advanced_reports',true))
ON CONFLICT (plan) DO UPDATE SET display_name=excluded.display_name,monthly_price_clp=excluded.monthly_price_clp,annual_price_clp=excluded.annual_price_clp,included_users=excluded.included_users,extra_user_price_clp=excluded.extra_user_price_clp,ai_messages_monthly=excluded.ai_messages_monthly,storage_mb=excluded.storage_mb,max_products=excluded.max_products,features=excluded.features,active=true,updated_at=now();

CREATE OR REPLACE VIEW public.business_plan_limits AS
SELECT b.id AS business_id,b.plan,p.display_name,p.monthly_price_clp,p.annual_price_clp,p.included_users,p.extra_user_price_clp,p.ai_messages_monthly,p.storage_mb,p.max_products,p.features
FROM public.businesses b JOIN public.plan_catalog p ON p.plan=b.plan;

CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  usage_month date NOT NULL,
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  PRIMARY KEY (business_id,usage_month)
);
ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view own monthly ai usage" ON public.ai_usage_monthly;
CREATE POLICY "Members view own monthly ai usage" ON public.ai_usage_monthly FOR SELECT USING (private.is_business_member(business_id,auth.uid()));

CREATE OR REPLACE FUNCTION public.increment_ai_usage_monthly(p_business_id uuid,p_monthly_limit integer,p_user_id uuid,p_units integer DEFAULT 1)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE current_count integer; month_start date:=date_trunc('month',current_date)::date;
BEGIN
  IF p_business_id IS NULL OR p_user_id IS NULL OR p_monthly_limit<0 OR p_units<=0 THEN RETURN false; END IF;
  IF NOT private.is_business_member(p_business_id,p_user_id) THEN RETURN false; END IF;
  INSERT INTO public.ai_usage_monthly(business_id,usage_month,message_count) VALUES(p_business_id,month_start,0) ON CONFLICT (business_id,usage_month) DO NOTHING;
  SELECT message_count INTO current_count FROM public.ai_usage_monthly WHERE business_id=p_business_id AND usage_month=month_start FOR UPDATE;
  IF current_count+p_units>p_monthly_limit THEN RETURN false; END IF;
  UPDATE public.ai_usage_monthly SET message_count=message_count+p_units WHERE business_id=p_business_id AND usage_month=month_start;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.increment_ai_usage_monthly(uuid,integer,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage_monthly(uuid,integer,uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE product_limit integer; product_count integer;
BEGIN
  SELECT max_products INTO product_limit FROM public.plan_catalog p JOIN public.businesses b ON b.plan=p.plan WHERE b.id=NEW.business_id;
  SELECT count(*) INTO product_count FROM public.products WHERE business_id=NEW.business_id;
  IF product_limit>=0 AND product_count>=product_limit THEN
    RAISE EXCEPTION 'El plan actual permite hasta % productos. Actualiza tu plan para agregar más.',product_limit USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_product_plan_limit ON public.products;
CREATE TRIGGER trg_enforce_product_plan_limit BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_product_plan_limit();
