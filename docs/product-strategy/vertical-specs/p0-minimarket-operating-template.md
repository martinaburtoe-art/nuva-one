# Plantilla operativa P0 — Minimarket, almacén y supermercado de proximidad

**Estado:** especificación de producto para implementación y certificación. No activa capacidades ni reemplaza validación tributaria/sanitaria.
**Perfil estable:** `neighborhood_grocery`
**Versión propuesta:** `1.0.0-draft`
**Principio:** todos los negocios clasificados en este perfil parten de la misma plantilla; solo cambian opciones explícitas admitidas.

## 1. Resultado que debe conseguir el negocio

El encargado debe poder responder, sin reconstruir planillas:
1. ¿Cuánto vendimos hoy y por qué canal/caja?
2. ¿Qué productos se están agotando y cuáles no se pueden vender?
3. ¿Qué compras debo recibir, revisar o preparar?
4. ¿Qué productos están por vencer, vencidos o con merma registrada?
5. ¿Cuánto efectivo y medios de pago deberían cuadrar al cierre?
6. ¿Qué productos, categorías y proveedores explican margen y rotación, con costos confiables?

La plantilla no promete resolver preguntas para las que falten datos o capacidades. Debe mostrar cobertura y origen de cada cifra.

## 2. Tipos de establecimiento cubiertos

Incluye almacén de barrio, minimarket, minimercado y supermercado de proximidad con surtido general. No certifica por sí sola botillería especializada, carnicería, pescadería, verdulería de alto peso variable, farmacia ni cadena de supermercados con operación centralizada; esos perfiles requieren reglas adicionales.

## 3. Roles operativos y segregación

| Rol | Puede hacer | No debe obtener automáticamente |
|---|---|---|
| Dueño/administrador | Configurar catálogo, precios, proveedores, permisos y revisar resultados | Acceso a otras empresas/tenants |
| Encargado de local | Recepción, reposición, conteos, mermas y revisión de alertas | Cambiar auditoría o borrar movimientos |
| Cajero | Vender, consultar precio y ejecutar operaciones de caja permitidas | Cambiar costo, margen, permisos o cierres aprobados |
| Comprador | Preparar órdenes y revisar proveedores | Aprobar su propia excepción financiera si existe segregación |
| Contador/finanzas | Revisar cierres, documentos y conciliación según permiso | Modificar stock sin movimiento trazable |

Los roles son una matriz objetivo. Deben mapearse a permisos existentes; no se crean privilegios por seleccionar el perfil.

## 4. Configuración estándar y opciones permitidas

### Siempre presente en la experiencia
- Catálogo por producto, categoría, marca y proveedor.
- Identificador SKU/código de barras cuando exista.
- Precio de venta, costo con fuente/fecha y estado de disponibilidad.
- Venta, historial del cliente cuando corresponda, caja y movimientos.
- Recepción de compra y registro de diferencias cuando el flujo actual lo soporte.
- Reportes de venta y actividad disponibles en el producto.

### Preguntas de clasificación (respuesta sí/no/no sé)
- ¿Vendes productos pesables?
- ¿Compras cajas o packs y vendes unidades?
- ¿Manejas perecibles con fecha de vencimiento?
- ¿Tienes más de una caja o sucursal?
- ¿Realizas delivery propio o por tercero?
- ¿Usas promociones o combos?
- ¿Tienes turnos con cajeros distintos?

`No sé` significa dato no configurado; nunca equivale a `sí`. La selección no habilita automáticamente funciones planificadas.

### Opciones condicionadas
- Lotes/vencimientos/FEFO: requiere modelo de lote, recepción, saldo por lote, salida, devolución y auditoría end-to-end.
- Venta por peso/fracción: requiere cantidades decimales compatibles en catálogo, POS, movimiento, devolución, cierre y reportes.
- Pack/caja/unidad: requiere conversión específica por SKU, no un factor global asumido.
- Multi-sucursal/bodega: requiere propiedad del saldo, transferencias y conciliación por ubicación.
- Delivery: despacho persistido no equivale a agenda, capacidad, optimización de rutas ni prueba de entrega.
- Promociones/combos: requiere motor de precio, vigencia, reglas de acumulación y reversas.

## 5. Modelo maestro de datos objetivo

