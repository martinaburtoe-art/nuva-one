# Nüva One — Market Readiness Audit

**Fecha:** 2026-08-25
**Objetivo:** fase de pruebas / primeros clientes reales con 100 usuarios concurrentes como escenario de diseño.

## 1. Veredicto ejecutivo

Nüva One ya tiene una base técnica considerable para entrar en una fase controlada de pruebas: multi-tenant con RLS, autorización server-side para IA, memoria de conversaciones, límites de IA, módulos operacionales/financieros/tributarios, telemetría de plataforma, Owner Console, CI de migraciones limpias y un arnés de load test.

**No debe abrirse todavía a tráfico público ilimitado.** El principal riesgo de la siguiente etapa no es la existencia de una función aislada: es la combinación de concurrencia + consultas agregadas + generación IA + operaciones financieras + integraciones externas + observabilidad insuficiente para detectar degradación antes de que el usuario la perciba.

La estrategia recomendada es una beta controlada de 25 → 50 → 100 usuarios concurrentes, con un proyecto Supabase de staging separado y cuentas sintéticas, antes de habilitar el mismo nivel de carga en producción.

## 2. Arquitectura actual observada

- Frontend: React 19 + TanStack Router/Start + Vite.
- Backend: rutas server-side de TanStack Start/Vercel.
- Datos/auth: Supabase/PostgreSQL.
- IA: AI SDK 6 + proveedor OpenAI-compatible; producción actual configurada para Groq por defecto.
- Pagos: Stripe/Flow según integración.
- Email: Resend.
- Mobile: Capacitor/Android.
- Telemetría: plataforma + Supabase RPCs + Owner Console.
- Seguridad: RLS, helpers de membresía, rate limits, security-definer hardening, idempotencia e invariantes pgTAP.

## 3. Hallazgos críticos para la beta

### P0 — Capacidad de IA sin failover automático

El gateway actual selecciona un único proveedor/modelo por configuración. Groq ofrece capacidad muy alta, pero una ruta crítica de usuario no debe depender de un único proveedor. La arquitectura de producción debe tener:

1. proveedor primario de baja latencia/coste;
2. proveedor secundario independiente;
3. timeout de primer token;
4. timeout total;
5. fallback solo cuando todavía no se ha entregado contenido al usuario;
6. circuit breaker para evitar insistir sobre un proveedor degradado;
7. registro de proveedor/modelo/latencia/coste por solicitud.

La implementación recomendada es una capa de AI Gateway/fallback compatible con AI SDK, manteniendo el proveedor barato como primera opción y usando un modelo secundario de mayor calidad solo cuando sea necesario.

### P0 — Inteligencia empresarial debe separar cálculo de generación

Los KPIs, Nüva Score, CFO, cashflow, IVA, inventario, alertas y señales predictivas deben calcularse primero mediante funciones determinísticas/SQL/TypeScript y recién después usar el LLM para explicar, priorizar o generar recomendaciones.

**Nunca** enviar toda la base de la empresa al LLM para que haga las matemáticas.

Arquitectura objetivo:

`PostgreSQL → agregaciones/metricas → Intelligence Pipeline → snapshot empresarial → LLM → explicación/acción`.

Esto reduce tokens, latencia, costo y riesgo de alucinación.

### P0 — Owner Console aún no es un verdadero control plane

La consola actual tiene Overview, Growth, Product Health, Observability, Nüva IA, Economía y cuentas de cortesía, y recibe métricas agregadas protegidas server-side. Sin embargo, varias secciones todavía presentan elementos como “siguiente capa”.

Para beta debe convertirse en un centro de control operacional con:

- salud de plataforma;
- salud de base de datos;
- latencia p50/p95/p99;
- errores por endpoint;
- usuarios/empresas activas;
- IA: requests, éxito, 429, errores, tokens, coste estimado, modelo y proveedor;
- consumo por plan;
- coste por empresa;
- margen estimado por cliente;
- top tenants por consumo;
- anomalías;
- incidentes;
- estado de integraciones;
- estado de jobs/cron;
- kill switch de funciones costosas;
- feature flags para beta;
- historial de deployments;
- drill-down de tenant sin exponer contenido empresarial innecesario.

## 4. Concurrencia: simulación objetivo

