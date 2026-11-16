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


## Iteración UX aplicada — búsqueda de módulos e imágenes de inventario

**Fecha:** 2026-11-16.  
**Alcance:** solo workspace autenticado.

### UX-SEARCH-001 — Búsqueda de módulos más clara y tolerante al idioma
- El buscador lateral usa un campo más legible, foco visible, acción explícita para limpiar y resultados con iconografía consistente.
- La búsqueda ignora mayúsculas y diacríticos; “tributacion” encuentra “Contabilidad y tributación”.
- Enter abre directamente el único resultado inequívoco; Escape limpia el término.
- Se eliminó el indicio visual de atajo de teclado en el buscador local, porque el atajo global Cmd/Ctrl+K pertenece a la paleta global y no a este campo.
- Se añadieron pruebas unitarias para normalización, coincidencias y consultas vacías/no encontradas.
- La búsqueda sigue recibiendo exclusivamente los destinos ya filtrados por permisos del shell.

### UX-INVENTORY-001 — Fotografía real del producto en las vistas de inventario
- La consulta de inventario ahora incluye el campo image_url, que ya consume el Catálogo digital.
- Se muestran miniaturas en las vistas de stock y productos, tanto móvil como desktop.
- Se mantiene un fallback de icono neutro cuando el producto no tiene fotografía.
- Las imágenes llevan texto alternativo descriptivo y carga diferida; no se generan ni se asignan imágenes ficticias a productos reales.
- Esta iteración muestra fotografías que ya estén guardadas en image_url; no implementa todavía un flujo de carga/edición de archivos porque primero se debe verificar el bucket, sus políticas de Storage, límites de tamaño/tipo y estrategia de URL. No se debe adivinar el bucket ni debilitar sus permisos.

### Criterios de diseño adoptados
- Menos ruido visual: las imágenes se usan cuando identifican un producto; los iconos se reservan para navegación, acciones y estados.
- Iconografía funcional y consistente, acompañada por texto cuando el significado no es universal.
- Interacciones reversibles y explícitas; búsqueda con Escape/limpiar y foco visible.
- No introducir ilustraciones decorativas genéricas en pantallas operativas ni datos de ejemplo que puedan confundirse con información real.
- Las siguientes fases deben priorizar unificar la jerarquía de Finanzas/CRM/People, estados vacíos con acciones claras y un patrón de ficha de producto con carga de imágenes segura.

### Estado de validación de esta iteración
- Cambios committeados en la rama de trabajo.
- Pruebas añadidas, pero su ejecución todavía debe confirmarse mediante CI.
- Build preview Vercel solicitado para el commit de esta iteración; estado final pendiente de confirmación.
- Sin promoción a producción y sin cambios de base de datos o políticas RLS.


### UX-INVENTORY-002 — Carga de fotografía desde la ficha del producto
- Se verificó en Supabase de producción el bucket `product-images`: público para lectura, límite 5 MiB y tipos permitidos JPEG, PNG, WEBP y GIF.
- Se verificaron las políticas existentes de `storage.objects`: carga, actualización y eliminación restringidas por `private.has_business_role` al ID de negocio contenido en la primera carpeta; no se crearon ni alteraron políticas.
- El formulario de producto ahora permite seleccionar una fotografía, valida MIME y tamaño antes de guardar y la carga bajo la ruta `{businessId}/{productId}/{uuid}.{ext}` con `upsert: false`.
- Se obtiene la URL pública del bucket y se guarda en `products.image_url`; el catálogo e inventario pueden reutilizar esa misma fotografía.
- Se usa un nombre aleatorio por carga para evitar sobrescritura y problemas de caché. El archivo anterior no se elimina automáticamente para evitar borrar una imagen aún referenciada si falla la actualización de la ficha.
- La carga requiere membresía que ya esté autorizada por las políticas existentes. La validación del frontend mejora la experiencia, pero las políticas de Storage siguen siendo la barrera real de autorización.
- Validación pendiente: probar carga real y lectura con sesión owner/admin/staff, y comprobar que un usuario de otro negocio no pueda escribir en esa carpeta. El build preview de la iteración está en curso; no se declara despliegue final hasta que Vercel lo confirme.


### Verificación de preview — fotografía y búsqueda
- Vercel deployment `dpl_F471KopkGFfQG2bzniWg12qkpmeS` terminó en estado `READY` para el commit de código `bf79e5ccf2e51f8bb72e9324afc846f646d5e9c5`.
- Las rutas `/inventory` y `/dashboard` responden HTTP 200 en el preview `https://nuva-qzsg26hw7-martinaburtoe.vercel.app`.
- Esto confirma build y respuesta HTTP de las rutas, no una sesión autenticada ni prueba de interacción real. La validación de carga con usuario y la inspección visual autenticada siguen pendientes.
- El build mantiene avisos de chunks mayores de 500 kB (ExcelJS, jsPDF y Recharts). Son artefactos del build; no se ha demostrado que todos se descarguen al inicio.


