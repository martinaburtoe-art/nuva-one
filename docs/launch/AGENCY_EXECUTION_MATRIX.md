# AGENCY_EXECUTION_MATRIX.md

Matriz de capacidades reales: qué especialistas pueden actuar en cada aplicación, basada en conexiones verificadas y permisos efectivos.

Generado: 2026-11-03
Fuente: AGENCY_CONNECTIONS.md, AGENCY_AGENT_CAPABILITIES.md, evidencia de llamadas directas a gh, supabase CLI, vercel CLI.

---

## Leyenda de clasificación

- **ACTIVO** — El especialista puede ejecutar operaciones reales en esta aplicación hoy (conexión verificada + herramientas disponibles).
- **PARCIAL** — Puede realizar operaciones de lectura o preparación, pero no escritura/despliegue sin autorización adicional.
- **BLOQUEADO** — Hay un impedimento concreto (credenciales faltantes, privilegios ausentes, autorización pendiente).
- **NO DISPONIBLE** — No existe conexión ni conector para esta aplicación.

---

## Matriz agente × aplicación

| Especialista | GitHub | Supabase | Vercel | Slack | Odoo | IA (nvidia/nemotron) | Google (Gmail/Cal) | Telegram |
|---|---|---|---|---|---|---|---|---|
| 1 Constructor | ACTIVO | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 2 Orchestrator | ACTIVO | PARCIAL | PARCIAL | BLOQUEADO | NO DISPONIBLE | ACTIVO | PARCIAL | PARCIAL |
| 3 Finance | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 4 Sales | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 5 Supply | ACTIVO | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 6 People | ACTIVO | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 7 Compliance | ACTIVO | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 8 Growth | NO DISPONIBLE | NO DISPONIBLE | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | PARCIAL | NO DISPONIBLE |
| 9 Security | ACTIVO | PARCIAL | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 10 QA | ACTIVO | PARCIAL | PARCIAL | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 11 Sentinel | ACTIVO | PARCIAL | ACTIVO | BLOQUEADO | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | PARCIAL |
| 12 UX | ACTIVO | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |
| 13 Release | ACTIVO | PARCIAL | ACTIVO | NO DISPONIBLE | NO DISPONIBLE | ACTIVO | NO DISPONIBLE | NO DISPONIBLE |

---

## Detalle por aplicación

### GitHub — CONNECTED

**¿Existe conexión?** Sí. `gh` CLI autenticado como `martinaburtoe-art`.
**¿Está autenticada?** Sí.
**¿Qué permisos tiene?** Lectura y escritura en ramas de trabajo del repositorio `martinaburtoe-art/nuva-one`. Merge a main requiere autorización explícita del owner.
**¿Qué operaciones permite?** Listar repos, PRs, issues, ver diffs, crear ramas, commits, PRs, revisar checks de CI.
**¿Qué agente puede utilizarla?** Constructor, Orchestrator, Release, QA, Security, Compliance, People, Supply, UX.
**¿Se ha ejecutado una operación real?** Sí: `gh repo view`, `gh pr list` (20 PRs), `gh issue list` (20+ issues), `gh issue view 260`, `gh pr view 269`.
**¿Existe evidencia verificable?** Sí — salidas de comandos gh registradas en esta sesión.
**¿Qué falta para habilitarla?** Autorización de merge para PRs #263, #266, #269.

### Supabase — PARTIAL

