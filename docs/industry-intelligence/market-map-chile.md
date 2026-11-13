# Nüva One Industry Intelligence — mercado chileno y diseño de producto

**Corte de investigación:** 12 de noviembre de 2026  
**Estado:** investigación de producto y especificación; no constituye asesoría tributaria, sanitaria ni legal.

## 1. Decisión de producto

Nüva One debe evolucionar desde una suite horizontal de gestión hacia un **Business Operating System con perfiles sectoriales configurables**. El usuario no debe elegir solamente "retail" o "servicios": debe seleccionar la actividad concreta y describir cómo opera. Esa elección activa un paquete de capacidades, vocabulario, catálogos, reglas de inventario, indicadores, flujos y ayudas de IA.

La personalización tiene tres niveles independientes:

1. **Industria base**: valor compatible con el enum actual `business_industry` (`retail`, `food`, `services`, `manufacturing`, `health`, `construction`, `other`).
2. **Perfil sectorial**: identificador estable como `hardware_store`, `neighborhood_grocery` o `auto_repair`.
3. **Configuración del establecimiento**: respuestas y preferencias específicas (venta por peso, variantes, lotes, sucursales, producción, agenda, despacho, etc.).

No convertir el código de actividad SII en el perfil de producto: el giro tributario y el modo operativo son dimensiones relacionadas, pero distintas. Una empresa puede declarar varias actividades y operar varios canales.

## 2. Evidencia de mercado chileno

- El INE informó el 28-09-2026 que identificó **1.207.333 empresas activas en 2025**; Comercio representa 33,6%, Manufactura 10,2% y Transporte y almacenamiento 8,8%. Microempresas: 865.324 (71,7%); pequeñas: 242.832 (20,1%). Fuente: https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/09/28/ine-publica-por-primera-vez-resultados-del-registro-estad%C3%ADstico-de-unidades-econ%C3%B3micas-%28rue%29-se-identificaron-1.207.333-empresas-activas-en-2025-a-nivel-nacional
- SUBREI recoge 1.194.430 MiPymes según datos SII del año tributario 2024 y la clasificación por ventas en UF. Fuente: https://www.subrei.gob.cl/ejes-de-trabajo/home-comercio-inclusivo/pymes
- La ELE-7 del Ministerio de Economía señala que las MiPymes representan conjuntamente el 97% de las empresas de su universo de estudio y destaca Comercio, Transporte y Manufactura. Universo y periodo deben considerarse al interpretar sus cifras. Fuente: https://www.economia.gob.cl/2024/12/27/septima-encuesta-longitudinal-de-empresas-ele-7.htm
- El SII mantiene estadísticas empresariales por actividad, territorio, tamaño y ventas (años comerciales 2005–2025; actualización octubre 2026). Fuente: https://www.sii.cl/sobre_el_sii/estadisticas_de_empresas.html

**Implicación:** el comercio es un primer mercado amplio; manufactura y transporte son verticales de alto potencial; servicios profesionales, gastronomía y construcción permiten ampliar cobertura sin reducir el producto a un POS.

## 3. Catálogo sectorial priorizado

### A. Comercio y distribución

#### 1. Ferreterías, barracas y materiales de construcción — prioridad P0
- Catálogo: familia → producto base → variante/SKU. Ejemplos: tubo PVC por diámetro, largo y presión; perno por diámetro, largo, hilo y material; cable por sección y color; plancha por espesor y dimensión; pintura por color, acabado y volumen.
- Unidades: unidad, metro lineal, m², m³, kilo, saco, caja, rollo, barra y pallet. Compra y venta pueden usar unidades distintas con conversiones explícitas.
- Operación: cotización de obra, listas por cliente/contratista, descuentos por volumen, cortes, reservas, despacho, equivalencias y sustitutos compatibles.
- Indicadores: margen por familia y SKU, rotación, quiebres, stock inmovilizado, exactitud de inventario, cotizaciones ganadas/perdidas, rentabilidad por cliente/obra.
- IA: sugerir reposición, detectar sustitutos, advertir dimensiones incompatibles y preparar cotización con partidas.
- No inferir compatibilidad técnica sin datos confirmados del fabricante.

