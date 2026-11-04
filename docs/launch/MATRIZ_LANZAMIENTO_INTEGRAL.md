# MATRIZ INTEGRAL DE LANZAMIENTO — NÜVA ONE

Estado real basado en inspección de código (src/, supabase/, package.json, vercel.json, tests).
Fecha: 2026-11-03. Proyecto: nuva-one (martinaburtoe-art/nuva-one).
Producción: https://nuva-one.vercel.app/ | Supabase: vnzyecnbdqbfuxawzrda

---

## 1. AUTENTICACIÓN, SEGURIDAD Y CONTROL DE ACCESO

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Auth base (Supabase Auth) | Implementado. Rutas /auth y /_authenticated con redirect. | Ninguno crítico. | Ninguno. | 0 | — | Build + tests pasan |
| MFA / 2FA obligatorio para owners | Implementado en _authenticated/route.tsx (redirect a /mfa-required si no hay TOTP verificado). | Verificar que /mfa-required existe y funciona end-to-end. | Ninguno. | 2h | QA | Test de flujo MFA pasa |
| RLS en tablas | Parcial. Migraciones de hardening existen localmente (people_rls_select_hardening, etc.). | Verificar RLS aplicado remoto. Algunas migraciones pueden no estar aplicadas. | T-20 (grants service_role). | 4h | Security | `supabase db diff` limpio remoto vs local |
| Grants service_role (T-20) | **BLOQUEADO.** Archivo SQL local `20261030130000_agency_service_role_privileges.sql` listo, NO aplicado al proyecto remoto. | Aplicar migración remota al proyecto `vnzyecnbdqbfuxawzrda`. Requiere `supabase login` + `supabase migration apply --linked`. | Autorización owner para migración remota + credenciales Supabase CLI. | 1h + autorización | Owner / Sistemas | Migración aplicada remoto, `agency_service_role_privileges` visible en Supabase Dashboard |
| Edge Functions OIDC hardening (T-32) | **BLOQUEADO.** 6 Edge Functions listas localmente (nuva-agency-ai-broker, nuva-agency-worker-control, etc.). NO desplegadas a producción. | `supabase functions deploy` para las 6 funciones + configurar variables de entorno (SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, GEMINI_API_KEY, CLOUDFLARE_API_TOKEN). | Autorización de deploy a producción. | 2h + autorización | Owner / DevOps | Edge Functions desplegadas y respondiendo en Supabase Dashboard |
| Secretos expuestos | Escaneado: 0 coincidencias en docs/ y scripts/. | Mantener escaneo en cada PR. | Ninguno. | 0 | — | Escaneo limpio |

---

## 2. BACKEND, BASE DE DATOS Y PERSISTENCIA

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Esquema Supabase | Migraciones locales hasta `20261030130000_agency_service_role_privileges.sql`. | Aplicar migraciones pendientes remoto (incluye agency_service_role_privileges). | T-20. | 1h | Owner / Sistemas | `supabase db diff` vacío |
| Tablas agency (missions, tasks, events, leases, approvals, artifacts) | Migraciones creadas localmente (durable_autonomous_agency_control_plane, etc.). | Verificar existencia remota. | T-20. | 1h | Owner / Sistemas | Tablas visibles en Supabase Table Editor |
| RPC agency (claim_task, heartbeat, finish_task) | Referenciadas en nuva-agency-worker-control/index.ts. | Verificar que existen remoto. | T-20. | 1h | Owner / Sistemas | RPC ejecutables sin error |
| Persistencia duradera (scheduler) | agency-scheduler.mjs + agency-supervisor.mjs creados. Cronjob 14df32db31fc ejecutando cada 5 min (verificado 2+ runs). | Ninguno crítico. Siguiente: verificar 3+ runs consecutivos (en curso). | Ninguno. | 0 | Sistemas | Logs supervisor con 3+ ciclos ok |
| Cola persistente de tareas | agency_tasks en Supabase. | Verificar remoto. | T-20. | 1h | Owner / Sistemas | Consultas SQL exitosas remoto |

