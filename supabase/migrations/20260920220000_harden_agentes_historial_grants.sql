-- Harden internal agent history table: it is intentionally deny-all to client roles.
-- Operational/service roles retain their existing privileges.
REVOKE ALL ON TABLE public.agentes_historial FROM anon, authenticated;