| Entidad | Campos mínimos | Regla |
|---|---|---|
| Producto | tenant, SKU, nombre, categoría, marca, estado, código | SKU único dentro del tenant; código puede tener alias controlados |
| Formato | producto, unidad base, unidad de compra/venta, factor | Factor explícito por producto y vigencia; no inferir por texto “caja” |
| Precio | producto, valor, moneda, vigencia, canal | Precio histórico de documentos no se recalcula al cambiar lista |
| Costo | producto, método/fuente, valor, vigencia, documento | Mostrar “sin costo confiable” cuando falte dato |
| Proveedor | identidad, contacto, condiciones y estado | Aislamiento por tenant y auditoría |
| Recepción | orden/documento, producto, cantidad, diferencia, responsable | No duplicar recepción ante reintento |
| Lote | producto, lote proveedor, recepción, vencimiento, saldo | Solo para SKU que requieran trazabilidad |
| Merma | producto/lote, cantidad, motivo, costo, responsable, evidencia | Movimiento explícito; nunca registrar como venta |
| Turno de caja | caja, usuario, apertura, movimientos, medios, cierre | Cierre inmutable o con ajuste auditado |
| Promoción | productos, regla, período, canal, prioridad | No activar hasta contar con reglas de conflicto y reversa |

No se debe desplegar un modelo nuevo sin revisar compatibilidad con el esquema real y estrategia de backfill. La tabla es contrato conceptual, no una instrucción de migración.

## 6. Flujos y estados

### 6.1 Catálogo y alta de producto
`borrador → validado → activo → pausado/retirado`
- Validar SKU/código duplicado en el tenant.
- Unidad base obligatoria antes de movimientos.
- Código ambiguo debe pedir selección; nunca resolver al primer resultado.
- Producto sin costo conocido puede venderse solo según política comercial, pero se excluye de margen confirmado.

### 6.2 Compra y recepción
`borrador → solicitada → confirmada → recepción parcial/completa → conciliada/cerrada`
- Registrar cantidad pedida, recibida y diferencia.
- Recepción parcial no cierra lo pendiente.
- Reintentos deben ser idempotentes.
- Factura/documento del proveedor no debe confundirse con pago.
- El costo debe conservar referencia documental y vigencia.

### 6.3 Venta y caja
`carrito → validación → confirmada → pagada/pendiente según flujo soportado → reversada mediante documento`
- Verificar precio vigente, disponibilidad y estado del producto.
- Una anulación/reversa no borra el evento original.
- No asumir que una venta genera automáticamente DTE válido sin evidencia de integración.
- Caja separa efectivo, tarjeta, transferencia y otros medios configurados.
- El cierre compara esperado versus contado por medio; diferencia requiere motivo y responsable.

### 6.4 Reposición
- Priorizar quiebre real, demanda histórica válida y lead time confirmado.
- Recomendación de compra debe exponer fórmula, período, fuente y supuestos.
- Excluir stock reservado/bloqueado si esos estados existen; si no existen, declarar limitación.
- Nunca enviar orden al proveedor sin aprobación humana.

### 6.5 Merma y perecibles
Motivos controlados: vencimiento, daño, pérdida, consumo interno, retiro sanitario, diferencia de conteo y otro con detalle.
- Cada ajuste crea movimiento con usuario, hora, motivo y evidencia opcional.
- FEFO solo si hay lotes y vencimientos completos.
- Producto vencido no debe aparecer como vendible si la regla sanitaria/operativa configurada lo impide.
- Retiro/recall debe identificar lotes afectados, ventas/clientes cuando el dato y la base legal lo permitan.

### 6.6 Devoluciones
- Asociar al documento original cuando exista.
- Registrar condición: sellado, abierto, dañado, perecible/no revendible.
- Reingresar a stock solo después de inspección autorizada.
- Reembolso y ajuste de inventario deben ser operaciones coordinadas e idempotentes.

## 7. Indicadores y contratos de cálculo

| KPI | Fórmula | Requisitos y exclusiones |
|---|---|---|
| Venta neta | ventas válidas − descuentos − devoluciones contabilizadas | Período, zona horaria, moneda y estados definidos |
| Ticket promedio | venta neta / transacciones válidas | Excluir anuladas; no dividir si denominador cero |
| Unidades por ticket | unidades netas / transacciones válidas | Definir tratamiento de fracciones |
| Venta por hora | venta neta agrupada por hora local | Zona horaria del negocio y hora de confirmación |
| Margen bruto | venta neta − costo de venta | Solo costo trazable; si falta costo, cobertura parcial |
| Merma % | costo de merma / denominador declarado | No mezclar costo con unidades; indicar base (recibido o vendido) |
| Quiebre | SKU activo con demanda/stock no vendible | Diferenciar stock cero, dato ausente y stock bloqueado |
| Rotación | costo de venta / inventario promedio valorizado | Mismo método de costo y período |
| Diferencia de caja | contado − saldo esperado por medio | Cierre y movimientos completos |
| Vencimiento próximo | lotes con fecha dentro de umbral | Solo lotes válidos; no inferir fecha faltante |

