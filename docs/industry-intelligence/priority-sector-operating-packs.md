# Priority vertical packs — ferretería, almacén y distribuidora

**Estado:** especificación de producto, no funcionalidades activadas.
**Objetivo:** convertir perfiles sectoriales en flujos operativos concretos y comprobables, no solo en etiquetas de onboarding.

## Principios comunes

1. Un negocio puede tener un perfil principal y hasta tres perfiles secundarios. Todos comparten la misma empresa, clientes, proveedores y contabilidad; no se crean empresas duplicadas para representar actividades mixtas.
2. Las capacidades se habilitan solo si el registro `industry-capability-readiness` las marca como `available`. Las necesidades futuras se muestran como configuración pendiente, nunca como botones que aparenten funcionar.
3. El perfil operativo no es el giro ni el código de actividad SII.
4. Las cantidades, costos, márgenes y saldos se calculan desde movimientos y documentos reales. No estimar como dato confirmado.
5. La empresa mantiene control de permisos y trazabilidad. Las preferencias de perfil no conceden permisos.

---

## Pack P0 — Ferretería, barraca y materiales

### Entrevista de configuración
- ¿Vendes por unidad, metro, kilo, m², m³, saco, caja, rollo o barra?
- ¿Qué familias manejas: fijaciones, PVC, electricidad, sanitarios, maderas, perfiles, pinturas, herramientas?
- ¿Qué atributos diferencian un SKU: diámetro, largo, espesor, sección, presión, material, acabado, color, rosca o formato?
- ¿Vendes a público general, maestros, contratistas y empresas?
- ¿Cotizas por obra y entregas en terreno? ¿Realizas cortes o preparación?
- ¿Tienes más de una bodega o punto de venta?

### Flujo objetivo
1. Crear una familia comercial, por ejemplo “Tubo PVC sanitario”.
2. Definir la variante exacta por atributos verificables: diámetro, largo, clase de presión y material.
3. Asociar SKU/código de barras, proveedor, costo de compra y unidad base.
4. Registrar recepción y diferencias contra la orden de compra.
5. Preparar cotización por partidas, cantidades y obra/cliente.
6. Validar precio, margen y disponibilidad antes de confirmar.
7. Reservar cantidades solo cuando el flujo de reservas esté implementado y probado.
8. Preparar corte/despacho con evidencia de cantidad entregada.
9. Comparar margen real y cotizado después de completar venta y costos.

### UX y vocabulario
- “Familias y medidas”, “Cotizar obra”, “Precio contratista”, “Materiales por despacho”, “Quiebre de stock”, “Equivalencias”.
- La ficha de producto debe distinguir producto base de variante; el nombre libre no puede ser la única identidad.
- En búsquedas mostrar medida y atributo crítico junto al nombre para evitar elegir un SKU similar incorrecto.
- El escáner debe resolver el código contra el SKU/variante exacta; si hay ambigüedad, pedir selección.

### Datos mínimos del futuro modelo
- Familia, variante, atributos tipados, SKU/código, unidad base, proveedor y costo vigente con vigencia.
- Conversión específica por producto cuando compra y venta usan unidades distintas.
- Cotización con partidas, cantidades/unidades, vigencia, descuentos autorizados, obra, despacho y estado.
- Ubicación física y saldo por ubicación antes de ofrecer multi-bodega.

### Indicadores y reglas
- Margen bruto por SKU/familia solo si costo de venta y líneas están completas.
- Rotación y días de inventario con ventana temporal explícita.
- Stock inmovilizado: costo real conocido × saldo válido; excluir lo no valorizable.
- Conversión cotización→venta por monto y por cantidad de cotizaciones.
- Exactitud de inventario = unidades contadas que coinciden / unidades contadas, con universo y fecha definidos.
- No recomendar sustitutos ni compatibilidad técnica sin equivalencia confirmada por el negocio o fabricante.

### Secuencia de implementación
- Fase A: perfil, vocabulario, filtros y cotizaciones actuales con capacidades ya verificadas.
- Fase B: familia/variante y atributos con compatibilidad legacy y unicidad tenant-safe.
- Fase C: unidades dimensionales y conversiones por producto; actualizar POS, compras, ventas, devoluciones, conteo y reportes en conjunto.
- Fase D: reservas, cortes, precios por cliente/volumen y multi-bodega.
- Fase E: margen por obra, sustitutos aprobados y sugerencias IA explicables.

---

## Pack P0 — Almacén, minimarket y supermercado

### Entrevista de configuración
- ¿Vendes productos por unidad, peso, pack, display o caja?
- ¿Qué categorías son perecibles y requieren lote/vencimiento?
- ¿Qué productos tienen frío, cadena de frío o retiro por vencimiento?
- ¿Compras por caja y vendes por unidad?
- ¿Cuántas cajas, sucursales y bodegas operas?
- ¿Tienes turnos, cajeros, promociones, combos o venta por delivery?
- ¿Cómo registras merma: vencimiento, daño, consumo interno, diferencia de inventario o devolución?