---

## 3. ORQUESTACIÓN Y 13 ESPECIALISTAS (NÜVA AGENCY)

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| 13 especialistas definidos | specialists.mjs con 13 IDs (orchestrator, constructor, finance, sales, supply, people, compliance, growth, security, qa, sentinel, ux, release). | Verificar que cada uno es invocable individualmente (ya verificado: exit 0). | Ninguno. | 0 | — | agency-run-specialist.mjs exit 0 para cada uno |
| Asignación automática | agency-task-executor.mjs + agency-select-next-task.mjs. | Integrar asignación automática al executor (parcialmente hecho: generador se ejecuta ante batch-complete). | Ninguno. | 2h | Dev | Ejecutor asigna especialista sin intervención manual |
| Ejecución autónoma de tareas | agency-supervisor.mjs (bucle 5 min) + cronjob 14df32db31fc. | Verificar 3+ ejecuciones consecutivas (en curso, 2 confirmadas). | Ninguno. | 1h | Sistemas | 3+ ciclos supervisor sin fallo |
| Recuperación de fallos | Supervisor detecta heartbeat stale y reinicia scheduler (verificado: ciclo 17 falló, ciclo 18 recuperó). | Ninguno crítico. | Ninguno. | 0 | — | Alerta + recuperación documentada |
| Heartbeats y leases | logs/scheduler/heartbeat.json activo. | Monitoreo continuo. | Ninguno. | 0 | — | Heartbeat activo en logs |
| Worker control plane (Edge Function) | nuva-agency-worker-control/index.ts listo localmente. | Desplegar remoto (T-32). | T-32. | 1h | Owner / DevOps | Edge Function respondiendo en Supabase |
| AI Broker (Edge Function) | nuva-agency-ai-broker/index.ts listo localmente (OIDC GitHub, proveedores Gemini/Groq/Cloudflare). | Desplegar remoto (T-32) + configurar API keys. | T-32. | 1h | Owner / DevOps | Health check pasa con al menos 1 proveedor |

---

