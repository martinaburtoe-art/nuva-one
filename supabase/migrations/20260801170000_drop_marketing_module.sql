-- Elimina el módulo de Marketing por completo (ver también remoción de
-- rutas /marketing y /api/marketing/meta/* en este mismo commit).
DROP TABLE IF EXISTS public.marketing_posts CASCADE;
DROP TABLE IF EXISTS public.marketing_integrations CASCADE;
