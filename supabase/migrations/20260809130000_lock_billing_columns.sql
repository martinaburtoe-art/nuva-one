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

REVOKE UPDATE (
  plan,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  flow_customer_id,
  flow_card_status,
  next_charge_date,
  billing_failed_attempts
) ON public.businesses FROM authenticated;
