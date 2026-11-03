# AGENCY_RUNBOOK.md

Ciclo de orquestación autónoma de Nüva Agency: INSPECT → PRIORITIZE → ASSIGN → EXECUTE → VERIFY → RECORD → LEARN → NEXT TASK.

Generado: 2026-11-03
Versión: 1.0
Fuente: HERMES CONTINUOUS EXECUTION PROTOCOL, evidencia de ejecución real.

---

## 1. Ciclo principal

Cada ejecución de tarea sigue este ciclo obligatorio:

```
INSPECT → PRIORITIZE → ASSIGN → EXECUTE → VERIFY → RECORD → LEARN → NEXT TASK
```

### Fase 1 — INSPECT
- Leer el tablero persistente (`AGENCY_OPERATIONS_BOARD.md`).
- Identificar tareas incompletas y no iniciadas.
- Recuperar ejecuciones interrumpidas (leases vencidos, procesos abandonados).
- Verificar estado de conexiones (`AGENCY_CONNECTIONS.md`).
- Evitar duplicar trabajos ya completados.

### Fase 2 — PRIORITIZE
- Ordenar tareas por: dependencias, riesgo, impacto en el lanzamiento, disponibilidad de sistemas.
- Tareas bloqueadas por autorización externa se dejan en BLOCKED y se continúa con independientes.
- No repetir auditorías completadas sin motivo.

### Fase 3 — ASSIGN
- Asignar cada tarea al especialista correspondiente según `AGENCY_EXECUTION_MATRIX.md`.
- Un especialista = una tarea activa a la vez.
- No asignar dos tareas incompatibles sobre el mismo archivo o recurso simultáneamente.

### Fase 4 — EXECUTE
- El especialista ejecuta la tarea usando sus herramientas concretas y aplicaciones autorizadas.
- Trabajar en ramas aisladas (nunca en main directamente).
- No usar `git reset --hard`, `git clean -fd`, ni deletes destructivos.
- No sobrescribir archivos sin review.
- No tocar lockfiles sin confirmación.
- Commits pequeños y descriptivos.

### Fase 5 — VERIFY
- Ejecutar pruebas reales: `npm test -- --run`, `npm run lint`, `npx tsc --noEmit`.
- Para especialistas con certificación: `npm run agency:certify`.
- Verificar evidencia de operación real (no simular, no inventar resultados).
- Si una prueba falla: investigar causa, corregir, reejecutar. Máximo 2 intentos con misma estrategia; luego cambiar estrategia.

### Fase 6 — RECORD
- Actualizar `AGENCY_OPERATIONS_BOARD.md` con el nuevo estado del especialista.
- Registrar en `AGENCY_EVIDENCE_LOG.md`: sistema, agente, operación, timestamp, resultado, evidencia.
- Commit de documentación y cambios de código en Git.

### Fase 7 — LEARN
- Documentar lecciones, pitfalls y correcciones en el skill correspondiente o en `docs/launch/`.
- Si una integración está bloqueada, identificar exactamente qué falta (credencial, permiso, configuración).
- No afirmar persistencia real si no está configurada.

### Fase 8 — NEXT TASK
- Identificar la siguiente tarea desbloqueada.
- Asignarla al especialista correspondiente.
- Ejecutarla inmediatamente. No esperar confirmación del owner para tareas ordinarias.
- Regresar a fase 1.

---

## 2. Reglas de operación

| Regla | Descripción |
|---|---|
| No esperar confirmación | Entre tareas ordinarias, reversibles y autorizadas no se pide permiso al owner. |
| Escalar solo lo necesario | Merges a main, migraciones de producción, cambios de RLS/auth/payments, despliegues críticos, gastos, publicaciones externas, acciones irreversibles sobre datos requieren autorización explícita. |
| No inventar resultados | Cada afirmación debe tener evidencia verificable (comando, salida, archivo, URL). |
| No dejar tareas sin verificar | Cada tarea ejecutada debe tener fase VERIFY completada. |
| No abandonar por error recuperable | Reintentar con estrategia distinta; si persiste, marcar BLOCKED y continuar con independiente. |
| Persistencia | Documentar estado en Git. Supabase solo cuando grants estén aplicados (T-20). |
| Checkpoints frecuentes | Actualizar tablero y evidencia tras cada tarea. |

