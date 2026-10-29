# BLOCKERS — Nüva One Factory

Bloqueos vigentes con evidencia disponible, responsable y siguiente acción. Nunca afirmar que una tarea está completada si solo está planificada.

## B-001: Credenciales de Google para verificación OAuth en producción
- **Estado:** BLOQUEADO
- **Evidencia:** `auth.tsx` usa `supabase.auth.signInWithOAuth({provider:"google", redirectTo: ...})`; Supabase `vnzyecnbdqbfuxawzrda` tiene Google OAuth habilitado con `site_url`/`uri_allow_list` a `nuva-one.vercel.app`. OAuth verificado hasta redirección a Google (client_id coincide, redirect_uri correcto, retorno `/select-business`). Pero el flujo final (login de usuario real, persistencia de sesión, consulta de `businesses`) requiere credenciales de Google del propietario.
- **Responsable:** Usuario (Don Martín)
- **Siguiente acción:** Proveer credenciales de Google de prueba o aprobar verificación solo-local con cuenta demo.
- **Dependencia:** Ninguna.

## B-002: No hay `service_role` key ni acceso de solo lectura al esquema remoto de Supabase
- **Estado:** BLOQUEADO
- **Evidencia:** `supabase db query --project-ref vnzyecnbdqbfuxawzrda` sobre `pg_policies` devolvió políticas RLS de `public.businesses` (DELETE/UPDATE solo `auth.uid() = owner_id`). Pero no hay inspect completo de esquema remoto ni `RUN_READ_ONLY_QUERY` en el conector. Dashboard retornó HTTP 502.
- **Responsable:** Usuario (Don Martín)
- **Siguiente acción:** Aportar `service_role` key o aprobar análisis solo-estático + `pg_policies` como evidencia suficiente.
- **Dependencia:** Ninguna.

## B-003: `vercel logs` sin salida utilizable
- **Estado:** BLOQUEADO
- **Evidencia:** `vercel logs <deployment>` devolvió salida truncada/inútil. No se descarta `401 UNAUTHORIZED_INVALID_API_KEY` / `bad_length` en producción.
- **Responsable:** Usuario (Don Martín)
- **Siguiente acción:** Verificar logs de Vercel desde el dashboard o proporcionar acceso.
- **Dependencia:** Ninguna.

## B-004: Branch protection en `main` no activada
- **Estado:** PENDIENTE (acción del propietario)
- **Evidencia:** `IMPLEMENTATION_ROADMAP.md` lista "Branch protection en `main` (SEC-02)" como bloqueo previo.
- **Responsable:** Usuario (Don Martín)
- **Siguiente acción:** Activar protección de rama `main` en GitHub.
- **Dependencia:** Ninguna.

## B-005: `bun.lock` inconsistente con `package.json` (zod 4.0.0 vs ^4.6.6)
- **Estado:** PENDIENTE (decisión de usuario)
- **Evidencia:** `bun.lock` tiene zod 4.0.0; `package.json` declara ^4.6.6. `npm install --dry-run` resuelve zod 4.6.7. No se regenera `bun.lock` por restricción de usuario (no sobrescribir lockfiles sin confirmar gestor e impacto).
- **Responsable:** Usuario (Don Martín)
- **Siguiente acción:** Decidir si sincronizar `bun.lock` o dejar CI con npm reproducible.
- **Dependencia:** Ninguna.

## B-006: `happy-dom` versión vulnerable (CVE-2026-33943)
- **Estado:** RESUELTO
- **Evidencia:** `happy-dom` instalado en versión 21.0.4 (package.json `^21.0.4`, versión efectiva 21.0.4). `npm audit --audit-level=high` no reporta vulnerabilidad de happy-dom; solo 1 moderada en `seroval` (no relacionada). B-006 eliminado de bloqueos activos.
- **Responsable:** Equipo de desarrollo.
- **Siguiente acción:** Ninguna; versión segura vigente.
- **Dependencia:** Ninguna.

## B-007: Briefing matutino (cron) falla con deadlock de OpenAI
- **Estado:** BLOQUEADO / UNKNOWN (infraestructura interna de Hermes)
- **Evidencia:** `hermes cron list` — job "Briefing matutino", every day at 10:30, profile default. Last run 2026-10-28T13:02:58: `RuntimeError: Failed to initialize OpenAI client: deadlock detected by _ModuleLock('openai.types.chat.chat_completion_message_tool_call')`. Dispatch 2h 32m tarde, ejecución falló. Next run: 2026-10-29T10:30:00-03:00. Usa skill `google-workspace` (Gmail+Calendar).
- **Responsable:** Equipo de desarrollo de Hermes / Usuario (Don Martín)
- **Siguiente acción:** El deadlock ocurre en la inicialización del cliente OpenAI de Hermes (infra interna, fuera del repositorio nuva-one). No es reproducible ni corrigible desde `src/` de Nüva One. Documentar como BLOCKED hasta que Hermes corrija el cliente OpenAI o se disponga de fallback. El briefing matutino queda como UNKNOWN para entregas automatizadas.
- **Dependencia:** B-001 (credenciales de Google) para que el briefing tenga datos reales que leer.
