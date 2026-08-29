# Nüva One — Owner Control Tower + Platform Intelligence

**Fecha:** 2026-08-29  
**Objetivo:** observabilidad operacional y análisis inteligente de la plataforma, sin perfilar personas.

## 1. Principio de privacidad

Owner Intelligence opera únicamente sobre señales técnicas y agregadas. El pipeline no debe consumir nombres, emails, teléfonos, prompts, respuestas, contenido de conversaciones, navegación individual ni identificadores personales como dimensiones analíticas.

La telemetría actualmente existente en `platform-telemetry` recibe `user_id`. Antes de beta debe separarse el almacenamiento técnico de cualquier identificador personal y garantizar que el dataset consumido por Owner Intelligence no contenga PII.

## 2. Capas

### Tiempo casi real — 5–15 s
- estado de API/endpoint;
- error rate;
- p50/p95/p99;
- latencia de IA;
- 429 y errores por proveedor;
- webhooks recientes;
- jobs retrasados;
- estado de deployment conocido.

### Agregación — 1–5 min
- requests/min;
- errores/min;
- latencia por ruta;
- operaciones por módulo;
- coste IA acumulado;
- tokens input/output;
- fallbacks;
- salud de integraciones.

### Agregación — 1 h / diario
- negocios activos agregados;
- transacciones por módulo;
- coste por plan/tenant en forma agregada;
- consumo de almacenamiento/egress;
- incidentes y anomalías;
- margen técnico estimado.

## 3. Modelo mínimo de eventos

Cada evento técnico debe poder representarse conceptualmente como:

`timestamp, event_type, route, status_code, duration_ms, provider, model, input_tokens, output_tokens, estimated_cost, integration, environment, release_id, metadata_safe`

`metadata_safe` debe pasar una allowlist de campos técnicos. No se deben aceptar objetos arbitrarios provenientes del navegador.

## 4. Detección de anomalías

Primero se ejecuta detección determinística:

- p95 actual > baseline móvil × umbral;
- error rate > 1% durante 5 minutos;
- crecimiento de 429;
- aumento abrupto de latencia IA;
- coste diario sobre presupuesto;
- webhook failure rate sobre umbral;
- job lag sobre SLA.

Se crea un `platform_incident` con severidad, métrica, baseline, valor actual, primera aparición y estado.

## 5. IA de análisis

El LLM recibe únicamente un snapshot estructurado de métricas técnicas y anomalías. Ejemplo de entrada conceptual:

`{"window":"15m","endpoint_health":...,"ai_health":...,"integrations":...,"cost":...,"deployments":...}`

La salida debe ser estructurada:

- resumen ejecutivo;
- anomalías relevantes;
- hipótesis de causa;
- evidencia que respalda cada hipótesis;
- acción recomendada;
- prioridad;
- confianza;
- datos faltantes.

El LLM nunca ejecuta SQL destructivo, cambia configuración de producción, activa cobros ni modifica datos empresariales.

## 6. Arquitectura recomendada

`platform_events → agregator → platform_health_snapshots → anomaly_detector → platform_incidents → owner-ai-analysis → owner-control-tower`

El cálculo de métricas primarias es determinístico. La IA explica y prioriza.

## 7. UI objetivo

### Header
- estado global: Healthy / Degraded / Incident;
- última actualización;
- entorno;
- release.

### Health grid
- API;
- DB;
- IA;
- Billing/webhooks;
- WhatsApp;
- Jobs;
- CI/CD.

### Performance
- p50/p95/p99;
- errores por endpoint;
- tendencia 15m/1h/24h.

### IA
- requests;
- tokens;
- coste;
- fallbacks;
- proveedor/modelo;
- anomalías.

### Economía
- coste diario/mensual;
- coste IA/ingreso;
- alertas de presupuesto;
- consumo por plan en forma agregada.

### Incidentes
- timeline;
- severidad;
- detección;
- hipótesis IA;
- acciones recomendadas;
- estado.

## 8. Guardrails

- Owner-only server authorization.
- Sin `business_id` confiado desde headers para operaciones privilegiadas.
- Sin PII en snapshots de inteligencia.
- Sin contenido de conversaciones.
- Sin acciones destructivas automáticas.
- Sin activación automática de cobros reales.
- Budget kill-switch para proveedores/modelos de IA.

## 9. Estado de implementación al 2026-08-29

Implementado parcialmente:
- Owner-only route.
- `owner-metrics` server function.
- métricas agregadas de usuarios/negocios/eventos.
- tokens/coste/fallbacks/proveedores IA.
- `platform-telemetry` con validación server-side del negocio solicitado.

Pendiente antes de considerar Control Tower completo:
- p50/p95/p99 persistentes por endpoint;
- alert engine;
- incident history;
- CI/deployment health ingestion;
- webhook/job health;
- budget guardrails;
- snapshots técnicos sin PII;
- análisis LLM sobre snapshot técnico;
- tests de aislamiento y privacidad del Owner dataset.
