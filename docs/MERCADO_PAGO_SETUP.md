# Mercado Pago — Nüva One

## Objetivo

Nüva One usa Mercado Pago como proveedor de suscripciones SaaS. El código ya soporta:

- creación de suscripciones recurrentes mediante PreApproval;
- retorno al producto;
- webhooks server-to-server con validación HMAC;
- activación de Pro solo cuando Mercado Pago confirma la suscripción;
- pausa, reanudación y cancelación;
- registro de cobros en `subscription_charges`;
- modo demo sin credenciales para probar UX antes de conectar Mercado Pago.

## Variables de producción

Configurar exclusivamente en el entorno server de Vercel:

```text
MERCADOPAGO_ACCESS_TOKEN=<Access Token de la aplicación Nüva One>
MERCADOPAGO_WEBHOOK_SECRET=<clave secreta de Webhooks de Mercado Pago>
MERCADOPAGO_ENV=prod
SITE_URL=https://nuva-one.vercel.app
```

Nunca exponer `MERCADOPAGO_ACCESS_TOKEN` ni `MERCADOPAGO_WEBHOOK_SECRET` al cliente.

## Variables de prueba

Para sandbox/pruebas:

```text
MERCADOPAGO_ACCESS_TOKEN=<Access Token de prueba>
MERCADOPAGO_WEBHOOK_SECRET=<clave secreta de Webhooks de la aplicación de prueba>
MERCADOPAGO_ENV=test
SITE_URL=<URL pública de preview o producción de pruebas>
```

## Webhook

Configurar en Mercado Pago la URL pública:

```text
https://nuva-one.vercel.app/api/billing/mercadopago/webhook
```

Debe notificarse al menos la creación/actualización de suscripciones y pagos. La firma `x-signature` debe validarse antes de procesar cualquier cambio de estado.

## Flujo

1. Cliente selecciona Nüva Pro.
2. Nüva One solicita una suscripción a Mercado Pago.
3. Mercado Pago devuelve `init_point`.
4. Cliente completa el flujo alojado por Mercado Pago.
5. Mercado Pago notifica a Nüva One.
6. Nüva One valida la firma y consulta el recurso directamente a Mercado Pago.
7. Solo entonces se actualiza el plan y estado de suscripción.

## Demo

Mientras no exista `MERCADOPAGO_ACCESS_TOKEN`, el frontend puede enviar al usuario a `/checkout-demo` para probar aprobación, rechazo, procesamiento y retorno sin generar cargos reales.