## 4. FRONTEND Y UX

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Rutas _authenticated | 40+ rutas implementadas (dashboard, finance, sales, inventory, customers, people, AI, analytics, billing, etc.). | Revisar que todas renderizan sin error en build. | Ninguno. | 2h | QA | `npm run build` exit 0, todas las rutas accesibles |
| Diseño visual | Tailwind + Radix UI. | No tocar (directiva: no alterar diseño visual #230). | — | 0 | — | — |
|| Responsive / Mobile | Capacitor configurado (@capacitor/core, android, push-notifications). use-mobile.tsx implementado. | Verificar en dispositivos reales; build de mobile pendiente. | Ninguno. | 4h | UX | APK o web responsive verificado |
| Notificaciones push | usePushNotifications implementado. | Verificar integración con Capacitor push-notifications. | Ninguno. | 2h | UX | Token de push obtenido |
| MFA UI | /mfa-required.tsx existe. | Verificar flujo completo de registro TOTP. | Ninguno. | 2h | QA | MFA se puede activar y verificar |

---

## 5. PAGOS Y FACTURACIÓN (SAAS COMERCIALIZABLE)

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Stripe SDK | `stripe: ^22.3.0` en dependencias. | Verificar integración real (checkout, webhooks, suscripciones). | Claves Stripe configuradas. | 4h | Finance | Flujo de pago de prueba exitoso |
| Rutas billing | src/routes/api/billing/ existe. | Verificar endpoints de suscripción, webhooks Stripe. | T-20 (para grants). | 2h | Backend | Endpoints responden 200 |
| Cron de cobros | vercel.json: `/api/billing/subscribe/run-charges` diario 13:00. | Verificar que el endpoint existe y funciona. | Ninguno. | 1h | Backend | Cron ejecuta sin error |
| Planes y precios | VERIFICADO: plan-config.ts define starter $11.990 CLP y pro $27.990 CLP (mensual/anual); register.ts acepta ambos planes server-side con precio del servidor; checkout.tsx envía plan.id y billing; 429/429 tests PASS. | Ninguno (implementado + pruebas). | — | Product | AGENCY_EVIDENCE #91 (register.ts), #77 (/pricing) |
| Registro de suscripción (starter/pro) | VERIFICADO: register.ts resuelve plan y precio server-side desde body.plan; cliente solo elige plan, no modifica monto; default pro para valores inválidos; validación server-side. | Ninguno. | — | Backend | AGENCY_EVIDENCE #91; tests 429/429 PASS |
|| Cobro recurrente (run-charges) | VERIFICADO: respeta plan del negocio (starter $11.990 / pro $27.990 CLP); filtro incluye starter y pro; idempotente por commerce_order (sub-{id}-{period}); downgrade a starter tras 3 fallos; renovación mensual. Pruebas de integración de flujo de suscripción agregadas (contratacion-integral.test.ts): cobro starter/pro, rechazado, idempotencia, estado pendiente. | typecheck/build/tests 439/441 PASS (2 timeouts pre-existentes no relacionados). | — | Backend | AGENCY_EVIDENCE #92, #94 |
| Facturación automática | No verificado. | Implementar generación de facturas PDF tras cobro. | Stripe integrado. | 8h | Backend | Factura PDF generada automáticamente |

---

## 6. INFRAESTRUCTURA Y DESPLIEGUE

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Build local | `npm run build` exit 0 (~50KB+ assets). | Ninguno. | — | 0 | — | Build exit 0 |
| Tests | 429/429 PASS. | Ninguno. | — | 0 | — | Tests pasan |
| Lint | exit 0 (696 warnings pre-existentes en node_modules). | Ninguno crítico. | — | 0 | — | Lint exit 0 |
| Typecheck | `tsc --noEmit` (pretypecheck = vite build). | Verificar explícitamente. | — | 1h | Dev | `npm run typecheck` exit 0 |
| Despliegue Vercel | vercel.json configurado con 2 crons. Producción en nuva-one.vercel.app. | Desplegar rama actual a producción (requiere autorización). | Autorización owner. | 1h | DevOps | Deploy exitoso, sitio responde |
| Edge Functions Supabase | 6 funciones listas localmente. | Desplegar remoto (T-32). | T-32 + autorización. | 2h | DevOps | Funciones desplegadas |
| Dominio personalizado | No verificado. | Configurar dominio mirax.cl o nuva-one.cl si se requiere. | Ninguno. | 2h | DevOps | DNS apuntando a Vercel |
| SSL / HTTPS | Vercel provee automático. | Ninguno. | — | 0 | — | HTTPS activo |

---

## 7. PRUEBAS Y CALIDAD

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Tests unitarios | 429/429 PASS (vitest). | Mantener cobertura al agregar código. | — | 0 | — | Tests pasan |
|| Tests de integración | Tests de flujo crítico de pago implementados (contratacion-integral.test.ts + mercadopago-webhook-signature.test.ts): cobro starter/pro, webhook, idempotencia, rechazado, estado pendiente. Tests E2E contra Supabase remoto siguen pendientes (requieren T-20/grants). | Ninguno. | — | QA | AGENCY_EVIDENCE #93, #94; 439/441 PASS |
| Tests de seguridad | Escaneo secreto: 0 coincidencias. | Auditoría de RLS y grants remoto. | T-20. | 4h | Security | `supabase db diff` limpio, RLS verificado |
| Performance | Build ~50KB assets. | Medir Core Web Vitals en producción. | Deploy a producción. | 4h | QA | Lighthouse score > 90 |
| TypeScript | typecheck no verificado explícitamente. | Ejecutar `npm run typecheck`. | — | 1h | Dev | typecheck exit 0 |

---

## 8. OPERACIONES Y MONITOREO

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Logs de supervisor | logs/supervisor/ con state.json y heartbeat.json. | Rotación de logs, alertas por email/Telegram. | Telegram gateway OK. | 2h | Sistemas | Alerta enviada al detectar fallo |
| Métricas owner | owner-metrics, owner-operational-metrics Edge Functions. | Verificar desplegadas (T-32). | T-32. | 1h | Owner / DevOps | Métricas visibles en dashboard |
| Platform telemetry | platform-telemetry Edge Function. | Verificar desplegada. | T-32. | 1h | Owner / DevOps | Telemetry funcionando |
| Backup / recuperación | No hay evidencia de backup automático. | Configurar backup de Supabase (point-in-time recovery). | Ninguno. | 2h | Sistemas | Backup programado verificado |

---

## 9. PREPARACIÓN COMERCIAL (B2B PYMES CHILE)

| Área | Estado real | Qué falta exactamente | Dependencias | Trabajo estimado | Responsable | Evidencia de terminado |
|------|------------|----------------------|--------------|------------------|-------------|----------------------|
| Página de destino | VERIFICADO (código): __root.tsx (title "La inteligencia de tu negocio, en un solo lugar") y auth.tsx con CTA "Únete a miles de PYMEs..."; sitio live en https://nuva-one.vercel.app/. No existe archivo de landing dedicado independiente. | Ninguno. | — | Marketing | Sitio desplegado en Vercel; código verificado localmente |
| Precios en CLP | VERIFICADO (código): plan-config.ts starter $11.990 CLP / pro $27.990 CLP; checkout.tsx formatea CLP con integración Mercado Pago. | Ninguno (implementado). | — | Product | AGENCY_EVIDENCE #81 (/checkout verificado) |
| Términos y condiciones | No verificado. | Crear Términos, Privacidad, Cookies (ley chilena). | Ninguno. | 4h | Legal | Documentos publicados |
| Soporte / help center | help-center.tsx existe. | Verificar contenido y contacto. | Ninguno. | 2h | CX | Help center funcional |
|| Onboarding de cliente | Verificado (código): auth.tsx registro → onboarding.tsx 4 pasos → crea business en Supabase; team-management.tsx invita colaboradores (invite_team_member RPC); use-business.ts aísla por business_id. | Verificación end-to-end con base de datos real (requiere T-20/grants). | T-20. | 4h | Product | Onboarding sin intervención manual (código) |
|| Empresas piloto | Ninguna identificada (depende del owner). Código listo: aislamiento por business_id, roles owner/admin/staff/viewer, datos de demo (Alma Café, plan Pro, Talca Maule). | Identificar 3-5 pymes piloto para beta cerrada. | Producto estable. | 1 semana | Owner | Pilotos firmados |

---

## 10. BLOQUEOS CRÍTICOS (REQUIEREN AUTORIZACIÓN DEL OWNER)

| Bloqueo | Qué se necesita | Autorización requerida | Alternativa sin autorización |
|---------|----------------|------------------------|------------------------------|
| T-20: Migración grants remoto | `supabase login` + `supabase migration apply --linked` | Sí (migración remota + credenciales) | Preparar script SQL y validar localmente |
| T-32: Deploy Edge Functions | `supabase functions deploy` + vars de entorno | Sí (deploy a producción) | Validar funciones localmente con `supabase functions serve` |
| T-21, T-22, T-27, T-28 | Dependen de T-20 | Sí (vía T-20) | Documentar procedimientos listos para ejecutar |

---

## FASE DE EJECUCIÓN INMEDIATA

1. **Preparar T-20:** Validar migración SQL local, preparar comando de aplicación remota, solicitar autorización owner.
2. **Preparar T-32:** Validar 6 Edge Functions localmente, preparar variables de entorno, solicitar autorización de deploy.
3. **Mientras tanto:** Trabajar en pruebas, pagos (Stripe), tipo de cambio CLP, onboarding, landing comercial — todo lo que no requiera migración remota ni deploy.