#### 2. Almacenes, minimarkets y supermercados — prioridad P0
- Catálogo de alta rotación, EAN/UPC, formatos y packs; venta por unidad y caja.
- Reposición por proveedor, stock mínimo/máximo, inventario rápido, promociones, combos, turnos/caja, diferencias y cierre.
- Perecibles: lote, vencimiento, FEFO, merma por causa, alertas y retiro; no aplicar lotes a todo producto indiscriminadamente.
- Indicadores: venta/hora, margen por categoría, rotación, merma, quiebres, ticket promedio, contribución de promociones.
- IA: lista de compra sugerida y alerta de vencimientos/merma.

#### 3. Botillerías y tiendas de bebidas
- Envases, formatos, packs, retornables, depósitos/garantías, lotes y promociones.
- Control de edad y cumplimiento de restricciones legales en los puntos que correspondan; no crear flujos que incentiven venta ilegal.
- Indicadores: mix, margen por formato, retornables pendientes y rotación.

#### 4. Verdulerías, fruterías y productos frescos
- Compra por caja/saco y venta por kg/unidad; peso variable, rendimiento, clasificación/calibre y estacionalidad.
- Merma por recepción, selección, deterioro y vencimiento; precio y margen sensibles a variación diaria del costo.
- Indicadores: rendimiento vendible, merma %, margen real por kilo y reposición por temporada.

#### 5. Carnicerías, pescaderías y fiambrerías
- Cortes y presentaciones; peso variable; unidad de origen y venta; lotes, recepción, vencimientos y trazabilidad.
- Rendimiento por desposte/corte, merma y costo real por corte.
- Cadena de frío y registros sanitarios requieren procedimientos y validación externa; el software ayuda a registrar, no certifica cumplimiento.

#### 6. Tiendas de ropa, calzado y accesorios
- Matriz de variantes talla × color × modelo; SKU y código de barras por variante.
- Colecciones, temporada, transferencias entre sucursales, cambios/devoluciones, reservas y preventa.
- Indicadores: sell-through, rotación por talla/color, quiebres de curva, antigüedad y margen por colección.

#### 7. Librerías, papelerías, regalos y electrónica
- ISBN/edición para libros; modelo, capacidad, color y compatibilidad para electrónica; kits y accesorios.
- Número de serie/IMEI cuando aplique, garantía, reparación y trazabilidad.
- Indicadores: margen por modelo, accesorios asociados, garantías y obsolescencia.

#### 8. Distribuidoras y mayoristas — prioridad P0
- Múltiples listas de precio, escalas de descuento, unidades de embalaje, mínimos de pedido, crédito por cliente.
- Bodegas, picking, packing, despacho, rutas, guías de despacho y conciliación de entregas.
- Indicadores: margen neto después de despacho, fill rate, OTIF, DSO, rotación y rentabilidad por ruta/cliente.

### B. Alimentos, producción y hospitalidad

#### 9. Restaurantes, cafeterías y fuentes de soda
- Menú, modificadores, combos, recetas/BOM, ingredientes, rendimientos y costeo por porción.
- Mesas/comandas, cocina, retiro/delivery, reservas, turnos y cierres.
- Indicadores: food cost, margen por plato, desperdicio, tiempo de preparación, ventas por franja y ocupación.
- Separar integración POS/delivery de la contabilidad; no duplicar ventas al sincronizar.

#### 10. Panaderías y pastelerías
- Fórmulas, porcentajes de panadero, lotes de producción, rendimiento, mermas, vencimientos y producción planificada.
- Venta por unidad/peso/caja, pedidos anticipados, tortas personalizadas y fechas de entrega.
- Indicadores: costo por lote/unidad, rendimiento real, desperdicio y cumplimiento de pedidos.

#### 11. Manufactura y talleres productivos
- BOM/lista de materiales, rutas, órdenes de producción, consumos, sustituciones autorizadas, lotes y producto terminado.
- Costos directos, mano de obra, overhead configurable, mermas y control de calidad.
- Indicadores: costo real vs estándar, rendimiento, scrap, capacidad, OEE cuando exista captura suficiente.

### C. Servicios, activos y proyectos

