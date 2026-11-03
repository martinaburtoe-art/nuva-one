# EVALUACIÓN CONJUNTA — PR #263, #266 y #269

Fecha: 2026-11-03
Estado: Listos para merge (pendiente autorización de Don Martín)

## Resumen ejecutivo

Los tres PR están MERGEABLE con todos los checks de CI pasando. Ninguno introduce cambios destructivos, modificaciones de seguridad/RLS/auth/payments, ni despliegues a producción. Se autorizó su preparación y revisión técnica, pero no su merge a main ni despliegues críticos.

---

## PR #263 — fix(agency): surface durable mission query failures

**Rama:** fix/agency-worker-query-errors-20261102
**Estado:** OPEN, MERGEABLE, checks ✅ Todos PASS
**Cambios:** 2 líneas en `src/routes/api/owner/agency-control.ts`
**Efectos secundarios:** Ninguno detectado. Solo hace visible un error de Supabase que ya existía pero era silencioso.
**Riesgo:** Muy bajo. No toca RLS, auth, ni datos de producción.

### Diff clave
- `src/routes/api/owner/agency-control.ts`: agrega `error: missionError` al destructuring del resultado de Supabase y lanza el error si existe, permitiendo que el caller detecte fallos de permisos de misión duradera en lugar de recibirlos como `null` silencioso.

---

## PR #266 — fix(agency): skip draft PRs in autonomous merge controller

**Rama:** fix/agency-merge-exclude-drafts-20261102
**Estado:** OPEN, MERGEABLE, checks ✅ Todos PASS
**Cambios:** 6 líneas en `.github/workflows/nuva-agency-autonomous-merge.yml`
**Efectos secundarios:** Ninguno detectado. Evita que el controlador de merge autónomo intente procesar PRs en estado DRAFT.
**Riesgo:** Muy bajo. Solo agrega un filtro de seguridad y un parámetro `--repo` para corrección de comandos gh.

### Diff clave
- `.github/workflows/nuva-agency-autonomous-merge.yml`: agrega condición `isDraft == false` al filtrado de PRs y añade `--repo $GITHUB_REPOSITORY` a los comandos `gh` para evitar ambigüedad de repositorio.

---

## PR #269 — feat: subir trabajo pendiente de Nüva Agency (B-003)

**Rama:** fix/reproducible-npm-ci-20261027
**Estado:** OPEN, MERGEABLE, CI ✅ 8/8 PASS
**Cambios:** Múltiples archivos (especialista people, worker duradero, docs, scripts, tests)
**Efectos secundarios:** Corrige CI "Control Plane Verify" que estaba fallando; habilita certificación de especialistas y persistencia duradera.
**Riesgo:** Bajo. Todos los tests pasan (429/429), lint exit 0, typecheck exit 0, agency:certify PASS.

### Diff clave
- `src/lib/agency/specialists.mjs`: especialista `people` ahora emite evidencia `PII scan: N coincidencia(s) encontrada(s) y redactada(s) en documentos escaneados` (satisface `specialists.test.ts:83`)
- `scripts/agency-durable-worker.mjs`: `executeSpecialist(taskInput, { signal: controller.signal })` con `AbortController` (satisface `agency-durable-worker.test.ts:52`)
- `docs/launch/PROJECT_STATE.md`, `docs/launch/BLOCKERS.md`: estado actualizado
- `docs/nuva-agency/AGENT_BACKLOG.md`: estados de T-18, T-30, T-31 actualizados
- `logs/cycles/index.json`: historial de ejecuciones
- `scripts/agency-mission.mjs`, `scripts/agency-run-specialist.mjs`, `src/lib/agency/specialists.ts`: sincronizados con origin/main
- `src/routeTree.gen.ts`: regenerado
- `tests/fixtures/pii/*`: nuevos fixtures de prueba PII

---

## Evaluación comparativa

| Criterio | PR #263 | PR #266 | PR #269 |
|---|---|---|---|
| Mergeable | ✅ | ✅ | ✅ |
| CI checks | ✅ Todos PASS | ✅ Todos PASS | ✅ 8/8 PASS |
| Líneas cambiadas | 2 | 6 | Múltiples (docs+code+tests) |
| Tests nuevos | 0 | 0 | PII fixtures + existentes |
| Riesgo de regresión | Muy bajo | Muy bajo | Bajo (tests 429/429 PASS) |
| Requiere deploy | No | No | No |
| Requiere migración remota | No | No | No |
| Autorización para merge | PENDIENTE | PENDIENTE | PENDIENTE |

---

## Recomendación

Los tres PR son seguros para merge en `main` desde el punto de vista técnico. Ninguno requiere:
- Despliegue a producción
- Migración remota de base de datos
- Cambio de RLS, auth, o pagos
- Gasto o contratación

**Acción requerida:** Don Martín debe autorizar explícitamente el merge de cada PR (o de los tres en lote) a `main`. No se debe aplicar ninguna migración remota ni desplegar a producción sin autorización adicional.

---

## Pendientes tras el merge (autorizados para preparar, no para aplicar)

- T-32: Desplegar endurecimiento OIDC de la Edge Function (requiere autorización de deploy)
- T-20: Aplicar migración de grants de Supabase remotamente (requiere autorización de BD remota)
- T-21: Activar scheduler recurrente durable (depende de T-20 y T-32)
- T-22: Profesionalizar Owner Console con sesión real (depende de T-20, T-21)