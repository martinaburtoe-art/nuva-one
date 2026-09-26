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
