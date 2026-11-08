---
name: nuva-product-experience-audit
description: Audita y mejora Nüva One para lanzamiento comercial: UX, UI, accesibilidad, responsive, motion, rendimiento percibido y flujos de negocio. Trabaja con evidencia y en una rama aislada.
---

# Nüva One — Product Experience & Commercial Readiness

## Misión
Convertir Nüva One en un producto B2B comercialmente convincente para pymes y empresas chilenas. Evaluar el producto como un usuario real, no como una colección de componentes. La meta es claridad operativa, confianza, velocidad, consistencia y conversión.

## Contexto técnico
- Repo: martinaburtoe-art/nuva-one
- Stack: React 19, TypeScript, Vite/TanStack Router, Tailwind, Supabase, Inngest.
- Producción: https://nuva-one.vercel.app/
- Rama de trabajo inicial: work/nuva-product-audit-hermes-20261108
- No asumir que la copia local está sincronizada. Verificar HEAD, rama, estado de trabajo y origen antes de actuar.

## Reglas no negociables
1. No modificar producción, secretos, autenticación, RLS, billing, checkout, migraciones, workflows de release ni Inngest general queue en este frente.
2. No tocar ni cancelar el PR #302 ni sus workflows críticos. Trabajar en la rama de auditoría y rebasear solo después de verificar que no se sobrescribe trabajo.
3. No inventar datos, resultados, cobertura, screenshots ni validaciones. Diferenciar evidencia estática, ejecución local, preview y producción.
4. No instalar dependencias en el proyecto principal para experimentar. Herramientas de auditoría deben vivir en un repositorio/harness separado o como dependencias aisladas aprobadas.
5. No hacer cambios masivos visuales antes de definir criterios, capturar baseline y priorizar los problemas.
6. Todo cambio UI debe respetar responsive, teclado, lectores de pantalla, contraste, estados loading/empty/error/success y prefers-reduced-motion.
7. Preservar español de Chile, CLP, términos del dominio pyme y cumplimiento chileno. No afirmar cumplimiento legal sin revisión experta.
8. No reemplazar datos reales por fixtures silenciosamente. Distinguir demo/ejemplo de datos de negocio reales.
9. No crear duplicados de tarjetas, accesos, alertas o indicadores en dashboard.
10. Reportar PASS/WARN/FAIL/UNKNOWN. UNKNOWN nunca equivale a PASS.

## Método de auditoría
### A. Descubrimiento del producto
- Mapear rutas públicas y autenticadas.
- Identificar los 5 trabajos principales del usuario y sus rutas completas.
- Encontrar duplicidad de módulos, etiquetas, CTA y fuentes de verdad.
- Identificar qué es real, demo, parcial, bloqueado o solo visual.

### B. Auditoría de experiencia
Evaluar con escala 0–4 y evidencia:
- Comprensión inmediata y jerarquía visual.
- Navegación, orientación y arquitectura de información.
- Tiempo/acciones para completar tareas.
- Consistencia entre módulos y patrones.
- Feedback de acciones, validación y recuperación de errores.
- Densidad cognitiva, tablas, filtros y formularios.
- Responsive real en 360, 390, 768, 1024, 1440 px.
- Accesibilidad WCAG 2.2 AA: teclado, foco, nombres accesibles, contraste, estructura, motion.
- Rendimiento percibido: carga inicial, navegación, skeletons, layout shifts.
- Confianza: estados de sincronización, datos demo, permisos, seguridad y transparencia.

### C. Flujos comerciales que deben probarse
1. Registro → onboarding → crear/seleccionar negocio → primer valor.
2. Registrar venta → descontar stock → ver impacto en caja/indicadores.
3. Crear producto → ajustar stock → detectar stock bajo → acción de reposición.
4. Crear cliente/cotización → seguimiento → convertir a venta.
5. Abrir finanzas → entender ingresos/egresos → tomar una acción.
6. Consultar Nüva IA → respuesta con datos trazables y límites explícitos.
7. Invitar colaborador → permisos correctos → acceso limitado.
8. Demo sin tarjeta → datos ficticios claramente identificados → reinicio reproducible.

### D. Herramientas recomendadas en entorno aislado
- Playwright: recorridos reales, screenshots desktop/mobile, trazas y network.
- @axe-core/playwright: checks de accesibilidad automatizados.
- Lighthouse CI: performance, accessibility, best practices y SEO.
- Pa11y o axe CLI como segunda comprobación si aporta señal.
- Vitest: pruebas de lógica/UI existentes, sin duplicar suites.
- Storybook solo si la biblioteca de componentes requiere catálogo visual; no introducir por defecto.
- Capturas comparativas versionadas por ruta/viewport. Nunca subir datos personales o secretos.

No instalar estas herramientas dentro del producto sin análisis de impacto. Preferir un repositorio independiente de auditoría con Playwright, axe y Lighthouse, enlazado al repo de Nüva One.

## Protocolo de ejecución
1. Leer AGENTS.md/README/instrucciones y confirmar branch + SHA + working tree.
2. Mapear rutas, layouts, componentes y servicios desde el código.
3. Levantar preview/local de forma segura; usar cuenta demo y datos ficticios.
4. Capturar baseline antes de editar.
5. Ejecutar auditoría por ruta y flujo, registrando evidencia y severidad.
6. Crear backlog ordenado por impacto comercial × frecuencia × severidad × esfuerzo.
7. Corregir en lotes pequeños, con pruebas específicas.
8. Revisar diff y validar typecheck, lint focalizado, tests, build, Playwright, axe y Lighthouse según alcance.
9. Entregar informe con enlaces a screenshots/traces, rutas, commit, pruebas y limitaciones.
10. No declarar etapa completa mientras queden flujos P0/P1 sin verificar.

## Severidad
- P0: pérdida de datos, exposición, bloqueo de operación crítica, cobro incorrecto.
- P1: flujo comercial principal roto, onboarding/checkout/login inaccesible, navegación crítica confusa.
- P2: fricción frecuente, inconsistencia visual/funcional, responsive/accessibility importante.
- P3: pulido, microinteracciones y mejoras no bloqueantes.

## Primer entregable
Crear un mapa de experiencia y baseline audit sin cambiar código funcional. Registrar hallazgos como:
- ID, ruta, viewport, flujo, evidencia, severidad, impacto, recomendación, esfuerzo, estado.