#### 12. Talleres mecánicos y repuesteras — prioridad P1
- Orden de trabajo por vehículo (patente, VIN, marca, modelo, año, kilometraje); diagnóstico, tareas, repuestos, mano de obra y autorización.
- Compatibilidad de repuestos como dato verificable, garantías, fotos, historial y recordatorios.
- Indicadores: margen por OT, horas facturadas vs disponibles, retorno por cliente, retrabajo y rotación de repuestos.

#### 13. Agricultura, viveros y agroinsumos
- Predio/cuadrante/temporada/cultivo, insumos, aplicaciones, labores, cosechas, lotes y rendimiento.
- Inventario por unidad agrícola (kg, litro, saco, bandeja, planta); costos por hectárea/ciclo.
- Indicadores: costo por hectárea, rendimiento, consumo de insumos y margen por cultivo.
- Registrar productos fitosanitarios y restricciones solo con catálogos y validación regulatoria vigentes.

#### 14. Transporte y logística
- Flota, conductores, viajes, cargas, rutas, combustible, peajes, mantenimiento, neumáticos y documentos.
- Costos por km/viaje/tonelada, ocupación, entrega a tiempo, incidentes y disponibilidad de flota.
- No presentar GPS o telemetría como disponible si no existe integración activa.

#### 15. Construcción y contratistas
- Obras, presupuestos por partidas, estados de pago, avance físico/financiero, subcontratos, materiales, equipos y mano de obra.
- Cotización y consumo de materiales por obra; solicitudes y órdenes de compra; control de cambios.
- Indicadores: margen proyectado/final por obra, desviación de presupuesto, avance, productividad y caja futura.

#### 16. Servicios profesionales y agencias
- Clientes, oportunidades, propuestas, contratos, proyectos, hitos, horas, entregables y gastos imputables.
- Facturación recurrente/hitos, rentabilidad por proyecto y utilización de capacidad.
- Indicadores: margen por cliente/proyecto, horas vendibles, pipeline, renovaciones y DSO.

#### 17. Peluquerías, barberías, estética y bienestar
- Agenda, duración, profesional, sala/cabina, servicios, insumos, comisiones, bonos y membresías.
- Reservas, recordatorios, ausencias, recurrencia y venta cruzada de productos.
- Indicadores: ocupación, ingreso por hora/cabina, recurrencia, ticket y comisión.

#### 18. Veterinarias y tiendas de mascotas
- Ficha de mascota vinculada al tutor, consultas, vacunas, tratamientos, controles y recordatorios.
- Inventario de alimentos por marca/formato/etapa, lotes/vencimientos y productos asociados.
- Datos clínicos requieren permisos reforzados y límites claros; el sistema de gestión no reemplaza el registro clínico regulado.

#### 19. Hoteles, hostales, cabañas y turismo
- Unidades/habitaciones, capacidad, temporadas, tarifas, reservas, check-in/out, huéspedes, servicios y mantenimiento.
- Canales y comisiones, depósitos, cancelaciones y disponibilidad.
- Indicadores: ocupación, ADR, RevPAR, cancelación, ingreso adicional y costo por habitación ocupada.

#### 20. Arriendo de equipos, maquinaria y herramientas
- Activos serializados, disponibilidad, calendario, tarifas por hora/día/semana, depósitos, inspección y mantención.
- Contrato, entrega/recepción, daños, accesorios y penalidades.
- Indicadores: utilización, ingreso por activo, downtime, mantenimiento y retorno.

#### 21. Educación, academias y gimnasios
- Alumnos/socios, cursos/planes, matrículas, cuotas, asistencia, clases, cupos, renovaciones y morosidad.
- Indicadores: retención, ocupación, ingresos recurrentes, morosidad y uso por franja.

#### 22. Servicios técnicos, instalación y mantención
- Ticket/OT, activo del cliente, diagnóstico, repuestos, visita en terreno, SLA, técnico y garantía.
- Agenda y ruta, evidencias, firma/aceptación y costos por visita.
- Indicadores: resolución en primera visita, SLA, costo por OT y recurrencia.

## 4. Onboarding propuesto

El onboarding debe ser una entrevista breve y progresiva, no un formulario tributario.

