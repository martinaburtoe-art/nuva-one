# Nüva One ↔ n8n

## Objetivo

n8n es el motor de automatización externo de Nüva One. La integración mantiene la frontera:

`Nüva UI → /api/n8n → durable outbox → n8n webhook → workflow → servicios externos`

Las credenciales n8n nunca se exponen al navegador.

## Variables server-side

Configurar únicamente en Vercel Production/Preview según corresponda:

- `N8N_WEBHOOK_URL`: URL de producción del Webhook Trigger de n8n.
- `N8N_WEBHOOK_SECRET`: secreto compartido para firmar cada evento.
- `SUPABASE_SERVICE_ROLE_KEY`: usada únicamente por el worker programado para procesar la cola durable.
- `CRON_SECRET`: protege `/api/n8n-delivery` frente a invocaciones manuales.

No usar `NEXT_PUBLIC_` ni `VITE_` para ninguna de estas variables.

## Firma

Nüva envía:

- `X-Nuva-Timestamp`: Unix timestamp en segundos.
- `X-Nuva-Signature`: `sha256=HMAC_SHA256(secret, timestamp + "." + rawBody)`.
- `X-Nuva-Event-Id`: UUID del evento.
- `X-Nuva-Idempotency-Key`: clave para evitar doble procesamiento.
- `X-Nuva-Business-Id`: tenant de origen.

El workflow de n8n debe validar timestamp, firma y esquema antes de ejecutar lógica de negocio. Para cargas sensibles, añadir rate limiting/IP allowlist en la infraestructura n8n.

## Outbox durable

Los eventos se almacenan en `public.n8n_event_outbox` antes de intentar la entrega. La tabla es tenant-scoped y tiene RLS, índice único por `(business_id, idempotency_key)`, contador de intentos y programación de reintentos.

El worker `/api/n8n-delivery`:

- procesa hasta 25 eventos por ejecución;
- reclama cada evento de forma condicional para reducir carreras entre ejecuciones;
- usa backoff exponencial hasta 1 hora;
- limita cada evento a 8 intentos;
- marca entregas exitosas como `delivered`;
- conserva el error de la última entrega fallida;
- nunca persiste `N8N_WEBHOOK_SECRET` ni credenciales externas en la cola.

Vercel Cron está configurado con una frecuencia diaria para mantener compatibilidad con planes Hobby. En Pro/Enterprise puede elevarse a una frecuencia por minuto cuando se necesite procesamiento casi en tiempo real.

## Contrato de evento

```json
{
  "id": "uuid",
  "business_id": "uuid",
  "actor_user_id": "uuid|null",
  "provider": "nuva",
  "source": "nuva_one",
  "entity_type": "sale",
  "entity_id": "external-or-internal-id|null",
  "event_type": "sale.created",
  "occurred_at": "2026-09-08T00:00:00.000Z",
  "idempotency_key": "stable-key",
  "payload": {}
}
```

## Primeras recetas objetivo

1. `sale.created` → n8n → notificación/CRM.
2. `quote.accepted` → n8n → seguimiento + agenda.
3. `inventory.low_stock` → n8n → responsable + compra sugerida.
4. `payment.overdue` → n8n → recordatorio + CRM.
5. `customer.created` → n8n → bienvenida + segmentación.
6. `intelligence.alert` → n8n → canal de aviso.

## Seguridad y operación

- Verificar membresía del `business_id` antes de emitir.
- Nunca aceptar un `business_id` arbitrario como autorización.
- Mantener secretos server-side.
- Usar idempotencia en todos los workflows con efectos secundarios.
- Separar workflows de prueba y producción.
- Registrar resultado, código HTTP y duración sin guardar secretos.
- Aplicar mínimo privilegio a credenciales externas.
- No permitir que un agente de IA tenga permisos implícitos para acciones irreversibles.
- Usar n8n `2.37.11` estable o una versión posterior parcheada.

## Estado

La pasarela server-side, el outbox durable y el worker programado ya forman parte de Nüva One. La activación real requiere una instancia n8n y sus variables server-side. Hasta completar ese paso, la UI debe mostrar `Preparado` y nunca `Conectado`.