**¿Existe conexión?** Sí. CLI vinculado (`supabase link --project-ref vnzyecnbdqbfuxawzrda`).
**¿Está autenticada?** Sí (OAuth vía manage_connections: `supabase_realm-kenner`).
**¿Qué permisos tiene?** Lectura de proyectos y funciones Edge. `service_role` sin privilegios SELECT en tablas de agency (según Issue #260, lectura remota directa). Migración de grants no aplicada remotamente.
**¿Qué operaciones permite?** `supabase projects list`, `supabase functions list`, `supabase db query` (local falla sin Docker; remoto no probado directamente por limitación de CLI).
**¿Qué agente puede utilizarla?** Security, Constructor, QA, Release, Orchestrator (lectura). Migraciones/grants remotos bloqueados.
**¿Se ha ejecutado una operación real?** Sí: listado de 2 proyectos (Nüva One ACTIVE_HEALTHY, reci-conti-prod INACTIVE), listado de 6 Edge Functions.
**¿Existe evidencia verificable?** Sí — salidas de `supabase projects list` y `supabase functions list`.
**¿Qué falta para habilitarla?** Aplicación remota de migración `20261030130000_agency_service_role_privileges.sql` (T-20, bloqueado sin autorización de BD remota), verificación directa de privilegios en BD remota.

### Vercel — CONNECTED

**¿Existe conexión?** Sí. `vercel CLI` autenticado como `martinaburtoe-art`.
**¿Está autenticada?** Sí (`vercel whoami` exitoso).
**¿Qué permisos tiene?** Listar proyectos, listar despliegues, ver estado de builds. Despliegue a producción requiere autorización explícita.
**¿Qué operaciones permite?** `vercel projects list`, `vercel ls <proyecto>`, ver estado Ready/Building/Error de despliegues.
**¿Qué agente puede utilizarla?** Release, QA, Security, Orchestrator, UX, Sentinel, Growth (parcial).
**¿Se ha ejecutado una operación real?** Sí: `vercel whoami`, `vercel projects list` (3 proyectos: nuva-one, reci-constitucion, gurobi), `vercel ls nuva-one` (múltiples despliegues Ready, 2 de producción hace 11h).
**¿Existe evidencia verificable?** Sí — salidas de comandos vercel registradas en esta sesión. Sitio en https://nuva-one.vercel.app verificado vía web_extract.
**¿Qué falta para habilitarla?** Autorización de despliegue a producción.

### Slack — BLOQUEADO / NOT_CONNECTED

**¿Existe conexión?** No. `manage_connections` muestra `connected: false`.
**¿Está autenticada?** No.
**¿Qué permisos tiene?** Ninguno sin conexión.
**¿Qué operaciones permite?** Ninguna. Herramienta `slack.SEND_MESSAGE` existe pero requiere conexión previa.
**¿Qué agente puede utilizarla?** Sentinel, Orchestrator (si se conecta).
**¿Se ha ejecutado una operación real?** No.
**¿Existe evidencia verificable?** No — no hay conexión.
**¿Qué falta para habilitarla?** Conexión OAuth de workspace de Slack vía `manage_connections action=connect`.

### Odoo — NO DISPONIBLE

**¿Existe conexión?** No. No hay conector Odoo en el catálogo de Hermes.
**¿Está autenticada?** No.
**¿Qué permisos tiene?** Ninguno.
**¿Qué operaciones permite?** Ninguna.
**¿Qué agente puede utilizarla?** Sales, Supply, Finance (si se conecta).
**¿Se ha ejecutado una operación real?** No.
**¿Existe evidencia verificable?** No.
**¿Qué falta para habilitarla?** Conector Odoo o credenciales de API para acceso directo. Nota: verificaciones previas en Odoo DEMO corresponden al proyecto Scarlata, no a Nüva One.

### IA (nvidia/nemotron) — ACTIVO

**¿Existe conexión?** Sí. Modelo activo en la sesión actual.
**¿Está autenticada?** Sí (configuración de proveedor NVIDIA en Hermes).
**¿Qué operaciones permite?** Inferencia de texto, generación de código, análisis de documentos.
**¿Qué agente puede utilizarla?** Todos los 13 especialistas (vía Hermes).
**¿Se ha ejecutado una operación real?** Sí — todas las respuestas de esta sesión.
**¿Existe evidencia verificable?** Sí — esta sesión de chat.
**¿Qué falta para habilitarla?** Ninguno.

### IA (glm-5.3) — ACTIVO (lento)

**¿Existe conexión?** Sí.
**¿Está autenticada?** Sí.
**¿Qué operaciones permite?** Inferencia de texto (lento: 15-500s por respuesta).
**¿Qué agente puede utilizarla?** Todos (fallback).
**¿Se ha ejecutado una operación real?** No en esta sesión (modelo principal es nvidia/nemotron).
**¿Qué falta para habilitarla?** Ninguno, pero es lento y sin visión.

### Google (Gmail/Calendar/Drive) — CONNECTED (parcial)

**¿Existe conexión?** Sí. OAuth OK: `martinaburtoe@gmail.com`.
**¿Está autenticada?** Sí.
**¿Qué operaciones permite?** Lectura/envío de Gmail, Calendar, Drive. Usado para briefing diario 10:30.
**¿Qué agente puede utilizarla?** Orchestrator (parcial), Growth (parcial).
**¿Se ha ejecutado una operación real?** Sí — briefing diario configurado (según memoria previa).
**¿Qué falta para habilitarla?** Ninguno para operaciones de briefing existentes.

### Telegram — ON (parcial)

**¿Existe conexión?** Sí. Bot `@marti_manoderecha_bot`.
**¿Está autenticada?** Sí (gateway OK, 16-oct-2026).
**¿Qué operaciones permite?** Envío de notificaciones, recepción de comandos.
**¿Qué agente puede utilizarla?** Sentinel, Orchestrator (parcial).
**¿Se ha ejecutado una operación real?** Sí — gateway activo.
**¿Qué falta para habilitarla?** Ninguno para notificaciones existentes.

---

## Reglas de la matriz

1. No se declara ACTIVO solo por existir variable de entorno o archivo de configuración. Se requiere llamada directa exitosa.
2. PARCIAL significa que el especialista puede preparar o leer, pero operaciones de escritura/despliegue requieren autorización adicional del owner.
3. BLOQUEADO significa que hay un impedimento concreto identificado (credenciales, permisos, conector faltante).
4. NO DISPONIBLE significa que no existe integración en el entorno actual.
5. Ningún especialista puede operar en dos aplicaciones simultáneamente sobre el mismo archivo o recurso (evitar conflictos de escritura).