## IA aplicada — simplificación de navegación autenticada

### NAV-IA-002 — Menos entradas repetidas en el menú de escritorio
- Se identificó que `Centro financiero profesional` repetía elementos centrales ya presentes en `/finance` (control financiero y acceso SII), además de exponer un segundo punto de entrada al mismo conjunto de herramientas.
- Se conserva la ruta `/finance-professional` y su acceso por búsqueda global, búsqueda de módulos y directorio móvil; se retira solamente de la lista principal del sidebar de escritorio mediante metadato `quickAccessOnly`.
- El sidebar expandido y contraído usan la misma lista simplificada. La lista autorizada completa sigue alimentando las búsquedas y la navegación móvil; no se elimina ni se bloquea la funcionalidad.
- `Centro de acción CRM` pasa a llamarse `Seguimiento comercial`, etiqueta orientada a la tarea y más comprensible para usuarios no técnicos. La ruta no cambia.
- No se han fusionado ni eliminado páginas ni datos. La arquitectura final de Finanzas y CRM requiere todavía mapear acciones exclusivas y enlaces internos antes de una consolidación más profunda.
- Pendiente: validar que `/finance-professional` siga apareciendo en búsqueda global y módulo móvil con permisos de Finanzas, y que no aparezca a usuarios sin permiso.


## Investigación visual — principios de Pinterest adaptados a Nüva One

**Fecha:** 2026-11-16.  
**Alcance:** solo aplicación autenticada; no se modifica landing, pricing ni páginas públicas.  
**Objetivo:** incorporar la capacidad de Pinterest para hacer que una interfaz sea visual, atractiva y fácil de explorar, sin sacrificar precisión operativa, densidad de información ni accesibilidad.

### Lectura del referente

Pinterest funciona como una galería visual: el contenido es protagonista y la interfaz de soporte se mantiene discreta. La síntesis de su lenguaje visual apunta a:
- lienzo claro y cálido, con superficies blanco roto/perla;
- tipografía con jerarquía marcada por tamaño, peso y espacio, no por múltiples colores;
- radios amplios y consistentes, con separación generosa entre grupos;
- controles de búsqueda y filtros fáciles de descubrir;
- un color de acento reservado para acciones primarias;
- tarjetas cuyo contenido y proporción visual aportan identidad, en vez de depender de decoración superpuesta.

**Límite de transferencia:** el patrón masonry de Pinterest está optimizado para explorar imágenes de proporciones distintas. No se debe trasladar a tablas de ventas, caja, nómina, contabilidad o inventario transaccional. En Nüva, las listas y tablas deben conservar alineación, ordenación, comparación y escaneo rápido.

### Dirección propuesta: “Nüva Editorial Operations”

Una identidad interna que combina la calidez editorial de Pinterest con la disciplina de un producto financiero/operativo:
- **Base cromática:** perla cálida y gris niebla para el canvas; blanco para superficies de trabajo; grafito para texto.
- **Acento:** mantener el índigo de Nüva para acciones y selección; oro apagado solo para información secundaria o énfasis de marca. No introducir el rojo Pinterest como color de marca.
- **Color semántico:** verde, ámbar y rojo únicamente para estados reales (correcto, atención, crítico), nunca como decoración.
- **Tipografía:** una familia sans consistente; títulos compactos y expresivos, cifras tabulares, etiquetas secundarias legibles. Evitar texto diminuto y exceso de mayúsculas espaciadas.
- **Geometría:** radios coherentes por nivel (controles, tarjetas, paneles); evitar que cada módulo invente sus propias esquinas, sombras y alturas.
- **Superficies:** sombras muy suaves o bordes finos; no aplicar glassmorphism, blur o gradientes a todas las tarjetas.
- **Movimiento:** microinteracciones cortas y discretas; movimiento solo donde existe interacción. Respetar prefers-reduced-motion.

### Aplicaciones concretas dentro del sistema

| Área | Idea visual aplicable | Restricción funcional |
|---|---|---|
| Resumen | Encabezado editorial breve, indicadores principales bien jerarquizados, bloques de análisis con espacio y ritmo | No duplicar KPIs, alertas o accesos ya existentes |
| Inventario | Foto real como identificador del producto; miniatura consistente, nombre, SKU y stock legibles | No usar fotos decorativas ni imágenes generadas para representar stock real |
| Catálogo | Cuadrícula visual para descubrir productos, con alternancia de proporciones solo si la imagen aporta valor | Mantener una vista de tabla/lista para gestión masiva y comparación |
| CRM | Fichas de cliente con avatar/logo si existe, etapa, última actividad y próxima acción | No reemplazar pipeline ni datos tabulares por tarjetas gigantes |
| Finanzas | Paneles editoriales para flujo, tendencias y resumen; tablas sobrias para movimientos y conciliación | No ocultar fechas, montos, origen, estado ni acciones |
| Cotizaciones | Vista de documentos con miniatura/preview, estado, cliente y total claramente escaneables | Acciones de enviar, duplicar, descargar y convertir deben seguir explícitas |
| People | Perfiles y directorio más humanos, con jerarquía clara de datos | Datos salariales y contractuales permanecen restringidos según permisos |
| Móvil | Tarjetas apiladas, controles compactos y navegación persistente; imágenes solo cuando identifican entidades | Priorizar tareas frecuentes, touch targets y lectura sin zoom |

