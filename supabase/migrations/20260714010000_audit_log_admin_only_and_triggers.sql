-- SECURITY: audit_log must be readable only by owners/admins (not staff/viewer),
-- and must not be editable or deletable by anyone through the app — it's the
-- one place designed to protect the business owner from a dishonest employee,
-- so a dishonest employee must not be able to read it or erase their own trail.

DROP POLICY IF EXISTS "Members read audit_log" ON public.audit_log;
CREATE POLICY "Admins read audit_log" ON public.audit_log
  FOR SELECT USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- No one authenticated may INSERT/UPDATE/DELETE directly from the client.
-- Rows are only ever written by the SECURITY DEFINER trigger below, which
-- (as the function owner) bypasses RLS regardless of these grants.
DROP POLICY IF EXISTS "Members insert audit_log" ON public.audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated;

-- Generic trigger: logs who did what and when on the tables that matter most
-- for detecting theft or misuse (sales/caja, purchases, inventory changes,
-- money movements, quotes, customer records, automations, marketing).
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  biz_id UUID;
  ent_id UUID;
BEGIN
  biz_id := COALESCE(NEW.business_id, OLD.business_id);
  ent_id := COALESCE(NEW.id, OLD.id);
  INSERT INTO public.audit_log (business_id, user_id, action, entity, entity_id, metadata)
  VALUES (
    biz_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    ent_id,
    jsonb_strip_nulls(jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'products', 'sales', 'purchases', 'transactions',
    'quotes', 'customers', 'automations', 'marketing_posts'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.log_audit_action()',
      t
    );
  END LOOP;
END $$;
