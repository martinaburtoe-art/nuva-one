# Nüva One — Auditoría UX del sistema interno
**Fecha:** 16 de noviembre de 2026  
**Alcance:** aplicación autenticada, desde el selector de negocio y el shell hasta los módulos operativos. Se excluyen landing, pricing y páginas públicas.

## Resumen ejecutivo
La aplicación interna ya dispone de una estructura funcional amplia: shell autenticado, contexto de negocio, navegación desktop y móvil, permisos por módulo, Resumen y espacios especializados. El problema principal observado no es falta de módulos, sino la necesidad de hacer que la complejidad existente sea comprensible: hay varias entradas que cubren áreas similares, distintas convenciones visuales entre módulos y estados funcionales que aún no tienen un centro unificado.

## Hallazgo confirmado y corrección aplicada

### INT-PRIV-001 — Consultas de remuneraciones antes de verificar rol
**Severidad:** alta (privacidad / mínimo privilegio).  
**Evidencia:** `src/routes/_authenticated/people-payroll.tsx` consultaba empleados, contratos, períodos, inputs, ítems de nómina, liquidaciones y filas LRE mediante `useBizList` antes de resolver el estado de autorización `isAuthorized`. La pantalla mostraba un mensaje de acceso restringido para roles distintos de owner/admin, pero las consultas se podían disparar igualmente. RLS sigue siendo la barrera de seguridad; el frontend no debe solicitar datos que no necesita.
**Corrección:** las siete consultas ahora usan `enabled: isAuthorized`. No se altera RLS ni el modelo de permisos del backend.
**Validación pendiente:** typecheck, pruebas, lint y verificación con sesión staff/viewer y owner/admin.

## Hallazgos de arquitectura de experiencia

### INT-IA-001 — Navegación financiera fragmentada
**Severidad:** media.  
La navegación presenta siete destinos dentro de Finanzas: Finanzas, Contabilidad y tributación, Centro financiero profesional, Panel financiero, Control financiero, Integridad financiera e Indicadores; además de Calculadora de precios. El código muestra solapamiento importante:
- `/finance` reúne control financiero, prioridades de cobro, espacio SII, herramientas avanzadas y workspace contable.
- `/finance-professional` vuelve a presentar el control financiero, herramientas SII y un hub de herramientas.
- `/financial-dashboard` vuelve a presentar resultado, ingresos/gastos, flujo de caja e impuestos.
- `/financial-control` y `/financial-integrity` tienen controles especializados que parecen aportar funciones distintas.
**Recomendación:** conservar una puerta principal de Finanzas y convertir los destinos especializados en herramientas claramente diferenciadas. Antes de ocultar rutas o mover funcionalidades, comparar todos los flujos y accesos; no se elimina ninguna ruta en esta entrega.

### INT-IA-002 — CRM e Inteligencia tienen tres puntos de entrada
**Severidad:** media.  
`/customers`, `/customer-action-center`, `/customers-intelligence` y `/executive-command-center` contienen experiencias relacionadas con cartera, prioridades, actividad comercial y decisiones. Deben diferenciarse explícitamente por tarea: administrar clientes, ejecutar seguimiento, analizar cartera y dirigir el negocio. No conviene fusionarlas sin mapear acciones y datos exclusivos.

### INT-IA-003 — People tiene dashboard y submódulos repetidos en navegación
**Severidad:** baja-media.  
`/people` ya presenta accesos a colaboradores, asistencia, remuneraciones, vacaciones/finiquitos y cumplimiento, mientras que esos espacios también aparecen como destinos de primer nivel en el sidebar. La repetición puede ser útil como acceso rápido, pero debe ser consistente con el patrón que se adopte para Finanzas e Inventario.

### INT-NAV-001 — Navegación móvil y desktop
**Estado observado en código:**
- El dock móvil mantiene Resumen, Caja, Ventas e Inventario como destinos persistentes.
- El panel “Más” ofrece búsqueda por módulos y agrupa los resultados por sección.
- El sidebar desktop agrupa por área y expande automáticamente la sección de la ruta activa.
**Criterio de aceptación:** cada módulo autorizado debe ser accesible en desktop y móvil, los resultados de búsqueda deben respetar permisos, el dock debe mantenerse estable y no deben aparecer destinos duplicados ni enlaces que lleven a una pantalla bloqueada.

### INT-OPS-001 — Centro de notificaciones todavía sin fuente de eventos
**Severidad:** media.  
El shell presenta un estado vacío que informa que las notificaciones automáticas todavía no están conectadas. La interfaz ya no simula alertas. Falta definir el modelo de eventos, preferencias, lectura/no lectura y navegación a la entidad afectada antes de implementar un centro real.

### INT-PERF-001 — Chunks grandes en el build
**Severidad:** media (rendimiento percibido; requiere análisis de uso real).  
**Evidencia:** el build Vercel de esta rama termina correctamente, pero emite el aviso de chunks superiores a 500 kB. Entre los assets generados se observan ExcelJS (929,38 kB sin comprimir; 256,38 kB gzip), jspdf (398,92 kB; 129,61 kB gzip) y Recharts (367,50 kB; 97,83 kB gzip). Esto no demuestra que todos se descarguen en el arranque: pueden estar en chunks diferidos.  
**Acción recomendada:** revisar imports estáticos frente a imports dinámicos y comprobar en navegador autenticado la cascada de red por ruta. Mantener ExcelJS, PDF y gráficos fuera del bundle inicial si solo se usan en acciones/pantallas específicas. Medir LCP, INP y peso transferido antes y después; no dividir chunks a ciegas.

## Criterios de aceptación para certificar el sistema interno
1. Todas las rutas autenticadas abren con negocio activo, sin negocio, negocio inválido, membresía pendiente y error de permisos.
2. Desktop: sidebar expandido/colapsado, navegación activa, búsqueda global, cambio de negocio y retorno desde submódulos.
3. Móvil: 320, 360, 390 y 430 px; dock, panel “Más”, teclado virtual, safe areas, formularios, tablas y diálogos.
4. Accesibilidad: teclado completo, foco visible, nombres accesibles, landmarks, contraste WCAG 2.2 AA, zoom y reduced motion.
5. Estados de datos: loading, vacío, error recuperable, permisos denegados, datos parciales y actualización tras mutaciones.
6. Flujos E2E con datos de prueba: venta → stock → caja → Resumen; cotización → aceptación → documento interno; compra → recepción → stock; cliente → seguimiento CRM; remuneraciones con owner/admin frente a staff/viewer.
7. Coherencia visual entre módulos: tipografía, escalas, espaciado, radios, tablas, filtros, botones, estados y jerarquía de títulos.
8. Rendimiento: rutas pesadas lazy-loaded, evitar lecturas repetidas, paginar listados extensos y medir Web Vitals con sesión autenticada.

## Estado de esta auditoría
- Auditoría de código de shell, navegación, Resumen, Finanzas, CRM, People, Inventario, Caja, cotizaciones y documentos de cobro: revisión estática parcial.
- Corrección INT-PRIV-001 subida en esta rama.
- No se declara certificación visual, WCAG ni E2E: aún requiere ejecución de pruebas y navegador autenticado.
- No se modificó producción.
