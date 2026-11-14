# Plantilla operativa P0 — Ferretería, barraca y materiales

**Estado:** especificación de producto para implementación y certificación. No activa capacidades.
**Perfil estable:** `hardware_store`
**Versión propuesta:** `1.0.0-draft`

## 1. Resultado operativo

Controlar un catálogo técnicamente diferenciado, comprar y vender con unidades correctas, cotizar materiales por obra, evitar errores de SKU similares, despachar cantidades verificables y conocer margen solo cuando el costo real está respaldado.

Cobertura: ferretería general, barraca y comercio de materiales. No certifica ingeniería, cálculo estructural, compatibilidad normativa ni recomendación técnica autónoma.

## 2. Taxonomía de catálogo

Jerarquía objetivo:
`familia → producto base → variante comercial → SKU`

Ejemplos:
- Tubo PVC: diámetro, largo, material, clase/presión, uso declarado por fabricante.
- Perno: diámetro, largo, paso/hilo, material, terminación.
- Cable: sección, conductor, aislación, color, metraje.
- Plancha: material, espesor, ancho, largo y acabado.
- Pintura: línea, color/código, acabado, volumen y base.
- Herramienta: marca, modelo, potencia/capacidad, accesorio incluido y serie si corresponde.

Atributos deben ser tipados, normalizados por familia y con unidades explícitas. No usar solo descripción libre como identidad. No inferir compatibilidad, equivalencia, resistencia, presión admisible ni cumplimiento de norma.

## 3. Roles

- Dueño/administrador: catálogo, reglas comerciales, permisos, aprobación de descuentos.
- Vendedor: consulta técnica declarada, cotización, venta; no modifica costo ni atributos críticos aprobados.
- Bodeguero: recepción, ubicación, picking, conteo y entrega.
- Comprador: proveedor, costo y orden; segregación de aprobación según política.
- Finanzas: margen, cuentas y conciliación según permisos.

Los permisos reales deben mapearse al RBAC existente. El perfil no otorga acceso adicional.

## 4. Configuración estándar

Preguntas:
- ¿Qué familias de materiales vendes?
- ¿Compras y vendes en unidades distintas?
- ¿Vendes por metro, m², m³ o peso?
- ¿Cotizas por obra o cliente contratista?
- ¿Realizas cortes o preparación?
- ¿Tienes más de una bodega?
- ¿Despachas a terreno?

La respuesta afirmativa a unidad distinta exige factor por SKU y pruebas end-to-end. “Corte”, “reserva”, “multi-bodega”, “lista contratista” y “despacho programado” son capacidades separadas; no se infieren desde una respuesta.

## 5. Flujo de compra y recepción

`requerimiento → cotización proveedor → orden aprobada → recepción parcial/completa → conciliación`
- Comparar SKU/atributos y unidad de compra.
- Registrar cantidad pedida, recibida, rechazada y pendiente.
- Capturar lote/serie cuando el producto y módulo lo requieran.
- Costo debe distinguir neto/bruto, flete y descuentos según política contable configurada.
- No duplicar recepción por reintento.
- Diferencias requieren motivo, evidencia y aprobación según umbral.

## 6. Cotización por obra

`borrador → revisión técnica/comercial → enviada → aceptada/rechazada/vencida → convertida`
- Cabecera: cliente, obra, contacto, dirección, fecha, vigencia, moneda, responsable, condición de entrega.
- Partidas: SKU exacto, atributos visibles, cantidad, unidad, precio, descuento autorizado, impuestos según motor tributario, notas.
- Congelar descripción, atributos, precio y condiciones en el documento emitido.
- Cambios posteriores generan nueva versión; no alteran cotización histórica.
- Advertir disponibilidad basada en timestamp y fuente; no reservar si no existe motor de reservas certificado.
- Descuento bajo margen o sobre umbral requiere aprobación.
- Conversión cotización→venta debe ser idempotente y conservar vínculo documental.

## 7. Unidades y conversiones — control P0 crítico

Unidades posibles: unidad, metro, m², m³, kg, saco, caja, rollo, barra, pallet. La lista no implica que todas estén soportadas.

Reglas:
1. Cada SKU tiene una unidad base.
2. Conversión solo entre dimensiones compatibles y/o formatos empaquetados con factor explícito.
3. Factor se define por SKU, proveedor/formato cuando corresponda y vigencia.
4. No asumir que una caja contiene 10, 12 o 100 unidades.
5. No mezclar metro lineal, área y volumen sin dimensiones verificadas.
6. Redondeo debe declarar precisión, regla y momento.
7. POS, compras, recepción, despacho, devolución, conteo y reportes deben compartir el mismo ledger de conversión.
8. Si una etapa no soporta decimales o conversión, bloquear el flujo o solicitar unidad base; no aproximar silenciosamente.

## 8. Despacho, corte y entrega