### Flujo objetivo
1. Importar catálogo con EAN/UPC, descripción, marca, categoría y formato.
2. Definir qué productos se venden por unidad, peso o pack.
3. Recepcionar compra y validar cantidades, lote y vencimiento cuando corresponda.
4. Reponer góndola según mínimo/máximo y rotación.
5. Vender en caja con lectura de código y precio vigente.
6. Cerrar turno y comparar efectivo/medios de pago con movimientos.
7. Registrar merma con motivo y evidencia; no convertir diferencias en ventas ficticias.
8. Priorizar salida FEFO solo para lotes con fecha válida.
9. Preparar sugerencia de compra considerando demanda, plazo proveedor, stock disponible y pedidos pendientes.

### UX y vocabulario
- “Caja rápida”, “Reposición”, “Perecibles”, “Por vencer”, “Merma”, “Cierre de turno”, “Compra sugerida”.
- En el panel principal priorizar venta del día, ticket promedio, diferencias de caja, quiebres y productos por vencer.
- Los filtros deben distinguir categoría, proveedor, sucursal y estado de vencimiento.
- En móvil, acciones rápidas de conteo y recepción con botones grandes y confirmación de cantidad.

### Datos mínimos del futuro modelo
- Producto/formato, unidad base y factores de pack específicos por SKU.
- Lote, fecha de recepción, vencimiento, proveedor y saldo por lote.
- Motivo de merma y movimiento trazable.
- Turno/cajero, apertura, movimientos, medios de pago, cierre y diferencia.
- Sucursal y ubicación cuando exista operación multi-local.

### Indicadores y reglas
- Ticket promedio = ventas netas del período / transacciones válidas; excluir anulaciones.
- Venta por hora = ventas netas por hora local y zona horaria del negocio.
- Merma % = costo de merma / costo de mercadería recibida o vendida, declarar denominador.
- Quiebres: producto activo sin disponibilidad vendible; distinguir falta de datos y stock reservado.
- Vencimientos: alertar según días restantes configurados por categoría; no inferir vencimiento ausente.
- Reposición sugerida = demanda diaria estimada × lead time + stock de seguridad − stock disponible − entradas confirmadas; mostrar supuestos y permitir revisión.

### Secuencia de implementación
- Fase A: catálogo, barcode, caja, historial de clientes y despacho actual; KPIs existentes sin inventar merma/vencimiento.
- Fase B: unidades/pack y recepción con trazabilidad.
- Fase C: lotes, vencimientos, FEFO, mermas y retiros.
- Fase D: mínimos/máximos, sugerencia de compra, promociones y sucursales.
- Fase E: previsión por estacionalidad y alertas explicables, siempre con aprobación del encargado.

---

## Pack P0 — Distribuidora y mayorista

### Entrevista de configuración
- ¿Vendes por unidad, pack, caja, pallet, kilo o litro?
- ¿Qué clientes tienen lista de precio, descuento, crédito o mínimo de compra?
- ¿Cuántas bodegas y zonas de picking manejas?
- ¿Preparas pedidos, rutas propias o despacho tercerizado?
- ¿Necesitas lotes/vencimientos o trazabilidad por serie?
- ¿Cómo controlas entregas parciales, rechazos, devoluciones y diferencias?

### Flujo objetivo
1. Registrar cliente, condición comercial, dirección y ventana de entrega.
2. Preparar catálogo y lista de precios vigente por cliente.
3. Recibir pedido y validar stock vendible, crédito y mínimos.
4. Confirmar pedido con precio y condiciones congeladas en el documento.
5. Preparar picking por ubicación y unidad logística.
6. Verificar packing y despacho con cantidades efectivas.
7. Registrar entrega completa/parcial, rechazo o devolución.
8. Conciliar venta, costo de despacho, cobro y saldo por cliente.
9. Medir margen neto después de descuentos, preparación y transporte.

### UX y vocabulario
- “Pedidos mayoristas”, “Lista por cliente”, “Picking”, “Packing”, “Rutas”, “Entrega parcial”, “Saldo por cobrar”.
- Mostrar el estado del pedido de punta a punta: recibido → validado → preparado → despachado → entregado → conciliado.
- No permitir que un cambio de lista de precios altere documentos ya confirmados.
- Separar stock físico, reservado, bloqueado y en tránsito; nunca sumar dos veces el mismo saldo.

### Datos mínimos del futuro modelo
- Lista de precios versionada, reglas de descuento y vigencia por cliente.
- Unidad logística y conversiones por producto.
- Pedido, partidas, reserva, picking, packing, despacho, prueba de entrega y devoluciones.
- Dirección, ruta, transportista, costo de despacho y eventos de entrega.
- Crédito, límite, vencimientos y conciliación de cobranza, con permisos financieros.

