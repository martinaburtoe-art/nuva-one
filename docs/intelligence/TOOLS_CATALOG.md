# TOOLS_CATALOG — Nüva One (2026-10-24)

Herramientas seleccionadas con justificación operativa. Todas las afirmaciones externas están respaldadas por las fuentes de `SOURCE_REGISTER.md` (consultadas 2026-10-24 salvo indicación). Esta fase **no instaló nada**; cada entrada describe cómo probar y revertir para cuando se autorice.

Formato por entrada: problema → solución verificada → licencia/versión → mantenimiento → requisitos de instalación → permisos y superficie de ataque → coste → cómo probar → cómo revertir.

---

## A. Testing, QA y contratos

### A1. fast-check (ADOPTAR)
- **Problema:** los casos límite de dinero (redondeos CLP/IVA), concurrencia de inventario y permisos RLS no se cubren bien con tests ejemplo-expectativa.
- **Solución:** property-based testing generando miles de casos por invariante; el propio fast-check minimiza el contraejemplo.
- **Licencia/versión:** MIT · 4.10.2 (npm, 2026-10-24).
- **Mantenimiento:** activo (release 2026-09-19; push 2026-10-24; 5.212 estrellas).
- **Instalación mínima:** devDependency + `import fc from 'fast-check'` dentro de specs vitest existentes (agnóstico del runner, doc oficial).
- **Permisos/ataque:** ninguno (librería pura de tests, sin red ni FS).
- **Coste:** 0.
- **Prueba mínima:** 1 propiedad sobre utilitario monetario del repo (p. ej. `total = subtotal + iva` para enteros CLP aleatorios).
- **Reversión:** quitar devDependency y los specs (solo dev).

### A2. Playwright (ADOPTAR)
- **Problema:** bloqueador de lanzamiento #4 — no hay E2E autenticado (cuentas de prueba faltantes) ni regresión visual fuera del módulo Resumen.
- **Solución:** E2E multi-navegador con estado de auth reutilizable (`storageState` + `playwright/.auth` en `.gitignore`) y comparaciones visuales `toHaveScreenshot()` con umbral y baselines por plataforma (docs oficiales auth y visual comparisons, 2026-10-24).
- **Licencia/versión:** Apache-2.0 · @playwright/test 1.64.1 (npm 2026-10-24; release 2026-10-14).
- **Mantenimiento:** muy activo (microsoft/playwright, push diario).
- **Instalación mínima:** devDependency + `npx playwright install chromium` + config con `storageState`; job de CI separado del vitest actual.
- **Permisos/ataque:** ejecuta navegador real; los estados de auth son secretos (cookies) — nunca al repo (doc oficial). Guardar credenciales de prueba en GitHub Secrets/Vercel, no en texto plano.
- **Coste:** 0 en CI Linux (runners públicos); verificar minutos privados.
- **Prueba mínima:** setup de auth por UI contra entorno de preview + spec de un flujo de ventas crítico.
- **Reversión:** eliminar devDependency, config, directorio de specs y el job de CI. Nada toca runtime.

### A3. Squawk (ADOPTAR)
- **Problema:** una migración con `CREATE INDEX` sin `CONCURRENTLY` o constraint sin `NOT VALID` puede bloquear escrituras en producción.
- **Solución:** linter estático SQL con reglas exactamente para eso (`require-concurrent-index-creation`, `constraint-missing-not-valid`, `prefer-text-field`, etc.; docs y ejemplos en el README oficial).
- **Licencia/versión:** Apache-2.0 OR MIT · squawk-cli 2.70.0 (npm 2026-10-24; release 2026-10-15).
- **Mantenimiento:** activo (push 2026-10-24; Action oficial `sbdchd/squawk-action`; hooks pre-commit).
- **Instalación mínima:** `npm i -D squawk-cli` + Action que linte solo las migraciones nuevas del PR (o `.squawk.toml` con exclusión de migraciones históricas).
- **Permisos/ataque:** CLI offline; binario firmado en releases; sin red en uso normal.
- **Coste:** 0.
- **Prueba mínima:** lint sobre las migraciones nuevas de un PR de ejemplo con un índice no concurrente → debe fallar.
- **Reversión:** quitar devDependency + step de CI.

### A4. `supabase gen types` (ADOPTAR — práctica)
- **Problema:** desincronización silenciosa entre esquema Postgres (297 migraciones) y tipos TS del cliente.
- **Solución:** generación de tipos desde el esquema migrado con la CLI Supabase **ya instalada** (2.109.1, evidencia interna 2026-10-21); check de CI que falla si el archivo commiteado difiere.
- **Coste/permisos:** 0; sin nuevos permisos.
- **Reversión:** quitar el check; los tipos generados son código normal.

