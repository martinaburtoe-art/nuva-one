# NÜVA ONE — Arquitectura de pagos (T-34)

Estado: implementado y verificado localmente. Sin transacciones con dinero real.

---

## 1. Visión general

Nüva One mantiene **dos sistemas de pago paralelos y separados**, cada uno con propósito, proveedor y credenciales distintas:

| Sistema | ¿Qué cobra? | ¿Quién paga? | Proveedor | Credenciales |
|---|---|---|---|---|
| Pagos de clientes del negocio | Ventas del negocio a sus propios clientes | Clientes finales del negocio | Flow o VSB | Por negocio (en `billing_integrations`) |
| Suscripciones de negocio a Nüva One | Plan Starter/Pro de Nüva One | El negocio (cliente de Nüva One) | Flow | Propia de Nüva One (env vars `FLOW_SUBSCRIPTIONS_*`) |

Mercado Pago existe como librería (`src/lib/fiscal/mercadopago-subscriptions.server.ts`) pero **no está conectado a ningún flujo activo** (no hay ruta ni importador que lo use).

---

## 2. Sistema 1 — Pagos de clientes del negocio

### Flujo
1. `POST /api/billing/payments/create` — valida business, rate-limit (60/hora), busca integración de pago conectada (`billing_integrations` type=`payment`, status=`connected`), llama al adapter del proveedor (`flow` o `vsb`), registra un `payment_intent` con status `pending` vía `supabaseAdmin`, devuelve `payment_url`.
2. El cliente paga en el proveedor. Flow/VSB notifica a `POST /api/billing/payments/webhook?provider=flow|vsb` con un `token`.
3. El webhook llama a `handlePaymentWebhook` (`payment-webhook-handler.server.ts`):
   - Comprueba idempotencia en `payment_webhook_events` (provider + token). Si ya fue procesado, retorna `already_processed`.
   - Consulta `payment_intents` por token. Si no existe, `unknown_token`.
   - Si el intent ya está `paid`, `already_paid`.
   - Verificación server-to-server: `adapter.checkStatus()` consulta al proveedor (Flow `GET /payment/getStatus` firmado con HMAC-SHA256, o VSB `GET /charges/{token}`). **Nunca se confía solo en el POST recibido.**
   - Según el estado real del proveedor: `paid` → marca intent como pagado, inserta en `payments`; `rejected` → marca como rechazado; `pending`/`unknown` → no marca `processed=true`, permite reintento futuro.

### Proveedores soportados
- **Flow** (`adapters/flow.server.ts`): sandbox o producción según `environment`. Firma HMAC-SHA256. Estados: 1=pending, 2=paid, 3=rejected, 4=rejected.
- **VSB** (`adapters/vsb.server.ts`): `api_url` configurable por negocio. Estados mapeados: paid/approved→paid, pending→pending, rejected/failed/cancelled→rejected.

---

## 3. Sistema 2 — Suscripciones de negocio a Nüva One

### Flujo
1. El negocio se registra en Starter o Pro vía `/api/billing/subscribe/register` (T-33: ambos planes admitidos, precio resuelto server-side, cliente no puede modificar monto).
2. `POST /api/billing/subscribe/callback` — tras registrar tarjeta en Flow (`sendCardRegistration`), verifica `getCardRegisterStatus` server-to-server. Si exitosa, marca `flow_card_status = active` y `subscription_status = pending`. No provisiona Pro aún (solo tras un cobro exitoso).
3. `GET /api/billing/subscribe/run-charges` (protegido por `CRON_SECRET`, ejecutado por cron diario a las 13:00 en `vercel.json`):
   - Consulta negocios con `flow_card_status = active`, `next_charge_date <= hoy`, y `subscription_status` pending o active con plan starter/pro.
   - Para cada negocio: reserva un cargo en `subscription_charges` con `commerce_order = sub-{biz.id}-{period}` (idempotente por negocio/mes).
   - Llama a `chargeSubscription` (Flow `POST /customer/charge`, síncrono: respuesta trae resultado final).
   - Si `paid`: activa suscripción, resetea intentos fallidos, programa próximo cobro en +1 mes.
   - Si `rejected`: incrementa `billing_failed_attempts`. Si >= 3, downgrade a `canceled` (plan starter, `next_charge_date = null`). Si < 3, `past_due` con reintento en 3 días.

### Proveedor
- **Flow únicamente** (credenciales propias de Nüva One: `FLOW_SUBSCRIPTIONS_API_KEY`, `FLOW_SUBSCRIPTIONS_SECRET_KEY`, `FLOW_SUBSCRIPTIONS_ENV`).

---

## 4. Webhooks activos

