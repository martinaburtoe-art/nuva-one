# Protocolo conjunto ChatGPT + Hermes — Nüva One
## División de responsabilidades
- ChatGPT: arquitectura de auditoría, revisión crítica, benchmark competitivo, síntesis de hallazgos, priorización, revisión de diffs y criterios de aceptación.
- Hermes local: ejecución de comandos en el workspace autorizado, instalación de herramientas en repositorios separados, ejecución de Playwright/axe/Lighthouse, capturas, traces, pruebas y commits.
- GitHub: registro de evidencia, ramas y PRs aislados.
- Vercel: previews por rama; producción queda fuera del alcance de este frente.
- Supabase: lectura mínima necesaria para flujos de demo; nada de migraciones, políticas ni mutaciones de producción.

## Repositorios separados
Crear desde Hermes un repositorio privado dedicado: `nuva-one-product-audit`.
No copiar .env, tokens, dumps, datos de clientes ni secretos. El harness debe recibir solo URL del preview y credenciales de una cuenta demo de alcance limitado, idealmente por variables locales no versionadas.
Estructura sugerida:
- `playwright/` — specs de flujos y viewports.
- `artifacts/screenshots/` — capturas baseline y comparativas.
- `artifacts/traces/` — trazas sanitizadas.
- `reports/` — informes Markdown/JSON.
- `lighthouse/` — configuración CI.
- `skills/nuva-product-experience-audit/SKILL.md` — skill versionada.
- `README.md` — instalación y comandos reproducibles.

## Stack de auditoría aislado
- @playwright/test
- @axe-core/playwright
- @lhci/cli
- TypeScript
- reporters HTML/JUnit
No agregar estas dependencias al package.json de Nüva One en esta etapa.

## Reglas de acceso
- Usar preview, no producción, para pruebas con mutaciones.
- Cuenta demo separada y datos sintéticos.
- Si no existe demo estable, ejecutar solo navegación read-only y registrar UNKNOWN para acciones transaccionales.
- Nunca automatizar cobros reales, envíos reales, invitaciones a correos reales ni escrituras en datos de clientes.
- Bloquear cualquier acción de limpieza/reset hasta validar que el tenant es exclusivamente demo.

## Comandos objetivo (ejecutar desde el repo de auditoría)
- `npm ci`
- `npx playwright install --with-deps chromium`
- `npx playwright test`
- `npx playwright show-report`
- `npx lhci autorun`

## Criterio de aceptación del frente
No basta con que la UI renderice. Deben existir evidencias repetibles de tareas clave en desktop y móvil, accesibilidad automatizada + revisión manual, estados de error y datos vacíos, y rendimiento medido. Los umbrales se definirán tras la primera línea base, no se inventarán antes.
