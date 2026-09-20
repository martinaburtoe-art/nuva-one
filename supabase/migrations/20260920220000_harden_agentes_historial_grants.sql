-- Harden internal agent history table: it is intentionally deny-all to client roles.
-- The table may be provisioned by an optional/internal deployment layer, so the
-- migration is safe when that table is absent from a clean local schema.
DO $$
BEGIN
  IF to_regclass('public.agentes_historial') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.agentes_historial FROM anon, authenticated;
  END IF;
END
$$;