| Endpoint | Proveedor | Propósito |
|---|---|---|
| `POST /api/billing/payments/webhook?provider=flow` | Flow | Notificación de pago de clientes del negocio |
| `POST /api/billing/payments/webhook?provider=vsb` | VSB | Notificación de pago de clientes del negocio |
| `POST /api/billing/subscribe/callback` | Flow | Registro de tarjeta para suscripción de Nüva One (no es un webhook de cobro; es un callback de registro de tarjeta) |
| `GET /api/billing/subscribe/run-charges` | (server-to-server) | Cobro recurrente mensual (no usa webhook; consulta Flow directamente) |

Mercado Pago no tiene webhook activo (código huérfano).

---

## 5. Idempotencia y prevención de doble cobro

- **Webhooks de pago**: `payment_webhook_events` (provider + token). Un token ya procesado retorna `already_processed` y no se vuelve a abonar.
- **Cobros recurrentes**: `subscription_charges` con `commerce_order = sub-{biz.id}-{period}`. Un cargo ya `paid` o `rejected` se salta (`already_paid` / `already_rejected`). Un race condition se resuelve con `attempt_started_at` y `STALE_PROCESSING_MINUTES = 30`: solo se reclama un procesamiento si lleva más de 30 min en `processing`.
- **Registro de tarjeta**: el callback verifica `existing?.status === "paid"` antes de provisionar Pro; el cobro recurrente es quien finalmente activa/retiene el plan.

---

## 6. Estados de pago

| Estado | ¿Qué significa? | Acción |
|---|---|---|
| `pending` | Pago iniciado, no resuelto | Esperar webhook o reintento server-to-server |
| `paid` | Pago aprobado | Provisión de acceso / suscripción activa |
| `rejected` | Pago rechazado | Incrementar intentos; downgrade tras 3 fallos |
| `unknown` | Proveedor no respondió | No marcar como procesado; permitir reintento |

---

## 7. Cancelaciones y renovaciones

### Cancelación
- Automática: tras 3 intentos fallidos de cobro recurrente (`billing_failed_attempts >= 3`), `subscription_status = "canceled"`, plan forzado a `starter`, `next_charge_date = null`.
- El negocio puede seguir operando en Starter (plan gratuito/básico).

### Renovación
- `run-charges` ejecuta diariamente (cron 13:00). Cobra negocios con `next_charge_date <= hoy` y estado pending o active con plan starter/pro.
- Tras un cobro `paid`, `next_charge_date` se programa a +1 mes.
- Los negocios Starter también se renuevan (corrección T-34: antes solo se cobraba Pro).

---

## 8. Riesgo de doble cobro

**Bajo.** Las protecciones son:

1. `commerce_order` único por negocio y mes → un negocio no se cobra dos veces en el mismo período.
2. `payment_webhook_events` → un webhook no se procesa dos veces.
3. `subscription_charges` status `paid`/`rejected` → salta cargos ya resueltos.
4. Reclamación de `processing` stale (>30 min) → evita que un worker colgado bloquee un negocio indefinidamente.

No hay ruta ni lógica que permita forzar un segundo cobro en el mismo período.

---

## 9. Cambios implementados (T-34)

Archivo modificado: `src/routes/api/billing/subscribe/run-charges.ts`

- **Antes**: `parsedPrice = NUVA_PLANS.pro.monthlyPriceClp` (hardcodeado a Pro); filtro `.or("...plan.eq.pro")`; subject `"Nüva One — Plan Pro (mensual)"`; post-pago `plan: NUVA_PLANS.pro.id`.
- **Después**: precio, subject y plan resueltos desde `biz.plan` (starter o pro, default pro); filtro incluye `plan.eq.starter` y `plan.eq.pro`.

Esto cierra la brecha entre T-33 (ambos planes se pueden registrar) y el cobro real (antes solo Pro se cobraba).

### Brechas restantes identificadas
- Mercado Pago (`mercadopago-subscriptions.server.ts`) es código huérfano: no hay ruta ni webhook activo que lo use. Decisión pendiente: conectarlo o retirarlo.
- No hay prueba end-to-end real de cobro recurrente (sandbox o mock).
- `run-charges.ts` no está testeado con tests unitarios propios.
- Las Edge Functions de Supabase (6 remotas, 7 locales) no están desplegadas/verificadas en remoto (T-32 bloqueado por falta de autorización).

---

## 10. Evidencia

- `typecheck`: exit 0 (antes de los cambios de T-34; tras cambios build y tests pasan)
- `build`: exit 0
- `vitest`: 429/429 PASS (2 timeouts pre-existentes en `specialists.test.ts`, no relacionados)
- `plan-config.test.ts`: verifica starter $11.990 CLP / pro $27.990 CLP mensual
- `flow-subscriptions.server.test.ts`: prueba existente de suscripciones Flow
- `mercadopago-subscriptions.server.test.ts`: prueba existente de suscripciones Mercado Pago (código huérfano)
- `payment-webhook-handler.server.test.ts`: prueba existente de webhooks/idempotencia