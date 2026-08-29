# Nüva One — Auditoría extrema de readiness para beta

**Fecha:** 2026-08-29  
**Alcance:** preparación para beta/staging con usuarios reales  
**Principio:** evidencia real; ausencia de evidencia = no verificado.

## Veredicto ejecutivo

**🔴 NO LISTO TODAVÍA para invitar usuarios reales.** La base es suficientemente avanzada para una beta técnica controlada, pero existen bloqueantes que deben cerrarse antes de una beta con datos reales: el pipeline CI actual llega a `pgTAP` y recovery correctamente, pero el job de aplicación falla en `typecheck`; no existe evidencia real de load test 25/50/100 VUs; Auth leaked-password protection no está verificado en el proyecto real; y el flujo de billing sandbox no ha sido demostrado end-to-end.

Además, la auditoría estática detectó un riesgo de integridad de stock: la lógica de `apply_sale_effects()` descuenta stock para estados `paid` **y `pending`**, y usa `GREATEST(0, stock - qty)`, lo que puede ocultar overselling en lugar de rechazar atómicamente una venta sin stock suficiente. Esto debe corregirse y cubrirse con una prueba de concurrencia antes de beta.

## 1. Funcionalidad y producto — ⚠️ Listo con reservas

### Evidencia
- El árbol del repositorio contiene rutas para dashboard, IA, analytics, automatizaciones, billing, caja, clientes, inteligencia, onboarding y Owner Control Tower.
- `src/lib/biz-data.ts` centraliza CRUD tenant-scoped usando `business_id` del negocio activo y las operaciones se apoyan adicionalmente en RLS.
- La migración base crea módulos operacionales `customers`, `suppliers`, `products`, `sales`, `purchases`, `transactions`, `quotes`, `automations`, `marketing_posts` y `audit_log`, todos con `business_id` y RLS habilitable desde el esquema inicial.
- La auditoría histórica de mercado confirma que demo, Centro de Ayuda, Control Financiero, búsqueda y Perfil/Red ya fueron implementados.

### Riesgos encontrados
- No se pudo ejecutar una navegación E2E de cada módulo desde este entorno; por tanto, no se declara funcionamiento E2E.
- En ventas, el cliente limita visualmente la cantidad al stock actual, pero la integridad final debe residir en una operación transaccional/DB atómica.

### Acción requerida
- E2E manual/automatizado de cada módulo crítico.
- Corregir el overselling y agregar prueba de carrera de stock.

## 2. Seguridad — ⚠️ Listo con reservas

### Evidencia
- Las tablas base de negocio usan RLS y políticas basadas en `is_business_member()`.
- `biz-data.ts` filtra lecturas por `active.id`; no debe considerarse esto una frontera de seguridad por sí misma: la frontera real es RLS/server authorization.
- `platform-telemetry` verifica el `business_id` enviado contra `owner_id` antes de asociarlo a un negocio.
- El hardening SECURITY DEFINER histórico está documentado como cerrado y el CI actual valida el esquema limpio.

### Hallazgo de privacidad
`platform-telemetry` actualmente inserta `user_id` junto con eventos técnicos. Esto contradice el requisito actual del Owner Control Tower de operar sobre señales agregadas y técnicas sin datos personales. Debe rediseñarse para eliminar/anonimizar identificadores personales del dataset que consume Owner Intelligence, salvo que exista una justificación y control explícitos fuera de ese dataset.

### No verificado
- Estado efectivo de leaked-password protection en Supabase Auth.
- MFA del owner.
- Configuración real de CORS/rate limits en todos los endpoints públicos.
- Ausencia total de secretos en todos los bundles.

## 3. Base de datos e integridad — ⚠️ Listo con reservas

### Evidencia
- Run CI `33237275416` sobre commit `137c7e5f552617d2f1853f72e71ed01ea4f377e0` terminó correctamente en: migration integrity, startup limpio de Supabase, generación de tipos, 141 pgTAP tests y recovery drill.
- El aprendizaje de constraints de productos quedó confirmado: `products_business_id_id_key` sostiene FKs compuestas de `product_codes` y `customer_activities`; la constraint redundante correcta era `products_business_id_id_unique`.
- Schema real de `purchases` confirmado desde la migración inicial: `id`, `business_id`, `supplier_id`, `supplier_name`, `status`, `total`, `notes`, `purchase_date`, `created_at`; posteriormente se agregan `items`, `stock_applied` y `transaction_id`.

### Bloqueante
`apply_purchase_effects()` y `apply_sale_effects()` deben auditarse para concurrencia y reversión. En ventas, `pending` ya aplica stock y `GREATEST(0, ...)` evita negativos pero puede aceptar una venta que excede disponibilidad. Esto no es suficiente para un ERP/POS de beta real.

### No verificado
- Revisión exhaustiva en vivo de todas las tablas/objetos del proyecto Supabase.
- EXPLAIN/ANALYZE sobre producción/staging con volumen real.

## 4. CI/CD y calidad — 🔴 No listo

### Evidencia
Run `33237275416`:
- `pgTAP database tests`: **success**.
- migration integrity: **success**.
- Supabase startup: **success**.
- 141 pgTAP tests: **success**.
- recovery drill: **success**.
- `Lint, typecheck, test, audit, build`: **failure**.
- lint: **success**.
- dependency security audit: **success**.
- typecheck: **failure**.
- unit tests/build: **skipped** por la dependencia del typecheck.

