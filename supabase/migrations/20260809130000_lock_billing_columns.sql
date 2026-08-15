-- VULNERABILIDAD REAL encontrada al agregar columnas de suscripción: la
-- policy "Owner updates business" ON businesses FOR UPDATE USING
-- (auth.uid() = owner_id) no restringe QUÉ columnas puede tocar el dueño --
-- solo qué fila. Como Postgres RLS es a nivel de fila, no de columna, sin
-- este fix cualquier dueño podría, con su propio JWT, hacer un PATCH
-- directo a la REST API de Supabase (bypaseando checkout.ts/callback.ts
-- por completo) y setear plan='pro' gratis:
--
--   PATCH /rest/v1/businesses?id=eq.<su-negocio>
--   { "plan": "pro", "subscription_status": "active" }
--
-- La única defensa real es a nivel de GRANT/REVOKE de columna: el rol
-- authenticated (usado por el cliente anon-key + JWT del usuario) pierde el
-- permiso UPDATE sobre las columnas de facturación; solo service_role
-- (usado por supabaseAdmin en los endpoints server-side) puede tocarlas.
--
-- OJO: en Postgres, REVOKE UPDATE (columna) NO anula un GRANT UPDATE ya
-- existente a nivel de TABLA completa (que es justo lo que había desde el
-- GRANT original de esta tabla) -- los privilegios de columna son
-- ADITIVOS al de tabla, no restrictivos. Por eso hay que revocar el
-- UPDATE de tabla completo primero y re-otorgarlo solo en las columnas
-- que sí debe poder editar un dueño/admin desde Ajustes.

REVOKE UPDATE ON public.businesses FROM authenticated;

-- Reconciliación de drift (mismo patrón que 20260812200000): estas tres
-- columnas ya existen en producción sin migración trackeada.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS giro TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS comuna TEXT;

GRANT UPDATE (
  name, industry, size, logo_url, tax_id, webhook_url, giro, address, comuna
) ON public.businesses TO authenticated;