### Sistema de componentes a normalizar

1. **PageHeader:** título, contexto de negocio, descripción corta y una acción primaria.
2. **SectionHeader:** título de sección, ayuda contextual y acción secundaria opcional.
3. **MetricCard:** valor, etiqueta, período/base de comparación y tendencia explicada.
4. **EntityCard:** imagen/avatar opcional, nombre, metadatos clave y estado; no más de una acción primaria visible.
5. **FilterChip / FilterBar:** filtros activos legibles, limpiar filtros y conteo de resultados.
6. **DataTable:** cabecera estable, alineación numérica, estados, acciones por fila y responsive definido.
7. **EmptyState:** explicación concreta, motivo del vacío y una acción siguiente; no ilustración genérica.
8. **StatusBadge:** color semántico consistente y texto explícito; nunca depender solo del color.
9. **CommandSearch:** búsqueda global con resultados agrupados, permisos aplicados y acciones rápidas.
10. **MobileEntityRow:** alternativa móvil compacta a la tabla, conservando los campos que permiten decidir.

### Tokens visuales iniciales para validar en código

Estos valores son una propuesta de dirección, no una afirmación de que ya estén implementados globalmente:
- Canvas: `#F6F6F3` o un tono perla equivalente del sistema actual.
- Surface: `#FFFFFF`.
- Text primary: grafito de alto contraste (aprox. `#202124`).
- Text secondary: gris neutro con contraste suficiente; evitar grises demasiado pálidos en texto funcional.
- Accent: conservar el índigo existente de Nüva.
- Radius: 12–16 px para controles/tarjetas y 20–24 px solo para paneles destacados; evitar 30–40 px indiscriminadamente.
- Spacing: escala coherente basada en múltiplos de 4/8 px; reservar 16–24 px entre grupos y más espacio entre secciones.
- Elevation: borde fino como primera opción; sombra suave solo para separar capas.

### Antipatrones que se deben evitar

- Convertir cada dato en una tarjeta: aumenta scroll y reduce comparación.
- Usar masonry en información transaccional.
- Usar fotos, gradientes, emojis o ilustraciones para decorar módulos sin función.
- Repetir el mismo KPI en varias zonas de la misma pantalla.
- Ocultar acciones frecuentes dentro de menús de tres puntos.
- Colorear todos los estados; el color pierde significado.
- Reducir tipografía y contraste para “hacer caber” más contenido.
- Aplicar una estética distinta en cada módulo, generando una suite de productos inconexa.

### Orden recomendado de implementación

**Fase V1 — lenguaje visual compartido:** definir tokens, PageHeader, SectionHeader, MetricCard, filtros, estados vacíos y tablas; aplicarlo primero a Resumen e Inventario.  
**Fase V2 — identidad por entidad:** mejorar fichas de producto, cliente y documento con imágenes reales opcionales y metadatos accionables.  
**Fase V3 — coherencia de módulos:** llevar los mismos patrones a Finanzas, CRM, Cotizaciones y People sin eliminar funciones.  
**Fase V4 — responsive y pulido:** validar 320/360/390/430 px, tablet y desktop; comprobar teclado, contraste, reduced motion, estados de carga/error y rendimiento.

### Criterios de aceptación visual

- Un usuario identifica en pocos segundos el título, contexto, acción primaria y estado de la pantalla.
- La jerarquía visual funciona sin depender del color.
- Las tablas conservan lectura, alineación y comparación.
- Las imágenes solo aparecen cuando identifican una entidad real.
- Los componentes equivalentes se ven y se comportan igual entre módulos.
- El diseño móvil no es una versión comprimida del desktop.
- Ninguna mejora visual reduce permisos, visibilidad de datos o acceso a acciones existentes.

### Fuentes de inspiración consultadas

- Pinterest visual language (referencia de estilo): https://geoffreymanda.github.io/design-atlas/styles/pinterest.html
- Pinterest design system analysis: https://layout.design/gallery/pinterest
- Pinterest-inspired component analysis: https://www.shadcn.io/design/pinterest
- Pinterest visual discovery and hybrid search: https://medium.com/pinterest-engineering/hybrid-search-building-a-textual-and-visual-discovery-experience-at-pinterest-8527ba9728a9
- Real SaaS product UI patterns: https://www.saasui.design/saas-design-inspiration
- ERP inventory list pattern: https://dribbble.com/shots/26948473-Inventory-Management-Dashboard-SaaS-UI-Design
- ERP dashboard references: https://dribbble.com/search/erp-dashboard-ui
- Finance dashboard references: https://dribbble.com/search/finance-dashboard-ui