El repositorio ya contiene `scripts/load-test.mjs`. El script autentica un usuario de prueba, obtiene su empresa y ejecuta en paralelo lecturas sobre clientes, productos, ventas, transacciones y cotizaciones. Requiere confirmación explícita y permite aumentar VUs gradualmente.

Escenarios obligatorios para staging:

### Escenario A — 25 VUs
- login/session;
- dashboard;
- clientes;
- productos;
- ventas;
- compras;
- caja;
- cotizaciones.

### Escenario B — 50 VUs
Mismo escenario con mezcla realista:
- 40% consultas dashboard/BI;
- 20% ventas;
- 15% inventario;
- 10% CRM;
- 10% finanzas;
- 5% IA.

### Escenario C — 100 VUs
Carga de aceptación para beta.

Objetivos:
- error rate < 1%;
- p95 de lecturas normales < 800 ms;
- p99 de lecturas normales < 1.5 s;
- operaciones transaccionales p95 < 1.5 s;
- ninguna violación cross-tenant;
- ningún stock negativo por carrera;
- ninguna duplicación de asiento/venta/pago por reintento;
- ningún timeout sostenido de Supabase;
- IA con fallback funcionando;
- errores 429 controlados y visibles.

**La prueba de 100 usuarios debe hacerse en staging primero.** No debe utilizarse una cuenta real ni una base productiva con datos reales para una prueba destructiva.

## 5. Riesgos de base de datos bajo carga

Supabase Pro incluye 8 GB de disco, 250 GB de egress y 100K MAU; además incluye créditos de compute suficientes para una instancia Micro. La capacidad de compute es independiente del tamaño lógico de la base y debe dimensionarse según carga.

Para la beta se recomienda comenzar con:

- Supabase Pro;
- Compute Small como baseline si la prueba de 50–100 VUs demuestra presión sobre CPU/latencia;
- Pooler/Supavisor;
- índices ya existentes y revisión de planes EXPLAIN para consultas BI;
- evitar SELECT masivos desde el frontend;
- paginación estricta;
- agregaciones materializadas/snapshots para dashboards pesados;
- tareas analíticas fuera del request interactivo.

No se recomienda pagar Medium desde el primer día sin medir: primero Small, luego Medium si los p95/p99 y CPU lo justifican.

## 6. IA — arquitectura recomendada

### Capa rápida
Modelo económico/rápido para:
- clasificación de intención;
- resúmenes;
- explicación de KPIs;
- respuestas simples;
- extracción estructurada.

### Capa analítica
Modelo más capaz para:
- diagnóstico empresarial;
- estrategia;
- análisis financiero complejo;
- explicaciones cruzadas entre módulos.

### Capa fallback
Proveedor independiente del primario.

### Capa determinística
SQL/TypeScript para:
- ventas;
- margen;
- cashflow;
- IVA;
- cuentas;
- stock;
- rotación;
- aging;
- Nüva Score;
- alertas.

El LLM debe explicar y decidir dentro de límites, no convertirse en la base de datos ni en la calculadora.

## 7. Presupuesto inicial de infraestructura

Valores en USD y conversión referencial usando dólar observado del Banco Central de Chile de $914,64 CLP/USD al 25-08-2026.

### Base mensual recomendada para beta

| Servicio | Configuración | USD/mes aprox. | CLP aprox. |
|---|---|---:|---:|
| Supabase | Pro + Small compute | $30 | $27.439 |
| Vercel | Pro | $20 | $18.293 |
| Resend | Free inicialmente / Pro si se requiere volumen | $0–20 | $0–18.293 |
| Cloudflare Turnstile | Free | $0 | $0 |
| Dominio .CL | $9.990/año, equivalente mensual | — | $833 |
| **Base** | sin IA variable | **$50–70** | **~$46.565–$64.858** |

No incluye comisiones de Stripe/Flow por ventas cobradas ni servicios externos opcionales.

### Mobile

- Google Play Console: US$25 una sola vez.
- Apple Developer Program: US$99/año.

### IA — orden de magnitud

Para 100 usuarios, no se debe asumir que cada uno agotará automáticamente su límite mensual. Para planificación conservadora se puede modelar 50.000 mensajes/mes.

