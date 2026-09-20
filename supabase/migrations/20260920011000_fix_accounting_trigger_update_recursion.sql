-- Prevent accounting auto-post triggers from updating the same sale/purchase row
-- that is currently being updated. PostgreSQL rejects that pattern with
-- SQLSTATE 27000 ("tuple to be updated was already modified by an operation
-- triggered by the current command").
--
-- INSERTs remain synchronous. UPDATEs are handled by the financial posting
-- queue triggers, which do not update the source row inside the same command.

CREATE OR REPLACE FUNCTION public.trg_post_sale_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.post_sale_accounting(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.sales
      SET accounting_posting_status = 'error',
          accounting_posting_error = left(SQLERRM, 500)
      WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_post_purchase_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.post_purchase_accounting(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.purchases
      SET accounting_posting_status = 'error',
          accounting_posting_error = left(SQLERRM, 500)
      WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_accounting_auto_post ON public.sales;
CREATE TRIGGER sales_accounting_auto_post
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_post_sale_accounting();

DROP TRIGGER IF EXISTS purchases_accounting_auto_post ON public.purchases;
CREATE TRIGGER purchases_accounting_auto_post
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_post_purchase_accounting();
