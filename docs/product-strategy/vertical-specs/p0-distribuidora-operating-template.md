# Plantilla operativa P0 — Distribuidora y mayorista

**Estado:** especificación de producto para implementación y certificación. No activa capacidades.
**Perfil estable:** `wholesale_distribution`
**Versión propuesta:** `1.0.0-draft`

## 1. Resultado operativo

Coordinar el ciclo pedido→validación→preparación→despacho→entrega→cobranza, preservando precios y condiciones pactadas, evitando sobreventa, midiendo cumplimiento y margen real por cliente/ruta solo cuando costos y eventos estén completos.

Cobertura: mayorista y distribuidora con venta recurrente B2B. No certifica por sí sola WMS avanzado, optimización de rutas, factoring, crédito regulado ni comercio exterior.

## 2. Segmentos operativos

- Distribuidora de abarrotes/bebidas: surtido y formatos; lotes/vencimientos según producto.
- Insumos industriales/construcción: atributos técnicos, unidades y despacho a obra.
- Mayorista general: volumen, listas comerciales y clientes recurrentes.

La plantilla común se mantiene; las familias de producto y opciones se limitan a configuración explícita. No crear forks por segmento.

## 3. Roles y segregación

| Rol | Responsabilidad |
|---|---|
| Dueño/administrador | políticas, clientes, límites, precios, permisos |
| Ventas B2B | clientes, cotizaciones y pedidos |
| Crédito/cobranza | evaluación, vencimientos, conciliación |
| Compras | abastecimiento y proveedores |
| Bodega | recepción, picking, packing y conteo |
| Despacho | entrega, incidencias y prueba de entrega |
| Finanzas | conciliación, margen y reportes |

Una persona puede tener varios roles solo mediante asignación explícita. La plantilla no concede acceso a datos financieros ni crédito.

## 4. Configuración estándar

Preguntas:
- ¿Vendes por unidad, pack, caja, pallet, kilo o litro?
- ¿Cada cliente tiene precios o descuentos propios?
- ¿Hay monto mínimo o múltiplos de pedido?
- ¿Otorgas crédito y límite por cliente?
- ¿Tienes bodegas o zonas de picking?
- ¿Realizas entrega propia o transportista externo?
- ¿Aceptas entregas parciales, rechazos o devoluciones?
- ¿Requieres lote, vencimiento o serie por producto?

No habilitar precio por cliente, crédito, reservas, multi-bodega, picking, packing ni rutas si el ciclo completo no está certificado.

## 5. Maestro comercial

### Cliente B2B
Identidad y datos tributarios validados según proceso real; contactos, direcciones de entrega, condición comercial, canal, estado, documentos y responsables. No asumir que todo cliente es empresa ni inventar validación SII.

### Producto y unidad logística
SKU, unidad base, empaque, factor por SKU, código proveedor, dimensiones/peso cuando estén verificados. El pallet no es unidad universal; composición puede variar por producto/proveedor.

### Precio
Lista identificada, versión, cliente/segmento, SKU, moneda, vigencia, escalas, descuentos, impuestos y autorización. El documento confirmado conserva snapshot de precio y condiciones.

### Crédito
Límite, saldo, vencimientos, días de mora, documentos, abonos y conciliación. No presentar un límite como capacidad de crédito aprobada si no existe workflow de autorización y trazabilidad.

## 6. Ciclo de pedido

Estados objetivo:
`borrador → recibido → validación comercial/stock/crédito → confirmado → preparación → despacho parcial/completo → entregado parcial/completo → conciliado/cerrado`
Estados alternativos:
`rechazado`, `cancelado`, `en espera`, `incidencia`.

Reglas:
1. Confirmar precio, descuento, unidad, dirección y fecha comprometida.
2. Verificar stock vendible con control de concurrencia; no confiar en lectura previa sin reserva transaccional.
3. Validar crédito solo si módulo de crédito está disponible; de lo contrario, no simular bloqueo crediticio.
4. La confirmación congela el snapshot comercial.
5. Reintentos y conversión de cotización/pedido deben ser idempotentes.
6. Cambios después de confirmar crean revisión o ajuste trazable.
7. Cancelación libera reserva únicamente si reserva existe y la operación es atómica.

## 7. Preparación, despacho y entrega

### Picking
- Lista por pedido y ubicación si multi-bodega está certificado.
- Escaneo/confirmación por SKU y unidad.
- Registrar sustitución solo si cliente autorizó y equivalencia está confirmada.
- Registrar faltantes y causa.

### Packing
- Verificar cantidades reales, bultos, peso/volumen si se dispone de datos confiables.
- Embalaje y sellos como datos opcionales, no obligatorios sin necesidad del sector.

### Despacho
- Transportista, costo directo, vehículo/conductor si corresponde, fecha y documentos.
- Separar despacho interno de guía tributaria.
- Despacho parcial mantiene backorder y saldo de líneas pendientes.

### Prueba de entrega
- Receptor, timestamp, evidencia permitida, cantidades entregadas, rechazo y motivo.
- Devolución o rechazo crea evento asociado al pedido/entrega original.
- No marcar entregado por el mero hecho de emitir una guía o cerrar un envío.

## 8. Compras y abastecimiento

`demanda → propuesta → revisión → orden aprobada → recepción parcial/completa → conciliación proveedor`
- Sugerir compra según demanda, lead time medido, stock disponible, pedidos comprometidos y stock seguridad explícito.
- Separar orden solicitada, confirmada, recibida y facturada.
- Comparar costo de compra y costo logístico; mantener trazabilidad.
- No automatizar envío de OC sin autorización.
- Evitar duplicidad ante reintentos.

