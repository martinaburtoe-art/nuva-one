# Nüva One — Market Readiness Status

**Corte:** 2026-08-29  
**Base:** `docs/MARKET_READINESS_AUDIT_2026-08-25.md`

## Estado ejecutivo

Nüva One pasó de un audit de preparación a una fase de cierre técnico/comercial. La mayoría de los hallazgos P0 de seguridad y arquitectura ya tienen implementación en código o base de datos. El foco restante para una beta controlada es validación operativa: CI verde completo, carga en staging, observabilidad del control plane, configuración de producción y evidencia comercial.

## Cierre por hallazgo

### P0 — AI failover

**Estado: IMPLEMENTADO.**

`src/lib/ai-gateway.server.ts` mantiene proveedor primario configurable, proveedores fallback, circuit breaker, detección de errores reintentables y metadata de proveedor/modelo/tokens/costo. `api/chat` consume el gateway y registra proveedor/modelo en la conversación.

**Pendiente real:** ejecutar pruebas de degradación con proveedores reales y completar timeout de primer token/timeout total si el proveedor/AI SDK lo requiere en producción.

### P0 — Inteligencia determinística antes del LLM

**Estado: PARCIAL / EN EVOLUCIÓN.**

La plataforma ya dispone de módulos financieros, KPIs, Nüva Score, pricing calculations, costos y contexto empresarial compartido. El gateway de IA trabaja sobre un snapshot/contexto acotado en lugar de exponer toda la base.

**Pendiente real:** completar un pipeline formal y único de métricas determinísticas para Nüva Score, CFO, cashflow, IVA, inventario y alertas, con snapshots reutilizables por IA.

### P0 — Owner Console / control plane

**Estado: PARCIAL.**

Existen métricas de plataforma, telemetría y Owner Console.

**Pendiente real:** convertirlo en control plane operativo con p50/p95/p99, errores por endpoint, consumo/costo IA, costo por tenant, anomalías, incidentes, jobs, integraciones, feature flags y kill switches.

### P0 — Autorización multi-tenant de IA

**Estado: CERRADO.**

`/api/chat` valida JWT mediante claims, verifica membresía del `business_id`, aplica rate limit por usuario y usa `increment_ai_usage_monthly`. La función SQL es `SECURITY DEFINER` y vuelve a verificar membresía mediante `private.is_business_member` antes de consumir cuota.

### P1 — SECURITY DEFINER

**Estado: ENDURECIDO.**

Las funciones `increment_ai_usage` y `increment_ai_usage_monthly` tienen `search_path` explícito y sólo ejecución para `service_role`. Como hardening adicional, las funciones del esquema privado ya no tienen ejecución directa para `anon` ni `authenticated`; la migración aplicada es `20260829053557_lock_private_security_definer_execute`.

### P1 — Rate limiting

**Estado: IMPLEMENTADO.**

El chat tiene límite por usuario y la base posee RPC de rate limiting. El consumo de IA mensual se controla por tenant/plan mediante RPC atómico.

### Migraciones

**Estado: VERIFICADO EN PRODUCCIÓN Y CI EN EJECUCIÓN.**

La base gestionada contiene la secuencia completa de migraciones hasta `20260829053557_lock_private_security_definer_execute`. CI ya levanta un stack Supabase limpio, genera tipos y ejecuta pgTAP/recovery drill. La ejecución final del run actual debe quedar verde antes de considerar el gate CI cerrado.

### Producto/demo

**Estado: CERRADO.**

La aplicación y el demo cuentan con:

- Centro de Ayuda;
- Control Financiero Inteligente/finanzas;
- búsqueda de módulos;
- navegación mejorada;
- CTA `Visualizar Nüva` hacia el demo;
- Perfil público + Red de Contactos como capacidad gratuita para usuarios autenticados.

Se añadió además un Centro de Ayuda contextual dentro del demo.

### Pricing

**Estado: CERRADO COMO MODELO BETA.**

Modelo documentado en `docs/PRICING_MODEL.md`:

- Start: $11.990 CLP/mes;
- Pro: $27.990 CLP/mes;
- anual equivalente a ~10 meses pagados;
- límites de IA y recursos por plan;
- Perfil público/Red de Contactos fuera del gating premium.

### Pagos

**Estado: PARCIAL.**

La base contiene la evolución hacia billing chileno/Mercado Pago, pero el flujo de cobro real debe validarse de punta a punta antes de activar pagos de producción. No se debe cobrar dinero real durante pruebas sin verificación explícita.

### Concurrencia

**Estado: PENDIENTE DE VALIDACIÓN DE STAGING.**

El repositorio dispone de load test y CI de base de datos. Falta ejecutar formalmente 25/50/100 VUs en staging con métricas de p95/p99 y aislamiento tenant.

### Seguridad Auth

**Estado: PENDIENTE DE CONFIGURACIÓN EXTERNA.**

El asesor de seguridad del proyecto Supabase accesible reporta `auth_leaked_password_protection` deshabilitado. La migración histórica intenta habilitarlo, pero el estado efectivo del proyecto gestionado sigue indicando WARN. Esta configuración debe activarse en Auth settings del proyecto antes de beta pública.

## Pendientes de salida a beta

1. CI verde completo en el HEAD final.
2. Validar failover/timeouts de IA en staging.
3. Completar pipeline determinístico de inteligencia empresarial.
4. Completar Owner Control Plane.
5. Ejecutar carga 25/50/100 VUs.
6. Verificar configuración de producción/Vercel y proveedores externos.
7. Validar billing chileno end-to-end en modo sandbox.
8. Activar leaked-password protection en Supabase Auth.
9. Backup/restore drill.
10. Revisión legal de términos, privacidad, tratamiento de datos y consentimiento.
11. Primera beta cerrada con métricas de uso y unit economics.