1. **Identidad:** nombre, comuna, número de locales y tamaño de equipo.
2. **Actividad principal:** buscador visual por lenguaje cotidiano, con 20–25 perfiles iniciales agrupados por industria. Permitir actividad secundaria y "no encuentro mi negocio".
3. **Modelo operativo:** qué vende/presta, cómo mide, cómo compra, cómo cobra y qué controla.
4. **Complejidad:** variantes, peso, lotes/vencimientos, series, fabricación, reservas, proyectos, despacho, sucursales y crédito.
5. **Activación:** resumen de la configuración que se aplicará, módulos sugeridos y datos que el usuario puede completar más tarde.

No preguntar códigos SII obligatoriamente para personalizar el producto. Ofrecerlos como dato tributario opcional y permitir varios giros. El usuario debe poder cambiar su perfil sin migrar ni perder datos.

## 5. Arquitectura de datos recomendada

### 5.1 Separación de conceptos
- Mantener `businesses.industry` como industria macro compatible con el enum existente.
- Añadir `industry_profile` como slug estable del perfil sectorial.
- Añadir `industry_config` JSONB versionado para preferencias del establecimiento, validado por Zod en backend/frontend.
- Mantener `giro` exclusivamente para la descripción tributaria declarada; no almacenar allí el perfil.
- Registrar versión del paquete aplicado para que una actualización no sobrescriba configuraciones manuales.

### 5.2 Catálogo e inventario
El modelo actual `products` posee SKU, barcode, costo, precio y stock entero, pero no expresa por sí solo una matriz de variantes, conversiones fraccionarias ni trazabilidad por lote/serie. No forzar variantes dentro del nombre o SKU.

Evolución recomendada por etapas:
1. **Product family / parent product** para el concepto comercial.
2. **Product variant** con SKU/barcode propio y atributos tipados (p. ej. diámetro, largo, talla, color, calibre).
3. **Units of measure** con unidad base y conversiones explícitas; soportar decimales para kg/metros/litros sin redondear a entero.
4. **Inventory ledger** con movimientos inmutables y stock derivado; mantener controles de concurrencia y tenant integrity ya existentes.
5. **Lots / expiry / serials** como capacidades opt-in según perfil, no campos universales obligatorios.
6. **Bundles / kits / BOM** para combos comerciales y producción.
7. **Price lists** por cliente/canal/volumen y vigencia.

No alterar el stock actual ni reescribir movimientos en el primer release de perfiles. Diseñar migraciones aditivas, backfill verificable, compatibilidad hacia atrás y pgTAP antes de cualquier despliegue.

### 5.3 Industry packs
Un paquete contiene: vocabulario, campos de onboarding, capacidades, plantillas de catálogo, unidades sugeridas, flujos, KPIs, alertas, dashboards, prompts/contexto IA y reglas de validación. Debe declarar dependencias de módulos y nivel de madurez (available, beta, planned). No mostrar una función como activa si no existe.

### 5.4 Motor de configuración
- Defaults por perfil + overrides por negocio.
- Configuración versionada y migrable.
- Feature flags por capacidad, no condicionales dispersos por toda la UI.
- Un negocio puede tener más de un perfil operativo (p. ej. ferretería que también distribuye).
- Cada módulo consume un contrato tipado, no interpreta strings arbitrarios.
- Auditoría de cambios de configuración y control de permisos.

## 6. Normativa y Chile