Con un modelo Groq GPT-OSS 20B a $0,075/M input y $0,30/M output:

- 4K input + 800 output por mensaje → ~US$27/mes.
- 8K input + 1.2K output → ~US$48/mes.
- 12K input + 1.8K output → ~US$72/mes.

Con GPT-OSS 120B a $0,15/M input y $0,60/M output, los mismos escenarios son aproximadamente US$54, US$96 y US$144/mes.

La diferencia real dependerá de los tokens efectivamente usados. Por eso Nüva debe registrar input/output tokens por request y no presupuestar IA únicamente por “cantidad de mensajes”.

## 8. Coste objetivo por cliente

Para el modelo actual de planes, el sistema debe calcular:

`coste infraestructura asignable + coste IA + email + almacenamiento + soporte variable`

por empresa/mes.

Luego comparar contra ARPU.

Como regla de beta, el coste directo variable objetivo debe mantenerse muy por debajo del precio del plan. Si un cliente intensivo en IA consume una proporción excesiva del ingreso, el sistema debe reducir contexto, cambiar de modelo, limitar frecuencia o solicitar upgrade.

## 9. Seguridad para beta

Mantener como gates obligatorios:

- RLS en todas las tablas expuestas;
- membership check server-side;
- ningún `business_id` confiado por header sin verificación;
- RPC SECURITY DEFINER con `search_path` seguro y grants mínimos;
- vistas expuestas con seguridad apropiada;
- idempotencia para pagos, ventas, stock y asientos;
- rate limits por usuario y por tenant;
- protección anti-bot en login/signup;
- MFA para owner y cuentas privilegiadas;
- auditoría de acciones sensibles;
- rotación de claves antes de apertura pública;
- backups y prueba de recuperación;
- protección contra contraseñas filtradas en Supabase antes de beta pública.

## 10. Observabilidad mínima obligatoria

Owner debe recibir alertas cuando:

- error rate > 1%;
- p95 > objetivo durante 5 minutos;
- IA 429 > umbral;
- IA provider error > umbral;
- coste IA diario > presupuesto;
- egress > 70% de cuota;
- DB disk > 70%;
- DB CPU sostenida > 70%;
- crecimiento de tablas anormal;
- webhook fallando;
- pagos fallando;
- jobs atrasados;
- tenant con consumo anormal.

## 11. Gate de salida a beta

Nüva One puede pasar de preparación a beta cuando se cumplan simultáneamente:

- CI limpio en base nueva;
- pgTAP verde;
- typecheck/lint/tests/build verdes;
- staging 25 VUs verde;
- staging 50 VUs verde;
- staging 100 VUs verde;
- prueba de IA con proveedor primario y fallback;
- prueba de aislamiento tenant A/B;
- prueba de stock concurrente;
- prueba de asiento/pago idempotente;
- prueba de recuperación de backup;
- Owner Console con métricas operacionales reales;
- alertas configuradas;
- presupuesto mensual aprobado;
- dominio y correo transaccional configurados;
- términos, privacidad y consentimiento revisados;
- plan de soporte y canal de incidentes definido.

## 12. Prioridad de implementación

1. CI/migraciones limpias.
2. AI failover + timeouts + token/cost telemetry.
3. Owner Control Plane real.
4. Staging de carga.
5. 25/50/100 VU tests.
6. Optimización SQL/índices de consultas BI.
7. Snapshots de inteligencia empresarial.
8. Alertas y budget guardrails.
9. Seguridad anti-bot/MFA/backup recovery.
10. Beta cerrada con primeros clientes.

## 13. Decisión de infraestructura

**Recomendación:** no sobredimensionar todavía.

Stack de salida a beta:

`Vercel Pro + Supabase Pro/Small + Groq como capa rápida + proveedor secundario vía AI Gateway/fallback + Resend Free/Pro según volumen + Cloudflare Turnstile + dominio .CL + observabilidad Owner + load test staging.`

Subir Supabase a Medium solo si las pruebas demuestran necesidad. Subir a modelos caros solo para tareas que realmente requieren razonamiento superior.

La meta no es tener la infraestructura más cara: es tener una arquitectura que degrade con elegancia, controle costes y mantenga aislados los datos de cada MiPyme.
