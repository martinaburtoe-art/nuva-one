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

## B-006: `happy-dom ^20.11.0` vulnerable (CVE-2026-33943)
- **Estado:** WARN PENDIENTE
- **Evidencia:** `npm audit --audit-level=high` reportó 2 vulnerabilidades high: `zod <4.6.6` (corregido en package.json a ^4.6.6) y `happy-dom <21.0.4`. Fix de happy-dom requiere mayor 21.0.4 (breaking change en entorno de tests).
- **Responsable:** Equipo de desarrollo
- **Siguiente acción:** Evaluar migración a happy-dom 21+ o alternativa de entorno de tests.
- **Dependencia:** Ninguna.
