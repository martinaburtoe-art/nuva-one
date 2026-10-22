# REMAINING_BLOCKERS — Nüva One

Solo bloqueos REALES que impiden avanzar (actualizado 2026-10-22). Cada uno indica la acción exacta que falta y quién puede desbloquearla.

| # | Bloqueo | Impacto | Acción requerida | Quién |
|---|---|---|---|---|
| 1 | **SEC-01: 21 tablas sin RLS** (sales, customers, products, transactions, people_payroll_*, etc.) con filtro de tenant solo en el cliente | Potencial exposición cross-tenant (P0 candidato) — INVERIFICABLE sin acceso BD | `SUPABASE_ACCESS_TOKEN` (configurarlo en el entorno, nunca en el chat) o cuenta de prueba; luego verificación y migración RLS con autorización | Don Martín + JARVIS |
| 2 | **Vercel CLI deslogueado** (`.vercel/project.json` ausente) | Sin listado de deployments/variables/previews ni promoción; no se puede verificar el estado de producción más allá de curl | `vercel login` (interactivo, desde terminal) | Don Martín |
| 3 | **Cuenta de prueba** para E2E/visual | Sin verificación funcional del dashboard tras login ni capturas | Crear usuario demo en un business de datos sintéticos | Don Martín (o autorizar creación vía service-role cuando exista token) |
| 4 | **Delegación de subagentes rota** (modelo children `openai/gpt-oss-120b` rechaza el contexto de arranque) | Las auditorías paralelas tuvieron que hacerse en línea (hecho: arquitectura, seguridad, diseño) | Fijar `delegation.model` a un modelo con contexto suficiente (ej. el main) o reducir el contexto semilla de children | Don Martín puede autorizar el cambio de config |
| 5 | **`main` sin branch protection** | Cualquier push = despliegue directo a producción | Activar protección + PR obligatorio (decisión de propietario) | Don Martín |
| 6 | **Publicar la reparación** | Los fixes (zod, finance-period, vite.config, lockfile) están commiteados localmente; sin push no hay PR ni CI | Autorizar push de la rama de trabajo + PR (repo es público — publica también el WIP previo del usuario) | Don Martín decide |
| 7 | **Antivirus interfiere installs** (esbuild postinstall ACCESS VIOLATION, npm 0xC0000142) | Riesgo de corrupción en futuras instalaciones | Excluir la carpeta del proyecto + caché npm en Defender (requiere admin) | Don Martín |

## No-bloqueos (deuda con plan, ver auditorías)

- 56 errores lint react-hooks v7 + 624 `no-explicit-any` (backlog refactor).
- recharts 2.13 → v3 (peer React 19; requiere QA visual).
- Doble lockfile bun/npm + archivos .bak (decisión de unificación).
- 11 vulnerabilidades dev-toolchain (minimatch bump + `npm audit fix` en cola).
- CSP pendiente de añadir a vercel.json (inventario de orígenes primero).