### A5. MSW (VIGILAR — no instalar ahora)
- **Cuándo activarlo:** si Playwright necesita simular el gateway IA o respuestas de Supabase REST sin backend real. MIT, 3.0.3, activo (npm 2026-10-10). Regla de no-duplicación: hoy no aporta sobre los 308 tests vitest existentes.

### A6. Patrones de supabase-test-helpers (ADAPTAR)
- **Qué se copia:** el enfoque de Basejump para probar RLS creando usuarios/sesiones de prueba y verificando aislamiento por organización. **No** se adopta el repo (sin npm, inactivo desde 2024-05-15 — GitHub API 2026-10-24): los patrones se integran a la suite pgTAP propia (RLS ya probada por 50 archivos — evidencia interna).
- **Riesgo cubierto:** aislamiento multi-tenant en tablas de People aún sin endurecer (3 tablas, evidencia interna) — los tests de aislamiento son el mecanismo de verificación del hardening.

---

## B. Seguridad y cadena de suministro

### B1. Zizmor (ADOPTAR)
- **Problema:** superficie de ataque en GitHub Actions (workflows propios numerosos: ci-repair, sentinel, web-qa, safe-merge, certificación IA — evidencia interna): inyección por `${{ }}`, triggers peligrosos, credenciales persistentes, acciones sin fijar.
- **Solución:** auditoría estática offline con reglas documentadas por hallazgo y auto-fixes; detecta además acciones con advisories públicos.
- **Licencia/versión:** MIT · 1.31.1 (release 2026-10-15; push 2026-10-23).
- **Instalación mínima:** job de CI (`cargo`/binario de release o contenedor) sobre `.github/workflows`.
- **Permisos/ataque:** sin red (offline); binario de release firmado del mantenedor (woodruffw, RustSec).
- **Coste:** 0.
- **Prueba mínima:** ejecución sobre los workflows actuales → inventariar hallazgos, distinguir base de nuevas (regla del proyecto), fijar severidad de bloqueo solo para lo crítico.
- **Reversión:** quitar el job.

