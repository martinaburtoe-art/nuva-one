BEGIN;
CREATE OR REPLACE FUNCTION private.auto_settle_paid_purchase() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
 IF NEW.status='paid' AND COALESCE(NEW.total,0)>0 AND NOT EXISTS(SELECT 1 FROM public.purchase_payments pp WHERE pp.business_id=NEW.business_id AND pp.purchase_id=NEW.id) THEN
   INSERT INTO public.purchase_payments(business_id,purchase_id,amount,method,paid_at)
   VALUES(NEW.business_id,NEW.id,NEW.total,'efectivo',COALESCE(NEW.purchase_date,current_date)::timestamptz);
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS purchases_auto_settle_paid ON public.purchases;
CREATE TRIGGER purchases_auto_settle_paid AFTER INSERT OR UPDATE OF status ON public.purchases FOR EACH ROW EXECUTE FUNCTION private.auto_settle_paid_purchase();
REVOKE ALL ON FUNCTION private.auto_settle_paid_purchase() FROM PUBLIC,anon,authenticated;
COMMIT;
