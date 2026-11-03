# LAUNCH_ROADMAP — Hoja de ruta hacia el lanzamiento

Fecha: 2026-11-03. Basado en el MASTER EXECUTION DIRECTIVE.

## SPRINT 0 — TAKEOVER (en curso)

- [x] Confirmar repositorio correcto (martinaburtoe-art/nuva-one)
- [x] Ejecutar git status, identificar branch y HEAD
- [x] Identificar modificaciones sin commit (9 archivos untracked)
- [x] Inspeccionar PR abiertos (#263, #266, #269, #270, #271, #272)
- [x] Inspeccionar workflows (37 activos)
- [x] Verificar conectividad con Supabase (B-002 resuelto)
- [x] Generar docs/launch/PROJECT_STATE.md
- [x] Generar docs/launch/COMPLETED_WORK.md
- [x] Generar docs/launch/BLOCKERS.md
- [x] Generar docs/launch/LAUNCH_ROADMAP.md (este archivo)
- [ ] Generar docs/launch/SECURITY_BOUNDARIES.md
- [x] Resolver conflictos PR #269 o crear rama limpia
- [x] Investigar fallo lint en PR #270 (mismo error de PR #269, necesita el fix de commit 2f371e39)
- [x] Evaluar merge de #263 y #266 (requiere aprobación — docs/launch/EVALUACION_PR_CONJUNTA.md)
- [x] Verificar CI definitivo de PR #269 (8/8 PASS, todos los checks verdes)

## SPRINT 1 — AGENCY RECOVERY

- [ ] Cerrar errores de ejecución de especialistas
- [ ] Reparar Finance (SPECIALISTS[agentId].execute is not a function)
- [ ] Certificar worker duradero
- [ ] Verificar leases expirados y misiones running
- [ ] Ejecutar misión real coordinada
- [ ] Certificar 13 especialistas individualmente

## SPRINT 2 — AGENCY CONTROL

- [ ] Orchestrator operativo
- [ ] Owner Console profesionalizado
- [ ] Logs y aprobaciones
- [ ] Métricas y automatización

## SPRINT 3 — PRODUCT READINESS

- [ ] Auditoría funcional integral
- [ ] Resolver P0/P1
- [ ] Onboarding, flujos empresariales
- [ ] Demo, seguridad, experiencia de usuario

## SPRINT 4 — LAUNCH READINESS

- [ ] Posicionamiento mercado Chile
- [ ] Planes y monetización
- [ ] Landing page
- [ ] Documentación comercial
- [ ] Proceso de captación

## SPRINT 5 — CONTROLLED LAUNCH

- [ ] Empresas piloto
- [ ] Validar operaciones
- [ ] Medir activación
- [ ] Corregir incidencias
- [ ] Preparar escalamiento

## Criterios de aceptación (resumen)

A. Producto: registro, login, onboarding, flujos empresariales, consistencia, responsive, demo
B. Seguridad: aislamiento empresas, roles, sin exposición de secretos, hallazgos críticos resueltos
C. Calidad: build PASS, TypeScript PASS, pruebas críticas PASS, E2E PASS
D. Infraestructura: Supabase saludable, GitHub Actions operativo, Vercel verificable, observabilidad
E. Agency: especialistas certificados, orchestrator operativo, worker duradero, persistencia, Owner Console
F. Comercial: propuesta de valor, planes documentados, demo lista, landing preparada