Estados objetivo:
`pendiente → picking → verificado → despachado → entregado parcial/completo → conciliado`
- Picking identifica ubicación y SKU exacto.
- Doble verificación para materiales de riesgo de confusión (diámetro, largo, espesor, color, presión).
- Corte/preparación registra cantidad original, cantidad consumida, merma y remanente; solo habilitar con modelo de transformación probado.
- Entrega registra cantidades efectivas, receptor, fecha y diferencias.
- Guía de despacho tributaria no es equivalente a una orden interna de despacho.
- No prometer rutas, agenda ni capacidad logística por el solo hecho de existir un módulo de shipments.

## 9. Datos maestros

| Entidad | Datos mínimos |
|---|---|
| Familia | tenant, código, nombre, atributos aplicables |
| Producto base | fabricante/marca, línea, descripción, ficha fuente |
| Variante/SKU | atributos tipados, unidad base, código, estado |
| Unidad/conversión | dimensión, factor exacto, SKU, vigencia, aprobador |
| Proveedor | identidad, SKU proveedor, formato y condición |
| Costo | costo de adquisición, documento, flete asignado, vigencia |
| Cotización | versión, obra, partidas congeladas, vigencia, estado |
| Despacho | líneas, cantidades, responsable, evidencia de entrega |
| Sustituto | equivalencia confirmada, fuente fabricante, aprobación |

No se debe activar SKU variante ni conversión hasta que exista esquema tenant-safe, migración reversible y compatibilidad con datos heredados.

## 10. KPIs y fórmulas

- Margen bruto SKU/familia = venta neta − costo de venta; dividir por venta neta para porcentaje solo con denominador distinto de cero.
- Rotación = costo de venta / inventario promedio valorizado en período.
- Días de inventario = inventario promedio / costo de venta diario; declarar ventana y no calcular con ventas cero.
- Stock inmovilizado = saldo válido × costo conocido; excluir lo no valorizable.
- Conversión de cotización = cotizaciones convertidas / cotizaciones válidas emitidas; mostrar por conteo y monto.
- Fill rate = unidades servidas / unidades pedidas, con regla de sustitución explícita.
- Exactitud de picking = líneas correctas / líneas verificadas.
- Rentabilidad por obra = venta neta − costo de materiales − costos directos atribuibles; no usar margen estimado como margen real.

Cada KPI declara moneda, período, cobertura, fuente, timestamp y calidad de costo.

## 11. Alertas

- SKU parecido con atributos críticos distintos en carrito/picking.
- Cotización próxima a vencer.
- Cotización aceptada sin disponibilidad validada.
- Compra con diferencia de recepción.
- Costo de reposición superior al precio vigente o margen bajo umbral.
- Material sin equivalencia técnica confirmada.
- Stock bajo mínimo configurado.
- Despacho parcial o diferencia de entrega sin resolver.

IA puede extraer partidas desde texto/documentos y preparar borradores; toda cantidad, unidad, atributo técnico, sustituto, precio y envío requiere validación humana.

## 12. Experiencia Resumen

Orden:
1. Cotizaciones abiertas/por vencer.
2. Compras y recepciones pendientes.
3. Quiebres de familias críticas.
4. Despachos pendientes y diferencias.
5. Margen por familia/obra únicamente con costo completo.
6. Rotación y stock inmovilizado con valorización fiable.

Evitar tarjetas duplicadas con Resumen genérico. El panel sectorial reorganiza fuentes existentes; no crea métricas ficticias.

## 13. Cumplimiento y riesgos

- El perfil no decide giro SII, IVA, permisos, normas técnicas ni certificaciones de materiales.
- DTE/guía de despacho debe seguir el flujo SII aplicable y una integración real.
- Las fichas técnicas y equivalencias deben referenciar fabricante/proveedor y fecha.
- No emitir recomendaciones de ingeniería ni declarar que un material es apto para un uso estructural sin validación profesional.
- Proteger precios de costo, márgenes, descuentos y datos de clientes mediante permisos.

## 14. Golden Business — escenario de aceptación

**Negocio sintético:** Ferretería El Constructor, una tienda y una bodega; 2.500 SKU, venta mostrador y cotizaciones a contratistas. Datos ficticios.

Pruebas:
1. Crear dos tubos PVC con diámetro distinto: búsqueda y scanner deben distinguirlos.
2. Código de barras duplicado: impedir asignación ambigua.
3. Registrar caja de pernos sin factor: no permitir vender unidades derivadas.
4. Registrar rollo de cable con factor validado: verificar compra, venta, devolución y saldo con precisión.
5. Cotización con 12 partidas: preservar unidad, atributo, precio y versión emitida.
6. Cambiar lista/precio después de emitir: no alterar documento histórico.
7. Descuento bajo margen: requerir aprobación si la política está configurada.
8. Cotización aceptada sin stock: no fingir reserva.
9. Picking de SKU similar: validar atributos críticos.
10. Despacho parcial: mantener saldo pendiente y evidencia de entrega.
11. Sustituto no confirmado: no sugerir equivalencia.
12. Intento de lectura cross-tenant: denegar.
13. Usuario vendedor intenta editar costo: denegar y auditar.
14. KPI de margen sin costo completo: estado parcial/no disponible.

**Certificación:** pruebas unitarias, integración, RLS/tenant isolation y E2E; conciliación de saldos antes/después; revisión independiente de conversión y cotización.
