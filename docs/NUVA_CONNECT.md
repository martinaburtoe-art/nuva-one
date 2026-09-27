# Nüva Connect — ecosistema de integraciones

## Objetivo

Nüva Connect es la capa de integración de Nüva One. Las aplicaciones externas aportan datos y capacidades, pero la operación, la trazabilidad y la inteligencia permanecen dentro de Nüva.

## Conectores incorporados al catálogo

- Comercio: Shopify, WooCommerce, Mercado Libre.
- Agenda/cliente: Cal.com, Chatwoot.
- Automatización: n8n.
- Analítica: PostHog.
- Documentos: Nextcloud.
- Finanzas: bancos Chile y contabilidad externa.
- Operación: POS externos y delivery/logística.

WhatsApp permanece fuera del alcance actual.

## Contrato de integración

Cada conector debe implementar:

1. Autenticación server-side.
2. Scopes mínimos.
3. Resolución de tenant/business.
4. Normalización a eventos Nüva.
5. Idempotencia para webhooks.
6. Sincronización incremental.
7. Auditoría de acciones.
8. Revocación y desconexión.
9. Manejo de rate limits y reintentos.
10. Evidencia para Nüva Intelligence y Agent Council.

## Flujo

Proveedor → OAuth/API → Webhook/Sync → Evento Nüva → módulo operativo → Intelligence → Action Engine → resultado

## Estado

La interfaz y el catálogo ya están incorporados. Los proveedores que requieren credenciales propias quedan marcados como Requiere configuración; no se simula una conexión real.

## Seguridad

No se deben guardar access tokens, refresh tokens, client secrets ni contraseñas en frontend, localStorage o tablas operativas. La implementación definitiva debe usar secretos server-side y permisos mínimos por proveedor.

## Referencias técnicas verificadas

- Shopify: las nuevas apps públicas usan GraphQL Admin API y sus tokens se obtienen mediante flujos de autorización soportados por Shopify.
- Mercado Libre: OAuth 2.0 es el mecanismo de autorización y sus credenciales deben almacenarse de forma segura.
- Nextcloud: OCS/WebDAV son APIs disponibles para integración; WebDAV requiere autenticación.


## Pipeline de eventos implementado

La capa server-side ya dispone de:

- `nuva_integration_connections`: conexión por negocio/proveedor, con RLS y roles owner/admin para configuración.
- `nuva_integration_events`: inbox de eventos normalizados, con idempotencia por `business_id + provider + external_event_id`.
- `POST /api/integrations/webhook?provider=...&account=...`: recepción server-side.
- Verificación HMAC para Shopify y WooCommerce.
- Hash SHA-256 del payload para trazabilidad.
- Estado de procesamiento: received, processing, processed, failed, ignored.
- Conteo de reintentos y timestamps de recepción/procesamiento.
- `GET /api/integrations/events`: consulta tenant-scoped de estado de eventos.

Para secretos por proveedor, `secret_ref` debe apuntar a una variable server-side con prefijo `NUVA_CONNECT_SECRET_`; el secreto nunca viaja al navegador ni se persiste como valor en la tabla.

### Shopify y WooCommerce

Shopify expone el HMAC en `X-Shopify-Hmac-SHA256` y un identificador de evento en `X-Shopify-Event-Id`. WooCommerce entrega `X-WC-Webhook-Signature`, `X-WC-Webhook-Topic` y `X-WC-Webhook-Delivery-ID`. Nüva Connect conserva esos eventos sin procesarlos dos veces.

Los conectores siguen quedando en estado Requiere configuración hasta disponer de las credenciales y secretos reales del negocio/proveedor.