Por tanto Gate CI no está cerrado. El error exacto de TypeScript debe extraerse del log del job `99060587960` y corregirse antes de volver a ejecutar el pipeline completo.

## 5. Rendimiento y escalabilidad — 🔴 No listo

` scripts/load-test.mjs` existe y exige explícitamente `LOAD_TEST_CONFIRM=true` y `LOAD_TEST_ENV=staging`; además rechaza URLs de producción. Esto es una buena barrera de seguridad.

No existe evidencia de ejecución real 25/50/100 VUs en esta auditoría. El workflow de carga no puede considerarse aprobado por la mera existencia del script.

Debe ejecutarse contra Supabase de staging aislado y registrar p50/p95/p99, error rate y fallos de usuario.

## 6. Pagos y billing — ⚠️ Listo con reservas

### Evidencia
- `src/lib/plan-config.ts` es la fuente central: Start $11.990/mes, $119.900/año; Pro $27.990/mes, $279.900/año.
- El endpoint `/api/billing/subscribe/register` usa Mercado Pago como proveedor canónico, verifica autenticación y acceso al negocio mediante el cliente autenticado y aplica rate limit.
- El endpoint devuelve una URL de Mercado Pago y guarda el preapproval como estado `pending`.

### Inconsistencia encontrada
La UI de checkout inspeccionada contiene comentario/copy histórico de Flow, mientras el endpoint real usa Mercado Pago. Esto debe eliminarse para evitar confusión y ya constituye una señal de drift entre UI y backend.

### No verificado
- Sandbox E2E real: checkout → webhook → activación → renovación → cancelación → fallo/reembolso.
- Firma HMAC del webhook en ejecución real.
- Cobros reales: deliberadamente NO se activan.

## 7. Infraestructura/configuración — ⚠️ Listo con reservas

### Evidencia
- CI usa Node 22 y npm ci.
- Existe `.env.example` y configuración de Vercel/Supabase documentada en el proyecto.
- Owner Control Tower consume una Edge Function `owner-metrics` protegida por autenticación y `platform_role=owner` en la ruta.

### No verificado
- Variables reales del proyecto Vercel.
- Dominios/certificados finales.
- Emails transaccionales E2E.
- Observabilidad de errores de producción suficientemente completa.

## 8. Legal/compliance — 🔴 No verificado

No se obtuvo evidencia suficiente en esta sesión para declarar accesibles y vigentes Términos y Condiciones, Política de Privacidad y consentimiento correspondiente. Deben verificarse antes de invitar usuarios reales.

## 9. UX/onboarding/soporte — ⚠️ Listo con reservas

Existe ruta de onboarding y Centro de Ayuda, pero no se ejecutó una sesión E2E con usuario nuevo en este entorno. Debe comprobarse:

`registro → confirmación → creación/configuración negocio → dashboard → primera venta/cliente/producto → primera métrica de valor`.

También debe existir un canal visible para bugs/feedback de beta.

## Owner Control Tower — estado actual

La implementación existente consume `owner-metrics`, presenta usuarios, negocios, eventos, IA, tokens, coste estimado, fallbacks y proveedores, y se encuentra protegida para owner. Sin embargo, no es todavía un control plane completo en tiempo real: falta latencia por endpoint, error rate temporal, uptime/deploy status, webhooks, jobs, alertas, incidentes, budget guardrails y análisis IA persistente.

## Owner Intelligence — especificación aprobada

### Datos permitidos
- p50/p95/p99 de endpoints.
- HTTP status/error rate.
- latencia y errores IA.
- tokens/coste/modelo/proveedor.
- conteos agregados por módulo.
- salud de webhooks/jobs/deployments.
- CPU/DB/storage/egress agregados cuando estén disponibles.

### Datos prohibidos para Owner Intelligence
- email, teléfono, nombre, contenido de conversaciones.
- prompts/respuestas de usuarios.
- navegación individual.
- IDs personales como dimensión analítica del Owner.
- contenido empresarial de un tenant salvo agregados técnicos estrictamente necesarios.

### Pipeline objetivo
`telemetría técnica → agregación temporal → detección determinística de anomalías → snapshot de plataforma → LLM solo sobre snapshot → recomendación → historial de incidentes`.

El LLM no calcula métricas primarias ni recibe bases empresariales completas.

## Gate de beta

**Estado actual: 🔴 NO PASA.**

Bloqueantes prioritarios:

1. Corregir TypeScript y conseguir CI completo verde, incluyendo unit tests y build.
2. Corregir stock concurrency/overselling y agregar pruebas de carrera.
3. Ejecutar load test real 25/50/100 VUs en staging.
4. Verificar Auth leaked-password protection en el proyecto real.
5. Ejecutar Mercado Pago sandbox E2E.
6. Verificar términos, privacidad, emails y canal de soporte.
7. Eliminar PII del dataset de Owner Intelligence y ampliar observabilidad.

## Evidencia principal

- CI run `33237275416` y jobs `99060334356` / `99060587960`.
- `supabase/migrations/20260622002712_0649104d-1a19-4220-bca0-84ee0dbe7696.sql`.
- `supabase/migrations/20260622010100_integrate_sales_purchases_inventory_finance.sql`.
- `scripts/load-test.mjs`.
- `supabase/functions/platform-telemetry/index.ts`.
- `supabase/functions/owner-metrics/index.ts`.
- `src/routes/owner-control-tower.tsx`.
- `src/lib/plan-config.ts`.
- `src/routes/api/billing/subscribe/register.ts`.
- `docs/PRICING_MODEL.md`.