### B2. Gitleaks (ADOPTAR)
- **Problema:** fuga de secretos por commit (regla innegociable #9 de la misión).
- **Solución:** escaneo de historial/archivos/stdin; modos pre-commit y GitHub Action oficial; reportes json/sarif; `.gitleaksignore` por fingerprint.
- **Licencia/versión:** MIT · 8.30.1 (release 2026-03-21; 30.280 estrellas).
- **Nota de mantenimiento [HECHO]:** "feature complete", solo parches de seguridad; el mantenedor avanza Betterleaks (VIGILAR como sucesora).
- **Instalación mínima:** `gitleaks-action` en CI (o pre-commit local de los devs).
- **Permisos/ataque:** solo lectura del repo; el Action corre con token mínimo.
- **Coste:** 0 (el Action público es gratuito en repos públicos; en privados puede requerir registro — verificar en el repo del Action al momento de instalar).
- **Prueba mínima:** commit de un token falso de prueba en rama aislada → debe bloquear.
- **Reversión:** quitar el Action/pre-commit.

### B3. OSV-Scanner (EXPERIMENTAR)
- **Problema:** `npm audit` cubre el árbol npm pero no SBOM/otros formatos ni vulnerabilidades fuera de la advisory DB de npm.
- **Solución:** frontend oficial de OSV (Google) para escanear lockfiles/SBOM; CLI para CI.
- **Licencia/versión:** Apache-2.0 · 2.7.0 (release 2026-10-12).
- **Prueba mínima:** job agendado semanal, reporte como artefacto, **sin** bloquear (npm audit ya es el gate vigente — package.json `agency:dependency-audit`).
- **Decisión de continuidad:** si tras 2–3 corridas no aporta hallazgos nuevos ni licencias problemáticas, se cierra el experimento (no duplicar gates).

### B4. OSSF Scorecard (VIGILAR)
- Autoevaluación periódica de postura (branch protection — gap SEC-02 —, fijado de acciones, etc.) vía API pública o CLI; no se integra a CI. Apache-2.0, 5.6.0 (2026-10-12).

---

## C. Observabilidad y rendimiento

### C1. Vercel Speed Insights (ADOPTAR)
- **Problema:** "CWV/Lighthouse UNKNOWN" (evidencia interna) — no hay medición real de usuarios.
- **Solución:** RUM oficial de Vercel sobre Core Web Vitals; gratis en todos los planes (muestra RES; CWV individuales y desgloses en Plus, de pago).
- **Instalación mínima:** habilitar en el dashboard del proyecto `nuva-one` (sin código) — doc oficial Quickstart.
- **Permisos/ataque:** ninguno en el repo; datos de navegación anónimos hacia Vercel (ya es el host).
- **Coste:** 0 (plan actual); Plus si se requiere.
- **Reversión:** deshabilitar desde el dashboard.
- **Complemento opcional (ADAPTAR):** `web-vitals` 6.2.3 (Apache-2.0, npm 2026-10-05) para RUM propio con destinos elegidos — solo si Speed Insights se queda corto; cuidar no recolectar identificadores personales.

### C2. Sentry (ADOPTAR — con revisión de privacidad previa)
- **Problema:** diagnóstico de errores de producción sin exponer datos (objetivo #8 de mejoras de la misión).
- **Solución:** SDK MIT (@sentry/react 11.9.0) + plataforma SaaS con planes gratuito/de pago (verificar precio vigente en sentry.io/pricing antes de activar; no se citan cifras no verificadas).
- **Requisitos de seguridad (condición de adopción):** `sendDefaultPii: false`, scrubbing de payloads (evitar datos de clientes/negocios en breadcrumbs), selector de entorno (solo producción), y registro del tratamiento en la documentación de privacidad del producto (`docs/OWNER_CONSOLE_PRIVACY.md` ya existe).
- **Coste:** 0 en tier free hasta sus límites; verificar.
- **Prueba mínima:** error de prueba capturado en preview + verificación de que el payload no contiene PII.
- **Reversión:** quitar DSN/env var; el SDK se desactiva sin código de respaldo.

### C3. Lighthouse / LHCI (VIGILAR)
- Solo para baselines de laboratorio ad-hoc sobre previews; @lhci/cli sin updates desde 2025-06-25 (npm) → no instalar como gate. Speed Insights cubre la medición que importa (campo).

---

## D. Ingeniería de IA

### D1. promptfoo (EXPERIMENTAR → candidato a ADOPTAR)
- **Problema:** sin forma reproducible de comparar proveedores/prompts del gateway IA multiproveedor ni detectar regresiones de calidad/alucinación.
- **Solución:** evals configurables con providers OpenAI-compatibles (`apiBaseUrl` + `apiKeyEnvar` — doc oficial) → apunta directo al gateway del proyecto; asserts deterministas/llm-rubric; CLI + UI web local.
- **Licencia/versión:** MIT · 0.125.0 (release 2026-10-23; push diario).
- **Instalación mínima:** `npx promptfoo@latest eval` con config YAML apuntando a un proveedor de staging; resultados JSON en CI.
- **Permisos/ataque:** CLI npm del proyecto oficial; requiere claves de API en env vars de CI (secrets); no mandar datos reales de clientes en los prompts de evaluación.
- **Coste:** 0 (más el consumo de tokens de los proveedores en los evals).
- **Prueba mínima:** 5–10 casos de un flujo existente con 2 proveedores y umbrales; documentar varianza.
- **Reversión:** eliminar config/CI step; es herramienta de desarrollo, no runtime.

### D2. evalite (EXPERIMENTAR)
- **Por qué:** evals TS con la misma API que vitest, UI local, export a CI con umbrales ("Built on Vitest", doc oficial). Ideal para equipos que ya viven en vitest (308 tests).
- **Riesgo:** 0.19.0 (2025-11-06) y sin push desde 2026-04-28 → madurez/ritmo bajo; fijar versión y probar aislado.
- **Decisión:** pilotar en paralelo con promptfoo y elegir UNO (regla anti-duplicación).

### D3. Langfuse (EXPERIMENTAR)
- **Por qué:** trazas/observabilidad del gateway IA (generations, tool calls, coste por llamada). Integración documentada para AI SDK v6 por la vía heredada (`experimental_telemetry` + LangfuseSpanProcessor OTel); el paquete actual `@langfuse/vercel-ai-sdk` 6.0.2 apunta a AI SDK 7 (futuro).
- **Licencia:** core MIT + directorios `ee/` comerciales [HECHO]; self-host posible (Docker) o cloud (EU).
- **Condición de adopción:** revisión de privacidad igual que Sentry (trazas pueden contener consultas de negocio de clientes); iniciar en staging con datos sintéticos.
- **Reversión:** quitar span processor/env keys; sin cambios de lógica de negocio.

---

## E. Arquitectura y dependencias

### E1. dependency-cruiser (EXPERIMENTAR)
- **Qué reglas cristaliza:** (1) secrets/servidor nunca importados desde código de navegador (regla del roadmap de integraciones interno); (2) internos del módulo Resumen protegido no importables desde fuera (defensa técnica de la restricción visual).
- **Licencia/versión:** MIT · 18.7.0 (npm 2026-10-23, muy activo).
- **Prueba mínima:** 2 reglas + `depcruise` en CI como warning la primera semana.
- **Reversión:** quitar config y step.

### E2. knip (ADOPTAR — decisión interna previa ratificada)
- Ya en PR #227 (evidencia interna). ISC, 6.42.1, activo. Closes DEP-01/DEP-02 (recharts vs React 19, doble lockfile) con inventario continuo.

### E3. Atlas (DESCARTAR)
- Duplicaría el pipeline de migraciones maduro propio (297 migraciones + recovery drill + `verify:migrations` — evidencia interna). No instalar.

---

## F. Integraciones chilenas — requisitos, costos y disponibilidad verificados

> Regla de esta sección: solo fuentes oficiales; cualquier dato de terceros se marca como tal. Nada de esto se integró en esta fase.

### F1. API Banco Central de Chile (BDE) — ADOPTAR
- **Qué da:** series oficiales: UF (`F073.UFF.PRE.Z.D`), UTM (`F073.UTR.PRE.Z.M`), dólar observado, TPM, IPC (buscador de series).
- **Disponibilidad/costo [HECHO]:** gratuita; acceso "inmediato y gratuito" tras crear cuenta BDE y habilitar el token API en "Mi Cuenta" — sin contratos ni aprobaciones (página oficial Ayuda y Soporte, 2026-10-24). Vías: REST (HTTPS, cualquier lenguaje), SOAP, o librería Python `bcchapi`.
- **Requisitos técnicos:** cuenta BDE (registro con email), token en header; los Términos de uso oficiales (PDF) definen atribución y uso de la información.
- **Beneficio:** valores de UF/UTM/USD oficiales para contratos, remuneraciones (People) y conversión de divisas (finanzas) — hoy no hay una fuente oficial en el producto.
- **Prueba mínima (cuando se autorice):** función server-side que cachea UF/UTM diarias en una tabla Supabase (sin exponer el token al navegador).
- **Riesgo:** ninguno crítico; dependencia de disponibilidad del BCCh (usar cache + valor del día anterior degradado).

### F2. Transbank Webpay Plus (REST) — EXPERIMENTAR
- **Qué da:** autorización financiera con tarjetas de crédito/débito Redcompra/prepago, el método dominante en Chile.
- **Disponibilidad [HECHO]:** API REST oficial; el SOAP fue deprecado (aviso oficial del portal); ambiente de integración gratuito con códigos de comercio predefinidos por producto/moneda (Webpay Plus `59705555555532`) y claves públicas de prueba — sin contrato para desarrollar.
- **SDK:** `transbank-sdk` (Node) 6.1.1, BSD-3-Clause (npm 2025-12-09; repo push 2026-09-28).
- **Costo producción:** requiere afiliación comercial con Transbank; **los costos no son públicos** (se negocian). [HECHO]
- **Prueba mínima:** flujo create→redirect→commit en sandbox contra preview de Vercel, con idempotencia por orden.
- **Riesgo:** decisión de producto pendiente (MercadoPago ya documentado internamente); no duplicar pasarelas sin evidencia de demanda de clientes.

### F3. DTE vía proveedor certificado (OpenFactura) — ADAPTAR (decisión interna previa)
- **Estado:** comparativa y recomendación de piloto ya hechas en `docs/FASE4_Comparacion_Proveedores_DTE.md` (reutilizada, no re-auditada). Requisitos invariables: cada empresa cliente requiere certificado digital propio y CAF/folios por RUT; arquitectura de emisión asíncrona con idempotencia por `sale_id` ya especificada allí.
- **Pendiente de esta investigación:** re-verificar precio/ToS vigentes con Haulmer antes de firmar; confirmar sandbox público actual.
- **SII directo [HECHO]:** sin API pública oficial para terceros (ver TECH_RADAR #24) — esta vía queda DESCARTADA.

### F4. ClaveÚnica — DESCARTAR
- **Requisito legal [HECHO]:** entidades privadas solo con habilitante normativo/convenio (Términos SGD; Decreto 9/2023). Nüva One no califica hoy; descartado sin costo.

### F5. Wrappers comerciales del SII (API Gateway, ApiPyme) — VIGILAR
- **Qué ofrecen [HECHO, fuente privada]:** RCV compras/ventas, F29, y documentos del Portal MIPYME vía sus credenciales SII.
- **Por qué solo VIGILAR:** no oficiales; dependen de credenciales tributarias del cliente cedidas a un tercero; riesgo de fragilidad/ToS. Evaluar solo si el proveedor DTE elegido no cubre la misma necesidad.