### Indicadores y reglas
- Fill rate = unidades servidas / unidades pedidas, con política explícita para sustituciones.
- OTIF = pedidos entregados completos y a tiempo / pedidos con fecha comprometida.
- DSO = cuentas por cobrar promedio / ventas a crédito del período × días del período; no estimar si falta saldo o ventas a crédito completas.
- Margen por despacho = venta neta − costo mercadería − descuentos − costo directo de despacho; solo si todos los componentes están disponibles.
- Exactitud de picking = líneas correctas / líneas verificadas.
- Rentabilidad por cliente/ruta con asignación de costos y período trazable.

### Secuencia de implementación
- Fase A: cotizaciones, clientes, despachos y caja actuales.
- Fase B: pedido mayorista, listas de precio versionadas y crédito.
- Fase C: bodegas, reservas, picking/packing y entrega parcial.
- Fase D: unidades logísticas y lotes/series según industria.
- Fase E: optimización de rutas, predicción de demanda y margen neto por cliente.

---

## Experiencia transversal en Resumen

El perfil debe reorganizar el Resumen por prioridad de decisión, no duplicar tarjetas genéricas.

- **Ferretería:** cotizaciones por vencer, quiebres de familias críticas, compras pendientes, margen verificable por familia y despachos por obra.
- **Almacén:** ventas/ticket del día, diferencias de caja, quiebres, recepción pendiente y vencimientos cuando lotes estén disponibles.
- **Distribuidora:** pedidos pendientes, fill rate, entregas comprometidas, saldo de clientes cuando el módulo de crédito esté disponible y margen neto solo con costos completos.

Cada tarjeta debe mostrar período, fuente, hora de actualización, estado de cobertura y acción siguiente. Si una capacidad no existe, el Resumen no debe mostrar una tarjeta vacía ni simular datos: debe omitirla o presentarla como “configuración pendiente” sin atribuirle un KPI.


---

## Segunda ola — perfiles operativos de alto potencial

Estos cuatro packs amplían el diseño sectorial. Son especificaciones de producto y no activan capacidades que el registro de madurez marque como planificadas.

## Pack P1 — Ropa, calzado y accesorios

### Configuración y catálogo
- ¿Qué categorías, marcas, temporadas y colecciones manejas?
- ¿Cada modelo tiene combinaciones de talla, color, material y género?
- ¿Usas SKU propio, EAN por variante o ambos?
- ¿Vendes en tienda, ecommerce, redes sociales o varios canales?
- ¿Qué política de cambio, devolución y garantía aplicas?

### Flujo operativo
1. Crear un modelo padre y sus variantes; cada combinación vendible debe tener SKU/código único.
2. Registrar recepción por variante y temporada; impedir que una talla/color se consolide como un único saldo.
3. Consultar curva de tallas, disponibilidad por local y productos sin rotación.
4. Registrar venta y canal; asociar cambio/devolución al documento original.
5. Medir sell-through, margen y markdown por colección al cierre de temporada.

### Datos y reglas
- Modelo, variante tipada (talla/color), SKU, código de barras, temporada, marca y costo vigente.
- Devoluciones con motivo, estado de inspección y reintegro de stock solo después de aprobar condición.
- No inferir equivalencia de tallas entre marcas ni disponibilidad de una variante desde el stock agregado del modelo.

### KPIs de Resumen
- Sell-through = unidades vendidas / unidades recibidas de la colección.
- Curva rota: variantes con tallas críticas agotadas frente a la curva objetivo definida por el negocio.
- Rotación por talla/color, margen por colección y stock de temporadas anteriores.
- Los indicadores de variante quedan pendientes hasta que exista el modelo de SKU variante.

## Pack P1 — Taller mecánico y repuestos

### Configuración y contexto
- ¿Atiendes vehículos livianos, pesados, motos, maquinaria o flotas?
- ¿Necesitas patente, VIN/chasis, marca, modelo, año y kilometraje?
- ¿Cotizas repuestos y mano de obra en una misma orden?
- ¿Controlas agenda, diagnóstico, autorización del cliente y garantía del trabajo?

### Flujo operativo
1. Registrar cliente y vehículo como activos relacionados; validar patente/VIN para evitar duplicados.
2. Abrir solicitud de servicio y registrar síntoma/diagnóstico sin convertirlo automáticamente en diagnóstico técnico confirmado.
3. Preparar cotización con repuestos, horas, servicios externos y vigencia.
4. Registrar autorización del cliente antes de ejecutar trabajos adicionales.
5. Descontar repuestos desde la orden al completar el trabajo; registrar técnico, tiempos y evidencias.
6. Entregar vehículo, registrar garantía y seguimiento; asociar retrabajos a la orden original.