## 9. Datos y eventos requeridos

| Objeto | Evento mínimo |
|---|---|
| Pedido | creado, validado, confirmado, modificado, cancelado |
| Línea | SKU, unidad, cantidad, precio snapshot, descuento, estado |
| Reserva | creada, consumida, liberada, expirada |
| Picking | iniciado, línea verificada, faltante, completado |
| Packing | bulto creado, verificado |
| Despacho | asignado, despachado, incidencia |
| Entrega | parcial/completa, rechazo, prueba |
| Cobranza | documento, vencimiento, abono, conciliación |
| Devolución | solicitada, inspeccionada, aprobada/rechazada, reintegro |
| Auditoría | actor, tenant, timestamp, correlación, before/after |

Los eventos son contrato objetivo; deben mapearse al esquema real antes de codificar. No duplicar eventos de pago ni inventario fuera de los servicios transaccionales existentes.

## 10. Indicadores y fórmulas

- Pedidos completos = pedidos entregados completos / pedidos entregados del período.
- Fill rate = unidades servidas / unidades pedidas, con sustitución y backorder declarados.
- OTIF = pedidos completos y a tiempo / pedidos con fecha comprometida y resultado observable.
- Exactitud de picking = líneas correctas / líneas verificadas.
- Lead time de pedido = entrega − confirmación; declarar calendario/hora y exclusiones.
- DSO = cuentas por cobrar promedio / ventas a crédito del período × días del período; solo con ledger completo.
- Antigüedad de deuda = saldo abierto por tramo de vencimiento, con pagos aplicados.
- Margen contribución por cliente = venta neta − costo mercadería − descuento − costo directo logístico asignado.
- Rentabilidad de ruta = contribución de pedidos − costo de ruta atribuible; no dividir ni comparar sin metodología de asignación.
- OTIF y fill rate no se deben calcular sobre pedidos cancelados o aún abiertos como si fueran incumplidos.

## 11. Alertas y acciones

- Pedido confirmado sin stock suficiente.
- Pedido en preparación sin movimiento durante umbral.
- Entrega comprometida próxima o vencida.
- Pedido parcial con backorder sin fecha.
- Cliente con saldo vencido (solo módulo financiero verificado).
- Margen negativo/bajo umbral con costos completos.
- Variación de costo de compra relevante.
- Rechazos/devoluciones recurrentes.
- Incidencia de entrega sin responsable.

Acciones IA: resumir cartera de pedidos, explicar atraso, preparar borrador de compra o priorizar picking. No aprobar crédito, alterar precio, confirmar pedido, emitir DTE ni ejecutar pago sin autorización y capacidad certificada.

## 12. Resumen B2B

Orden:
1. Pedidos por validar y confirmar.
2. Pedidos comprometidos hoy / atrasados.
3. Preparación y despachos pendientes.
4. Entregas parciales, rechazos e incidencias.
5. Compras y recepciones pendientes.
6. Cobranza/saldos solo con cuentas por cobrar certificadas.
7. Fill rate, OTIF y margen solo con cobertura completa.

Mostrar aging y estado operativo en lugar de tarjetas vacías. No duplicar indicadores genéricos ya existentes.

## 13. Seguridad, cumplimiento e integraciones

- Aislamiento estricto por tenant en pedidos, listas, clientes, costos, crédito y entregas.
- Precios y descuentos con RBAC y auditoría.
- DTE/guías mediante integración SII validada; documento interno no es DTE.
- Ley de datos personales, minimización y retención aplicables.
- Condiciones comerciales y crédito requieren aprobación del negocio y revisión legal/contable.
- Integración bancaria/open finance no se asume disponible por existir normativa futura.
- Integraciones deben tener idempotencia, reconciliación, observabilidad, reintentos acotados y cola de errores.

## 14. Golden Business — escenario de aceptación

**Negocio sintético:** Distribuidora Valle Centro, una bodega, 3 vendedores, 2 operarios, 80 clientes B2B, 1.200 SKU; entrega propia y externa. Datos ficticios.

Pruebas:
1. Cliente A tiene precio vigente y Cliente B otro precio: pedido toma snapshot correcto.
2. Cambiar lista luego de confirmar: no modifica pedidos confirmados.
3. Dos vendedores intentan confirmar el último stock simultáneamente: no sobreventa; resultado serializado y trazable.
4. Reintentar confirmación: no crea pedido ni descuento duplicado.
5. Pedido de 100 unidades, despacho de 70: saldo de 30 permanece pendiente.
6. Cliente rechaza 5: evento y motivo; no se marca entrega completa.
7. Sustitución no autorizada: bloquear.
8. Conversión caja/pallet sin factor SKU: bloquear.
9. Crédito solicitado sin módulo disponible: no simular evaluación ni bloqueo.
10. Conciliar abono parcial: saldo se reduce una vez.
11. Margen sin costo de transporte: mostrar parcial, no margen neto confirmado.
12. Usuario bodega intenta consultar margen global: denegar si permiso no lo permite.
13. Acceso cross-tenant a lista y pedido: denegar.
14. Despacho interno no debe presentarse como guía SII emitida.

**Certificación:** pruebas concurrentes de stock, idempotencia, integridad documental, permisos/RLS, E2E de entrega parcial y conciliación.