Cada tarjeta debe mostrar período, última actualización, fuente, cobertura, unidad, estado `confirmado/parcial/no disponible` y acción siguiente. No mostrar cero cuando el dato está ausente.

## 8. Alertas priorizadas

1. Crítica: cierre de caja con diferencia no explicada; lote vencido disponible para venta; recepción con duplicidad detectada.
2. Alta: quiebre de producto activo; compra confirmada no recibida; diferencia de recepción sobre umbral.
3. Media: vencimiento próximo; stock bajo mínimo; merma recurrente.
4. Informativa: cambio de costo, precio o proveedor.

Las alertas deben tener propietario, fecha, evidencia, estado, deduplicación y mecanismo de resolución. IA puede explicar y proponer; no alterar stock/precio ni emitir pagos por sí sola.

## 9. Resumen y experiencia móvil

Orden recomendado:
1. Venta neta de hoy y transacciones.
2. Estado de caja/turnos.
3. Quiebres prioritarios.
4. Recepciones pendientes.
5. Perecibles/merma solo si el módulo está certificado.
6. Compra sugerida solo con datos y algoritmo validados.

En móvil: escaneo, recepción, conteo y consulta rápida; botones de acción grandes, confirmación explícita, manejo de mala conectividad y prevención de doble envío. Offline transaccional no se promete sin estrategia de conflictos y sincronización probada.

## 10. Cumplimiento y límites

- El perfil no define giro, IVA, régimen tributario, permisos municipales ni autorización sanitaria.
- Para alimentos, el negocio debe validar obligaciones sanitarias aplicables a su actividad y local; la plataforma puede registrar evidencia/documentos, no declarar cumplimiento automático.
- DTE/guía de despacho depende de integración y requisitos SII; no inferir emisión desde una venta interna.
- Garantías, cambios y retracto deben configurarse conforme a normativa y tipo de operación; no fijar una política universal por plantilla.
- Datos personales de clientes deben minimizarse, protegerse y tener propósito/retención/consentimiento o base jurídica correspondiente.

## 11. Migración y adopción

1. Importar catálogo a staging y entregar reporte de duplicados/unidades/códigos.
2. Mapear unidades existentes sin cambiar saldos automáticamente.
3. Conciliar inventario inicial con conteo firmado.
4. Importar proveedores y costos con fecha/fuente.
5. Simular venta, reversa, recepción, devolución y cierre en entorno de prueba.
6. Habilitar por tenant con rollback de configuración, no borrado de datos.
7. Capacitar roles y ejecutar cierre acompañado.

## 12. Golden Business — escenario de aceptación

**Negocio sintético:** Almacén La Esquina, un local, dos cajas, 2 cajeros, un encargado, venta mostrador y delivery externo; 600 SKU, de los cuales 40 perecibles. Datos ficticios.

Casos obligatorios:
- Importar dos códigos duplicados y verificar que el sistema los reporte sin fusionarlos.
- Vender un producto con costo ausente: venta válida según política, margen marcado no disponible.
- Recepcionar 10 cajas de un SKU y vender unidades: bloquear conversión si no existe factor por producto.
- Recibir 8 de 10 unidades: mantener 2 pendientes.
- Reintentar la misma recepción: no duplicar stock.
- Registrar merma por daño: movimiento separado de venta.
- Cerrar caja con diferencia: preservar esperado, contado, diferencia y motivo.
- Revertir venta: conservar trazabilidad y corregir saldos una sola vez.
- Producto con lote vencido: no sugerirlo como vendible cuando trazabilidad y regla estén activas.
- Usuario cajero intenta cambiar costo o permisos: denegar y auditar.
- Usuario de otro tenant intenta leer producto: denegar.
- Resumen sin lotes: omitir KPI de vencimientos, no mostrar cero.

**Criterio de certificación:** todos los casos críticos pasan en pruebas automatizadas y E2E; la evidencia debe incluir IDs de prueba, consultas de estado y capturas de interfaz. Ninguna capacidad planificada se marca disponible por esta especificación.