### Datos y reglas
- Vehículo, historial de kilometraje con fecha, orden de trabajo, tareas, repuestos, mano de obra, autorización y entrega.
- Una cotización no reserva repuestos hasta que exista un flujo de reserva transaccional.
- No mostrar margen por orden si faltan costos de repuestos, horas o servicios externos.

### KPIs de Resumen
- Órdenes abiertas por etapa, tiempo de ciclo y trabajos esperando autorización.
- Horas vendidas vs. horas registradas; retrabajos y garantías abiertas.
- Margen por orden solo con costo completo de repuestos y mano de obra.

## Pack P1 — Restaurante, cafetería y food service

### Configuración y contexto
- ¿Atiendes en salón, retiro, delivery, eventos o food truck?
- ¿Tienes carta, menú diario, combos o productos personalizables?
- ¿Controlas ingredientes por receta, producción diaria y mermas?
- ¿Necesitas mesas, comandas, reservas, turnos y propinas?

### Flujo operativo
1. Configurar carta, modificadores y canales de venta.
2. Definir receta versionada, unidad de compra, unidad de consumo y rendimiento real.
3. Registrar recepción de ingredientes y lotes/vencimientos cuando la trazabilidad esté habilitada.
4. Capturar comanda y tiempos por etapa; separar anulaciones, cortesías y devoluciones.
5. Cerrar turno conciliando ventas, medios de pago, propinas y caja.
6. Comparar costo teórico de receta con consumo real únicamente cuando inventario y recetas estén integrados.

### Datos y reglas
- Receta con versión, ingredientes, rendimientos, mermas, modificadores, canal y estación.
- Diferenciar costo teórico de costo real; no llamar food cost real a una estimación de receta.
- No descontar ingredientes ni gestionar mesas/comandas hasta implementar y probar el flujo completo.

### KPIs de Resumen
- Ventas por canal y franja, ticket promedio, anulaciones y tiempo de preparación si hay timestamps válidos.
- Food cost teórico claramente identificado; costo real y merma solo tras trazabilidad de consumo.
- Reservas y ocupación únicamente con calendario y capacidad implementados.

## Pack P1 — Servicios profesionales y agencias B2B

### Configuración y contexto
- ¿Cobras por hora, proyecto, bolsa de horas, entregable o mensualidad?
- ¿Trabajas con contratos, renovaciones, hitos y aprobaciones?
- ¿Necesitas asignar consultores, colaboradores y proveedores a cada cliente?
- ¿Registras horas, gastos reembolsables y entregables?

### Flujo operativo
1. Calificar oportunidad y registrar alcance, decisores y próxima acción.
2. Crear propuesta con alcance, exclusiones, precio, hitos y vigencia.
3. Convertir propuesta aceptada en proyecto con presupuesto y responsables.
4. Registrar horas y gastos contra proyecto con aprobación.
5. Emitir hitos/facturación según condiciones pactadas y controlar cobranza.
6. Cerrar proyecto comparando presupuesto, horas, gastos, ingreso y margen real.

### Datos y reglas
- Proyecto, contrato, versión de propuesta, hito, entregable, asignación, timesheet y gasto.
- Separar horas planificadas, registradas y facturables; no asumir que toda hora registrada se factura.
- Restringir tarifas internas, costos salariales y márgenes según permisos financieros.

### KPIs de Resumen
- Pipeline ponderado solo si existen etapas y probabilidades configuradas.
- Utilización = horas facturables / capacidad disponible; requiere calendarios y carga de trabajo fiables.
- Margen por proyecto, desviación de horas, hitos atrasados y DSO solo con datos financieros completos.

---

## Priorización de implementación por valor y dependencias

| Ola | Perfil | Primer resultado de producto | Dependencia crítica |
|---|---|---|---|
| P0 | Ferretería | Catálogo técnico y cotización por obra | Variantes y unidades |
| P0 | Almacén/minimarket | Recepción, caja y control de perecibles | Lotes, vencimientos y fracciones |
| P0 | Distribuidora | Pedido mayorista y despacho | Listas de precios, bodegas y picking |
| P1 | Ropa/calzado | Curva de variantes y sell-through | SKU por variante y devoluciones |
| P1 | Taller mecánico | Orden de trabajo y autorización | Vehículos, mano de obra y repuestos |
| P1 | Restaurante | Recetas, comandas y food cost | BOM, consumo y caja por canal |
| P1 | Servicios B2B | Propuesta→proyecto→hitos | Proyectos, horas y gastos |

No desplegar un pack P1 como módulo terminado hasta cerrar sus dependencias. El primer lanzamiento sectorial debe adaptar onboarding, vocabulario, filtros y Resumen usando capacidades existentes; las dependencias de datos se construyen como proyectos separados con pruebas de integridad y permisos.