---

## 3. Gestión de errores y reintentos

| Situación | Acción |
|---|---|
| Prueba falla (intento 1) | Investigar causa exacta, corregir en rama, reejecutar pruebas. |
| Prueba falla (intento 2, misma estrategia) | Cambiar estrategia (diferente enfoque, diferente herramienta, consultar documentación). |
| Prueba falla (intento 3) | Marcar tarea BLOCKED, registrar error exacto, continuar con tarea independiente. |
| Integración bloqueada | Identificar qué falta (credencial, permiso, autorización), documentar en BLOCKERS.md, continuar con independiente. |
| Lease vencido / proceso abandonado | Detectar, registrar, recuperar si es seguro; no resetear estados sin plan de recuperación auditable. |
| Conflicto de escritura | No asignar dos tareas sobre el mismo archivo simultáneamente. Resolver con merge de ramas, no con forzado. |

---

## 4. Autorizaciones y límites

### Puede hacer sin autorización adicional
- Inspeccionar repositorios e infraestructura.
- Corregir errores en código no crítico.
- Modificar código y arquitectura en ramas de trabajo.
- Crear ramas, commits, PRs.
- Ejecutar pruebas locales.
- Preparar documentación y materiales comerciales.
- Automatizar tareas reversibles.
- Leer datos de Supabase, GitHub, Vercel (modo lectura).

### Requiere autorización explícita del owner
- Merges a main (PRs #263, #266, #269 pendientes).
- Migraciones de base de datos remotas (T-20: grants de service_role).
- Cambios de permisos o RLS en producción.
- Despliegues a producción (Vercel, Edge Functions de Supabase).
- Publicaciones externas.
- Gastos o contratación de servicios.
- Acciones irreversibles sobre datos de clientes.

### Prohibido siempre
- Exponer secretos, tokens, credenciales en logs, commits o frontend (usar `[REDACTED]`).
- Modificar producción, datos reales, RLS, migraciones sin autorización explícita.
- Tocar ReciConti / ReciConstitución (proyecto `qajygywlobkdhdatixtg`).
- Hacer `git reset --hard`, `git clean -fd`, deletes destructivos.
- Sobrescribir archivos sin review.
- Cambiar seguridad/RLS/auth/payments para pasar tests.

---

## 5. Recuperación de sesión

Al iniciar una nueva sesión:
1. Recuperar la misión activa (NÜVA LAUNCH ACTIVATION).
2. Leer `AGENCY_OPERATIONS_BOARD.md`.
3. Identificar tareas incompletas.
4. Recuperar ejecuciones interrumpidas.
5. Evitar duplicar trabajos.
6. Continuar desde el último estado verificado.

---

## 6. Ejemplo de ejecución de una tarea ordinaria

**Tarea:** Verificar que un nuevo cambio de código no rompe pruebas.

1. **INSPECT:** Leer tablero, verificar que no hay tarea igual en curso.
2. **PRIORITIZE:** Alta — afecta calidad de release.
3. **ASSIGN:** QA (especialista 10).
4. **EXECUTE:** QA ejecuta `npm test -- --run`, `npm run lint`, `npx tsc --noEmit`.
5. **VERIFY:** Todos pasan (429/429, exit 0, exit 0).
6. **RECORD:** Actualizar tablero (QA → COMPLETED), registrar en evidencia log, commit de resultados.
7. **LEARN:** Ninguna lección nueva (pruebas ya verificadas previamente).
8. **NEXT TASK:** Asignar siguiente tarea desbloqueada (ej. T-31 documentación OIDC a Security).

---

## 7. Contacto de escalación

- Owner: Don Martín (Martín Ariel Aburto Espinoza, martinaburtoe@gmail.com)
- Canal de notificación: Telegram @marti_manoderecha_bot, briefing diario 10:30 (Gmail+Calendar)
- Escalar solo: producción, seguridad crítica, gastos, acciones irreversibles.