# AGENCY_CONNECTIONS.md

Auditoría de conexiones de Nüva Agency — estado real verificado por llamada directa (CLI y API), no por configuración estática.

Generado: 2026-11-03 (sesión activa JARVIS)
Fuente de evidencia: llamadas directas a gh, supabase CLI, vercel CLI, web_extract.

---

## 1. GitHub — CONNECTED

| Campo | Valor |
|---|---|
| Estado | CONNECTED |
| Autenticación | gh CLI autenticado como `martinaburtoe-art` (token en credenciales del SO) |
| Repositorio | `martinaburtoe-art/nuva-one` |
| Rama principal | `main` (SHA: `939365b3`) |
| Rama de trabajo actual | `fix/reproducible-npm-ci-20261027` (@ `0e9a74ba`) |
| Operaciones posibles | Listar repos, PRs, issues, crear ramas, commits, PRs, revisar diffs, merge (pendiente autorización) |
| Operación real ejecutada | `gh repo view`, `gh pr list` (20 PRs abiertos), `gh issue list` (20+ issues), `gh issue view 260` |
| Agentes autorizados | Release, Orchestrator, Constructor, QA, Security |
| Bloqueos | Merge a main requiere autorización explícita del owner (PRs #263, #266, #269 listos pero sin merge) |
| Evidencia | Salida de `gh repo view` y `gh pr list` registrada en sesión |

PRs abiertos relevantes:
- #269 — MERGEABLE, CI 8/8 PASS, sin merge (pendiente autorización)
- #263 — MERGEABLE, checks verdes, sin merge
- #266 — MERGEABLE, checks verdes, sin merge
- #270 — MERGEABLE, 1 FAIL (lint/typecheck/test/audit/build), bloqueado
- #271, #272 — DRAFT

Issues abiertos relevantes:
- #260 — P0: "Agency no está entregando trabajo autónomo verificable". Evidencia de lectura remota de Supabase: 12 tareas failed, 3 completed, servicio de claims sin privilegios de service_role, migración de grants no aplicada remotamente.
- #259 — P0: fallo de CI en PR #269 (resuelto tras fixes cd8a4cea)
- #258 — P1: Worker durable smoke falló con max_attempts_exhausted

---

## 2. Supabase — CONNECTED (con bloqueos de privilegios)

| Campo | Valor |
|---|---|
| Estado | CONNECTED (CLI vinculado al proyecto remoto) |
| Autenticación | `supabase link --project-ref vnzyecnbdqbfuxawzrda` exitoso (OAuth vía manage_connections: `supabase_realm-kenner`) |
| Proyecto remoto | `vnzyecnbdqbfuxawzrda` — "Nüva One" |
| Región | us-east-2 |
| Estado | ACTIVE_HEALTHY |
| PostgreSQL | 17.6.1.104 |
| Host | db.vnzyecnbdqbfuxawzrda.supabase.co |
| Linked | true (tras `supabase link`) |
| Operaciones posibles | list projects, list functions, link project, db query (local: falla sin Docker; remoto: no probado directamente por CLI) |
| Operación real ejecutada | `supabase projects list` (2 proyectos: Nüva One ACTIVE_HEALTHY, reci-conti-prod INACTIVE), `supabase functions list` (6 funciones desplegadas) |
| Agentes autorizados | Security, Constructor, QA, Release, Orchestrator (lectura); migraciones/grants remotos bloqueados sin autorización |
| Bloqueos | Migración `20261030130000_agency_service_role_privileges.sql` preparada localmente pero NO aplicada remota (Issue #260). service_role sin privilegios SELECT confirmado por Issue #260 (lectura remota directa). T-20, T-21, T-22 bloqueados por esto. |
| Nota de seguridad | Proyecto `qajygywlobkdhdatixtg` (reci-conti-prod) INACTIVE — PROHIBIDO tocar (ReciConti) |

Edge Functions desplegadas en Supabase (reales, vía `supabase functions list`):

| Slug | Versión | verify_jwt | Última actualización |
|---|---|---|---|
| owner-metrics | 19 | true | 2026-10-XX |
| owner-create-complimentary-account | 17 | true | 2026-10-XX |
| owner-operational-metrics | 19 | false | 2026-10-XX |
| nuva-telegram-agency | 23 | false | 2026-10-XX |
| nuva-agency-ai-broker | 14 | false | 2026-10-XX |
| nuva-agency-worker-control | 16 | false | 2026-10-XX |

`nuva-agency-worker-control` v16 es la Edge Function con hardening OIDC pendiente (T-32). Actualmente valida solo issuer, repository, run_id, agent_id — falta audience, repository, owner, actor, ref main, workflow_ref exacto.

---

## 3. Vercel — CONNECTED

| Campo | Valor |
|---|---|
| Estado | CONNECTED (vercel CLI autenticado como `martinaburtoe-art`) |
| Autenticación | `vercel whoami` = martinaburtoe-art |
| Proyecto | `martinaburtoe/nuva-one` |
| URL producción | https://nuva-one.vercel.app (último deploy: 11h atrás, Ready) |
| URL preview | múltiples despliegues preview listos (últimos: 19m, 22m, 24m, etc.) |
| Operaciones posibles | list projects, list deployments, ver estado de build, promo preview → production (pendiente autorización) |
| Operación real ejecutada | `vercel whoami`, `vercel projects list`, `vercel ls nuva-one`, `web_extract` de https://nuva-one.vercel.app |
| Agentes autorizados | Release, QA, Security, Orchestrator |
| Bloqueos | Despliegue a producción requiere autorización explícita del owner |
| Evidencia | Contenido de homepage verificado: "Nüva One — La inteligencia de tu negocio, en un solo lugar" con módulos ventas, inventario, finanzas, CRM, reportes |

---

## 4. Slack — NOT_CONNECTED

| Campo | Valor |
|---|---|
| Estado | NOT_CONNECTED |
| Autenticación | No autenticada |
| Herramienta disponible | `slack.SEND_MESSAGE` (deferred, requiere conexión previa) |
| Operaciones posibles | Ninguna sin conexión |
| Operación real ejecutada | Ninguna |
| Agentes autorizados | Sentinel, Orchestrator (si se conecta) |
| Qué falta | Conexión OAuth de Slack vía manage_connections (account de workspace) |
| Bloqueo | No se puede enviar mensajes de prueba ni monitorear canales sin conectar |

---

## 5. Odoo — NOT_CONNECTED

| Campo | Valor |
|---|---|
| Estado | NOT_CONNECTED |
| Autenticación | No hay conector disponible |
| Herramienta disponible | Ninguna en el catálogo de Hermes |
| Operaciones posibles | Ninguna |
| Operación real ejecutada | Ninguna |
| Agentes autorizados | Sales, Supply, Finance (si se conecta) |
| Qué falta | Conector Odoo (no existe en el catálogo actual) o credenciales de API para acceso directo |
| Nota | Desde memoria previa: Scarlata Entrega 2 Fase 1 se verificó en Odoo DEMO, pero eso es un proyecto distinto (Scarlata, no Nüva One). No hay evidencia de conexión Odoo activa para Nüva One. |

---

## 6. Servicios de IA y proveedores de modelos — CONNECTED

| Campo | Valor |
|---|---|
| Estado | CONNECTED |
| Modelo principal | `nvidia/nemotron-3.5-super-vl-120b-a12b` (6s/dec, sin visión) |
| Modelo secundario | `glm-5.3` (lento, 15-500s, sin visión; visión vía Gemini free tier ~20 req/día) |
| STT | Groq (solo speech-to-text) |
| TTS | Gemini (OK) |
| Operaciones posibles | Inferencia de texto, generación de código, análisis de documentos |
| Operación real ejecutada | Todas las respuestas de esta sesión usan el modelo activo |
| Agentes autorizados | Todos (vía Hermes) |
| Bloqueos | glm-5.3 sin visión; Gemini con límite de ~20 req/día (riesgo de 429) |

---

## 7. Otras aplicaciones

| Aplicación | Estado | Notas |
|---|---|---|
| Google (Gmail/Calendar/Drive) | CONNECTED (OAuth OK, martinaburtoe@gmail.com) | Usado para briefing diario 10:30 |
| Telegram | ON (@marti_manoderecha_bot) | Gateway OK, usado para notificaciones |
| Brave | Navegador principal (en uso activo) | No manejar sin coordinar |
| Chrome | Sesión Google activa | Puerto 1 bloqueado por Chrome |

---

## Resumen de clasificación

| Integración | Clasificación | Última verificación | Qué falta |
|---|---|---|---|
| GitHub | CONNECTED | `gh pr list` exitoso | Autorización de merge |
| Supabase | PARTIAL | CLI vinculado, funciones listadas | Privilegios service_role (Issue #260), migración remota no aplicada |
| Vercel | CONNECTED | `vercel whoami` + `vercel ls` exitosos | Autorización de deploy producción |
| Slack | NOT_CONNECTED | manage_connections: connected=false | OAuth de workspace |
| Odoo | NOT_CONNECTED | No hay conector | Conector o credenciales API |
| IA (nvidia/nemotron) | CONNECTED | Sesión activa | Ninguno |
| IA (glm-5.3) | CONNECTED (lento) | Sesión activa | Visión nativa |
| Google (Gmail/Calendar) | CONNECTED | OAuth OK | Ninguno |
| Telegram | ON | Bot @marti_manoderecha_bot | Ninguno |

**Regla aplicada:** No se declara operativa ninguna integración solo por existir variable de entorno o archivo de configuración. Cada clasificación se basa en llamadas directas exitosas o en evidencia de bloqueo específica.