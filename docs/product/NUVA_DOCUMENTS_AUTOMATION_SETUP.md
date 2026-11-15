# Nüva Documents — activación de correo, cobros y recordatorios

## Funcionalidad incluida

- Envío de cotizaciones por correo mediante Resend.
- Seguimiento de cotizaciones: recordatorio 3 días antes del vencimiento y el día de vencimiento.
- Recordatorios de documentos internos: 3 días antes, el día del vencimiento, y 3 y 7 días después.
- Cobro online de documentos internos mediante Flow.
- Conciliación server-to-server: el webhook y un proceso de respaldo cada 15 minutos consultan el estado real en Flow, validan monto y commerce order, registran el abono idempotente y actualizan el saldo.
- Página pública de retorno en `/payment/confirmation`.
- Ledger auditable de entregas y reintentos.

## Secretos requeridos en Vercel

| Variable | Uso | Estado de activación |
|---|---|---|
| `FISCAL_CREDENTIALS_KEY` | Cifrado AES-256-GCM de credenciales de pasarelas por negocio. Debe ser una clave base64 de 32 bytes y no debe rotarse sin migración. | Generada y configurada en Production, Preview y Development. |
| `RESEND_API_KEY` | Envío transaccional de correo. | Pendiente: crear una API key en Resend. |
| `NUVA_DOCUMENTS_FROM_EMAIL` | Remitente verificado, por ejemplo `documentos@tu-dominio.cl`. | Pendiente: verificar el dominio y configurar el remitente. |
| `INNGEST_SIGNING_KEY` | Firma de la integración Inngest para sincronizar y ejecutar cron jobs de producción. | Presente en Vercel Production. Falta comprobar sincronización del endpoint y ejecución de los cron tras el despliegue de esta fase. |

No incluir estos valores en Git, archivos públicos, variables `VITE_*), logs ni respuestas de API.

## Configuración de Resend

1. Verificar el dominio remitente en Resend.
2. Publicar los registros DNS que indique Resend (SPF, DKIM y, cuando corresponda, DMARC).
3. Crear una API key con permiso de envío.
4. Guardar `RESEND_API_KEY` y `NUVA_DOCUMENTS_FROM_EMAIL` en Vercel para Production, Preview y Development.
5. Promover un deployment nuevo para que las funciones reciban las variables.

El endpoint de envío devuelve `503 DOCUMENT_EMAIL_PROVIDER_NOT_CONFIGURED` mientras falte cualquiera de las dos variables. No registra un envío ficticio.

## Configuración de Inngest

1. Abrir el proyecto `nuva-one` en Inngest.
2. Copiar la signing key del entorno Production.
3. Guardarla como `INNGEST_SIGNING_KEY` en Vercel.
4. Desplegar una nueva versión y comprobar que Inngest sincronice `nuva-invoice-payment-reminders` y `nuva-invoice-payment-reconciliation`.
5. Confirmar el cron diario `TZ=America/Santiago 0 9 * * *` y la conciliación cada 15 minutos `*/15 * * * *`.

Sin la signing key, la función está incluida en el código pero no se puede certificar como programada en producción.

## Conexión de Flow por negocio

Cada empresa debe conectar sus propias credenciales Flow desde la sección de integraciones de Nüva One. Las credenciales se cifran con `FISCAL_CREDENTIALS_KEY`.

- Los documentos internos aceptan cobro online con el adaptador Flow.
- El adaptador VSB se mantiene para el flujo de ventas existente, pero no se habilita para facturas internas hasta certificar su contrato.
- El monto del checkout se calcula en el servidor desde el saldo pendiente.
- El redirect del navegador no confirma pagos.
- El webhook verifica el estado directamente con Flow y valida monto y referencia.
- Cada pago confirmado crea un único abono y un único movimiento de ingreso; no genera una venta, no mueve inventario y no emite un DTE.

## Semántica de estados

- `document_delivery_attempts.status = sent`: Resend aceptó el mensaje y devolvió un ID. No garantiza que haya llegado a la bandeja de entrada.
- `payment_intents.status = paid`: el proveedor confirmó el pago y la conciliación del documento terminó.
- Los intentos pendientes se expiran al confirmar un pago y, al solicitar un nuevo checkout, si superan 48 horas o si el saldo cambió.
- Un pago confirmado invalida los enlaces de checkout pendientes de ese documento.

## Límites

Los documentos internos no son DTE. Esta etapa no implementa emisión SII, firma electrónica avanzada, OCR ni facturación tributaria. Los recordatorios y envíos automáticos requieren las credenciales externas descritas arriba.