- El SII informa que existen 674 actividades económicas identificadas con códigos de seis dígitos; el código describe la actividad declarada, no sustituye el perfil operativo del SaaS. Fuente: https://www.sii.cl/portales/emprendedor/4puntos_claves.html
- El catálogo SII distingue explícitamente minimarkets/almacenes pequeños (472101), carnes (472102), frutas y verduras (472103), pescados (472104), entre otros. Fuente: https://www.sii.cl/normativa_legislacion/resoluciones/2018/reso56_anexo1.pdf
- El SII describe los DTE y documentos electrónicos; la integración debe distinguir emisión, recepción, notas, guías de despacho y contingencia. Fuentes: https://www.sii.cl/destacados/factura_electronica/ y https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6502.htm
- El SII indica que la boleta electrónica se aplica a ventas de productos y servicios en los casos establecidos. Fuente: https://www.sii.cl/ayudas/nuevos_contribuyentes/boleta-vys-no-facturador.html
- La Dirección del Trabajo establece el deber de controlar asistencia y jornada conforme al artículo 33 y regula los sistemas electrónicos mediante Resolución Exenta 38 de 2024. Nüva People no debe presentarse como sistema certificado de asistencia sin validación formal. Fuente: https://www.dt.gob.cl/portal/1628/w3-article-60140.html
- El ISP exige autorizaciones de instalación y funcionamiento para establecimientos farmacéuticos bajo su competencia. Un perfil de farmacia requiere una fase regulatoria específica y no debe activarse como vertical listo sin validar alcance y autorizaciones. Fuente: https://www.ispch.cl/anamed/establecimientos-farmaceuticos-y-cosmeticos/
- Los botiquines tienen un ámbito específico y no equivalen a una farmacia comercial. Fuente: https://www.ispch.cl/anamed/establecimientos-farmaceuticos-y-cosmeticos/botiquines/

**Regla:** Nüva One puede ofrecer registro, alertas, trazabilidad y documentación; no afirmar certificación, cumplimiento automático ni sustitución de asesoría profesional.

## 7. Priorización recomendada

| Ola | Perfiles | Razón |
|---|---|---|
| P0 | Ferretería/materiales; almacén/minimarket; distribuidora/mayorista | Gran mercado comercial; alto encaje con POS, inventario, compras, ventas y caja |
| P1 | Ropa/calzado; gastronomía; talleres mecánicos; servicios profesionales; construcción | Flujos diferenciadores y reutilización del core |
| P2 | Frescos/carnicería; panadería; manufactura; agricultura; transporte; arriendos | Necesitan lotes, producción, peso, flota o activos |
| P3 | Farmacia; veterinaria clínica; hotelería; educación/gimnasios; estética | Requieren profundidad sectorial, privacidad o validación regulatoria adicional |

## 8. Criterios de aceptación antes de liberar

- Perfil y configuración persistidos por negocio, no en localStorage como fuente de verdad.
- Perfil puede cambiarse y soporta actividad secundaria.
- Productos con variantes no se duplican ni mezclan stock entre SKUs.
- Unidades y conversiones no alteran costo, margen ni cantidades por redondeo.
- Lotes, vencimientos y series solo aparecen en los flujos que los requieren.
- KPIs se calculan con datos reales y cobertura completa; nunca inventar métricas.
- RLS/tenant integrity, permisos, concurrencia y auditoría validados con pgTAP.
- Onboarding usable en 320–430 px y escritorio; teclado y accesibilidad.
- No se altera producción hasta completar revisión independiente, migraciones verificadas y preview del SHA exacto.

## 9. Fuentes principales
- INE, Registro Estadístico de Unidades Económicas 2025: https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/09/28/ine-publica-por-primera-vez-resultados-del-registro-estad%C3%ADstico-de-unidades-econ%C3%B3micas-%28rue%29-se-identificaron-1.207.333-empresas-activas-en-2025-a-nivel-nacional
- SII, estadísticas de empresas: https://www.sii.cl/sobre_el_sii/estadisticas_de_empresas.html
- SUBREI, MiPymes: https://www.subrei.gob.cl/ejes-de-trabajo/home-comercio-inclusivo/pymes
- Ministerio de Economía, ELE-7: https://www.economia.gob.cl/2024/12/27/septima-encuesta-longitudinal-de-empresas-ele-7.htm
- SII, actividades económicas: https://www.sii.cl/portales/emprendedor/4puntos_claves.html
- SII, homologación CIIU4.CL: https://www.sii.cl/normativa_legislacion/resoluciones/2018/reso56_anexo1.pdf
- SII, factura electrónica: https://www.sii.cl/destacados/factura_electronica/
- DT, control de asistencia: https://www.dt.gob.cl/portal/1628/w3-article-60140.html
- ISP, establecimientos farmacéuticos: https://www.ispch.cl/anamed/establecimientos-farmaceuticos-y-cosmeticos/
