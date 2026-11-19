# Nüva One — Cotizaciones profesionales: investigación de mercado y especificación funcional

**Estado:** especificación de producto/ingeniería basada en auditoría del código y fuentes públicas revisadas el 14-11-2026.  
**Alcance:** evolución del módulo existente `src/routes/_authenticated/quotes.tsx` y `src/lib/quote-pdf.ts`. No crear un segundo módulo de cotizaciones ni declarar este documento como implementación terminada.

## 1. Objetivo de producto

Convertir Cotizaciones en una experiencia comercial de nivel SaaS profesional: captura de datos estructurada, editor guiado, previsualización fiel al PDF, identidad visual por empresa, cálculos verificables, documento descargable/compartible y trazabilidad del ciclo de aceptación.

La cotización es una oferta comercial documentada. No es una factura, boleta ni DTE. No debe generar por sí sola ingresos reconocidos, asientos contables, cobros ni movimientos de inventario.

## 2. Investigación de mercado: patrones que conviene adoptar

La revisión de documentación pública de Xero, QuickBooks, Zoho Invoice, PandaDoc e InvoiceFly permite identificar patrones convergentes:

| Producto | Patrón de valor documentado | Decisión para Nüva One |
|---|---|---|
| Xero | Datos completos de emisor/cliente, referencia, detalle por línea, impuestos, plazos, validez y términos | Adoptar la estructura documental clara y escaneable |
| QuickBooks | Catálogo, cantidades/precios editables, notas/adjuntos, vista previa, envío por email/enlace, estados vistos/aceptados/rechazados y conversión posterior | Adoptar revisión previa, trazabilidad real de envío y aprobación |
| Zoho Invoice | Plantillas de marca, archivos adjuntos, portal de cliente, aceptación/rechazo, duplicado y conversión | Adoptar plantillas, adjuntos opcionales y portal seguro como fase posterior |
| PandaDoc | Tablas de precios flexibles, catálogo central, descuentos/impuestos, bloques de firma y diseño de documentos | Adoptar una tabla de precios visualmente cuidada, consistente y conectada al catálogo |
| InvoiceFly | Flujo ágil de cliente + artículos + descuentos/impuestos + PDF, seguimiento y conversión | Adoptar simplicidad operativa sin replicar UI, marca ni propiedad intelectual |

**Conclusión de mercado:** no basta con generar un PDF. La propuesta competitiva es un flujo completo: crear → previsualizar → validar → exportar/compartir → registrar respuesta → convertir solo tras aceptación. La vista previa debe ser una representación del mismo documento que se exportará, no una tarjeta aproximada independiente.

Fuentes:
- Xero, guía de cotizaciones: https://www.xero.com/au/guides/price-quotes/
- QuickBooks, crear/enviar estimates: https://quickbooks.intuit.com/learn-support/en-us/help-article/job-estimates/create-send-estimates-quickbooks-online/L50QFW1v_W_US_en_US
- QuickBooks, estimates & proposals: https://quickbooks.intuit.com/accounting/estimates-proposals/
- Zoho Invoice, gestión de quotes: https://www.zoho.com/invoice/help/estimate/
- Zoho Invoice, crear y enviar estimates: https://www.zoho.com/us/invoice/create-send-estimates/
- PandaDoc, pricing tables: https://www.pandadoc.com/features/quote/pricing-table/
- InvoiceFly, estimates: https://invoicefly.com/product/estimates-app/
- HubSpot, plantilla de cotización y campos: https://53.fs1.hubspotusercontent-na1.net/hubfs/53/assets/directories/business-templates/files/EN/price-quote-file-pdf.pdf

## 3. Contexto chileno: límites tributarios y semántica

El documento debe titularse inequívocamente **COTIZACIÓN** o **PRESUPUESTO**. No debe usar folios, timbres, códigos QR ni textos que simulen un DTE.

El SII enumera como DTE, entre otros, factura, factura no afecta/exenta, factura de compra, liquidación factura, notas de crédito/débito y guía de despacho. La cotización comercial no aparece en esa lista. El SII también indica que las ventas/servicios deben respaldarse con el documento tributario que corresponda según la operación y el contribuyente.

Reglas de producto:
- Mostrar RUT del emisor y, cuando se tenga, razón social, giro y domicilio comercial. Estos datos ayudan a identificar al proveedor; no afirmar que cada uno sea requisito legal universal de toda cotización privada.
- Mostrar RUT del cliente cuando exista y sea pertinente; no bloquear cotizaciones B2C por falta de RUT.
- Tratar IVA como configuración explícita de la cotización/operación, no como un 19 % universal e incondicional.
- Para una operación afecta, usar la tasa configurada vigente (19 % es la tasa general que el SII publica para los casos gravados consultados), pero contemplar exenta/no afecta y otros tratamientos aplicables.
- Diferenciar precio unitario neto, impuesto y total; declarar claramente si el precio se ingresa con impuesto incluido o excluido.
- No asumir que todos los productos de un negocio comparten tratamiento tributario.
- La cotización no genera por sí misma débito fiscal, factura, asiento contable, pago, caja ni descuento de stock.
- La integración DTE/SII debe ser un flujo separado, validado y autorizado, con su propio estado y trazabilidad.

Fuentes oficiales:
- SII, tasa general del IVA (19 %, FAQ actualizada el 10-06-2025): https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm
- SII, Operación IVA: https://www.sii.cl/destacados/operacion_iva/
- SII, documentos tributarios electrónicos: https://www.sii.cl/destacados/factura_electronica/index.html
- SII, formato DTE versión 2.5 (febrero 2026): https://www.sii.cl/factura_electronica/factura_mercado/formato_dte_202602.pdf
- SII, FAQ sobre documentos obligatorios electrónicos: https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6502.htm

## 4. Estructura de una cotización completa

### 4.1 Cabecera e identidad del emisor
- Logotipo de la empresa (opcional, pero recomendado).
- Nombre comercial destacado y razón social cuando sea distinta y esté configurada.
- RUT.
- Giro/actividad económica.
- Dirección comercial, comuna y ciudad/región.
- Teléfono y correo de contacto.
- Sitio web (opcional).
- Datos bancarios solo si el negocio decide incluirlos y confirma su exactitud; nunca inventarlos.

### 4.2 Identificación documental
- Título “COTIZACIÓN” / “PRESUPUESTO”.
- Número correlativo por negocio (ya existe numeración de cotización en migración).
- Fecha de emisión.
- Fecha de vencimiento/validez explícita.
- Estado interno (borrador, enviada, vista, aceptada, rechazada, expirada).
- Revisión/versión cuando una oferta enviada se modifica. No sobrescribir silenciosamente una versión ya enviada/aceptada.

### 4.3 Destinatario
- Nombre/razón social del cliente.
- RUT si se encuentra disponible.
- Persona de contacto (si existe).
- Dirección de facturación o de prestación/entrega, según contexto.
- Correo y teléfono si existen.
- Identificador de cliente interno no necesariamente visible en el PDF.

### 4.4 Resumen comercial y alcance
- Asunto o nombre del proyecto.
- Descripción breve del objetivo.
- Alcance incluido.
- Exclusiones/elementos no incluidos.
- Supuestos, dependencias y responsabilidades del cliente.
- Plazo estimado, fecha de inicio/entrega y lugar de ejecución cuando aplique.
- Adjuntos o referencias técnicas opcionales (fotos, planos, fichas, especificaciones).

### 4.5 Detalle de productos/servicios
Cada línea debe ser una entidad estructurada:
- Producto/servicio vinculado al catálogo o línea libre.
- SKU/código opcional.
- Nombre.
- Descripción extendida.
- Unidad de medida (un, h, día, m², kg, pack, proyecto, etc.).
- Cantidad (decimal controlado por unidad).
- Precio unitario.
- Tratamiento tributario de la línea.
- Descuento de línea, si se admite.
- Importe neto de línea y total con impuesto, según el modo seleccionado.
- Imagen opcional para propuestas visuales, no obligatoria en el PDF estándar.

### 4.6 Resumen de importes
- Subtotal neto.
- Descuento por línea y/o global, distinguidos y nunca duplicados.
- Base imponible.
- IVA por tasa y monto (o categoría exenta/no afecta).
- Otros cargos configurables (despacho, instalación, urgencia), identificados y con su tratamiento.
- Anticipo/deposito solicitado (si corresponde) separado del total.
- Total final destacado.
- Moneda (CLP inicial; permitir futura extensión sin mezclar divisas).
- Regla de redondeo declarada y consistente.

### 4.7 Condiciones y aceptación
- Forma y calendario de pago.
- Porcentaje/importe de anticipo y hitos de pago.
- Plazos de entrega/ejecución.
- Validez de la oferta.
- Garantías cuando correspondan.
- Política de cambios, revisiones y cancelaciones.
- Exclusiones y condiciones de acceso/instalación.
- Aceptación: firma/fecha o aprobación digital registrada con evidencia.
- Nota de que la cotización no es factura ni documento tributario electrónico.

## 5. Dirección de arte: previsualización y PDF

### 5.1 Principio de fidelidad
Una única fuente de verdad documental debe alimentar la previsualización web y el PDF. La vista previa no puede tener totales, saltos de línea, logo o condiciones diferentes del archivo exportado.

### 5.2 Lenguaje visual
- Estética editorial corporativa premium, limpia, sobria y con jerarquía tipográfica.
- Fondo de página blanco cálido; superficies auxiliares gris perla.
- Color de marca derivado de configuración del negocio, con fallback Nüva One sobrio.
- Logotipo con proporción preservada; no deformar ni pixelar.
- Nombre del negocio visible y legible; título documental y folio con jerarquía propia.
- Tipografía sans-serif profesional, máximo dos familias/pesos principales.
- Márgenes generosos, grilla consistente, alineación decimal de importes.
- Tabla de líneas con encabezados claros, filas alternadas discretas y separación suficiente.
- Total final destacado sin ornamentos excesivos.
- Pie de página con contacto, referencia documental y paginación.
- Evitar bloques oscuros de gran altura que consuman espacio útil o impriman mal.

### 5.3 Layout sugerido de la página 1
1. Cabecera: logo + nombre/razón social y datos del emisor; a la derecha “COTIZACIÓN”, número y fecha.
2. Banda breve de asunto/proyecto.
3. Dos paneles de datos: “EMITIDA POR” y “PREPARADA PARA”.
4. Resumen de validez/plazo/entrega.
5. Alcance/introducción.
6. Tabla de líneas.
7. Resumen de importes a la derecha.
8. Condiciones, notas, aceptación y pie.
Las páginas siguientes repiten un encabezado compacto y la cabecera de tabla; nunca dividen una fila ni dejan el total huérfano.

### 5.4 Controles de calidad visual
- Previsualización responsive: A4 vertical a escala en desktop; visor ajustable y lectura móvil con scroll.
- Página/s y zoom.
- Estados vacíos bien diseñados y skeleton durante carga.
- Indicador de campos incompletos sin ocultar errores.
- Tipografía, contraste, espaciado, alineación y tamaño mínimo legible.
- Logo ausente/URL rota debe degradar elegantemente.
- Nombre largo de empresa/cliente, textos extensos y muchas líneas deben probarse.
- PDF embebido/descargado debe mantener fuentes, caracteres españoles, márgenes y paginación.
- No renderizar información financiera sensible (costos/márgenes internos) en el documento público.

## 6. UX recomendada

Editor de escritorio en dos zonas:
- Izquierda: pasos/secciones editables con validación contextual.
- Derecha: previsualización A4 en vivo.
En móvil: editor por secciones y botón persistente “Ver documento” para alternar al preview; no comprimir el A4 hasta hacerlo ilegible.

Flujo:
1. Elegir cliente (o crear/vincularlo) y asunto.
2. Añadir líneas desde catálogo o crear líneas libres.
3. Configurar impuestos, descuentos y forma de precio (neto/con IVA).
4. Completar alcance, fechas, condiciones, anexos.
5. Revisar resumen de validación y previsualización.
6. Guardar borrador.
7. Exportar PDF.
8. Compartir/enviar mediante canal integrado y registrar entrega real.
9. Capturar vista, aceptación/rechazo y comentarios en portal seguro.
10. Convertir a venta/factura solo con precondiciones y flujo financiero correctos.

## 7. Auditoría de implementación actual (confirmada en main)

Archivos principales:
- `src/routes/_authenticated/quotes.tsx`
- `src/lib/quote-pdf.ts`
- `supabase/migrations/20260622002712_0649104d-1a19-4220-bca0-84ee0dbe7696.sql`
- `supabase/migrations/20260802140000_quotes_premium.sql`
- `supabase/migrations/20260712000000_quote_followups.sql`
- `supabase/migrations/20260920040000_quotes_discount_terms_validation.sql`
- `supabase/migrations/20260920043500_unique_sale_quote_link.sql`
- `supabase/migrations/20260920044000_secure_quote_conversion.sql`

Confirmado:
- La tabla `quotes` es business-scoped y tiene RLS de miembros.
- Existe enum de estados: draft/sent/viewed/accepted/rejected/expired.
- Existe numeración por negocio y restricción única de venta por quote.
- Existe RPC `convert_quote_to_sale` con `FOR UPDATE`, verificación de rol, estado accepted, no duplicación e inserción de venta.
- El formulario permite cliente, catálogo, línea libre, cantidad, precio, descuento porcentual, fecha de validez y términos.
- El PDF tiene branding básico y descarga jsPDF.
- Negocio dispone de `name`, `tax_id`, `giro`, `address`, `comuna`, `public_contact_email`, `public_contact_phone`, `logo_url`.
- Cliente dispone de `name`, `tax_id`, `address`, `email`, `phone` y datos de envío.

Riesgos P0:
1. Formulario afirma “IVA incluido”, pero suma 19 % al precio y PDF lo presenta como IVA adicional. Requiere definir semántica neto/IVA incluido y compatibilidad de registros existentes antes de migrar.
2. PDF omite datos que ya existen y limita descripciones a 55 caracteres.
3. PDF no pagina correctamente notas/condiciones extensas; el bloque de condiciones no calcula overflow completo.
4. El botón “Enviar” solo guarda `status='sent'`; no realiza envío verificable.
5. Estado editable libremente en tabla; la transición no tiene una máquina de estados explícita en UI.
6. Modelo de línea persistido es JSON `{product_id,name,qty,price}`; cualquier extensión debe preservar compatibilidad con ventas y conversiones.
7. La función de conversión actual crea venta con `status='paid'`, `payment_method='efectivo'`, `paid_amount=total`, `stock_applied=false`, y nota “Generada desde cotización”. Esto merece revisión funcional urgente antes de usar la conversión como operación comercial real: aceptar una cotización no prueba que se haya cobrado. No cambiarlo sin analizar el ciclo de ventas/contabilidad existente.

Riesgos adicionales:
- `quote_number` se añade por migración, pero el bloque generado de tipos consultado no lo expone; verificar sincronización de tipos.
- La numeración actual se asigna con `MAX(quote_number)+1`; revisar concurrencia real y constraint única antes de prometer ausencia absoluta de colisiones.
- La tasa fija 19 % no soporta adecuadamente operaciones exentas/no afectas ni tasas por línea.
- El PDF no recibe todos los datos del cliente y negocio aunque ya existen en las tablas.
- Los estados sent/viewed deben distinguirse de la entrega real y lectura real.
- Una oferta aceptada debe conservar el snapshot exacto de líneas, impuestos, términos y versión aceptada.

## 8. Reglas de cálculo e integridad

- Usar aritmética monetaria decimal/enteros en CLP, no sumar floats binarios sin normalización.
- Definir si cada precio unitario se captura neto o bruto. Mostrarlo en la interfaz y documento.
- Para neto: base = cantidad × precio neto; impuesto = base × tasa aplicable.
- Para bruto: neto = bruto / (1 + tasa); impuesto = bruto − neto; documentar redondeo.
- Descuento debe tener una sola base inequívoca y aplicarse antes del impuesto cuando así corresponda al tratamiento configurado.
- Validar cantidad > 0, precio >= 0, descuento 0–100, tasa permitida, al menos una línea válida, cliente y fechas coherentes.
- Calcular importes en una única función compartida; no duplicar lógica entre editor y PDF.
- Enviar/aceptar congela una versión; cambios posteriores crean revisión nueva.
- No convertir dos veces; mantener idempotencia a nivel de base de datos.
- No reconocer ingreso ni pago al aceptar; la venta creada debe respetar el estado de cobro real y el motor contable actual.

## 9. Plan de entrega recomendado

### Fase A — Seguridad de cálculos y datos (P0)
1. Documentar semántica actual de precios históricos.
2. Diseñar cálculo común con tests unitarios para neto/bruto, IVA afecto/exento/no afecto, descuentos, redondeo y cantidades decimales.
3. Corregir el default “IVA incluido” o la fórmula, nunca dejar contradicción.
4. Revisar conversión quote→sale para no marcar como pagado un negocio aún no cobrado.
5. Completar datos del emisor/cliente y validaciones del editor.
6. Resolver snapshot/revisión para ofertas enviadas.

### Fase B — Diseño y documentos (P0)
1. Implementar preview A4 fiel a PDF.
2. Diseñar plantilla premium adaptable a marca.
3. Reescribir PDF con layout engine de medición, wrapping, tablas y paginación.
4. Encabezados/pies repetidos; evitar filas cortadas y bloques huérfanos.
5. Descargar PDF con nombre de archivo seguro y caracteres válidos.
6. Probar PDFs de 1, 2, 5+ páginas, textos largos, logo horizontal/cuadrado/ausente y nombres largos.

### Fase C — Operación comercial (P1)
1. Búsqueda, filtros, duplicar, revisar versiones y estados.
2. Envío real por canal autorizado (email inicialmente si está configurado); nunca marcar enviada antes de la confirmación del proveedor.
3. Portal público con token de alta entropía, hash almacenado, expiración/revocación, rate limit, acceso mínimo y aceptación/rechazo auditables.
4. Recordatorios con Inngest solo después de evento/outbox persistido; idempotencia, límites y preferencias del negocio.
5. Conversión posterior a venta con estado de pago real; DTE separado.

### Fase D — Especialización (P2)
Plantillas y campos opcionales por industria: comercio/distribución, servicios técnicos, construcción, consultoría/agencias, manufactura y gastronomía/eventos. Añadir materiales, mano de obra, etapas, entregables, desplazamiento, instalación, garantías y anexos según rubro. IA puede sugerir redacción/estructura, pero jamás inventar precios, RUT, plazos, impuestos o datos del cliente.

## 10. Matriz mínima de QA antes de habilitar producción

- [ ] Neto vs IVA incluido con casos de prueba exactos.
- [ ] IVA afecto 19 %, exento, no afecto y mezcla de líneas si se admite.
- [ ] Descuentos globales y por línea sin doble aplicación.
- [ ] CLP con redondeo determinista y totales reconciliados.
- [ ] Cantidades decimales, valores grandes, cero y límites.
- [ ] Validación de cliente/RUT/email/fechas.
- [ ] Aislamiento multi-tenant y permisos por rol.
- [ ] Estado enviado no se asigna sin evidencia de envío.
- [ ] Aceptación conserva snapshot/versionado.
- [ ] Conversión idempotente y no marca como pagado sin pago.
- [ ] No altera inventario ni contabilidad por la mera cotización.
- [ ] PDF fiel al preview, sin overflow, cortes ni truncamientos.
- [ ] Descarga con nombre válido y caracteres españoles.
- [ ] Responsive desktop/tablet/móvil.
- [ ] Accesibilidad de contraste, foco, etiquetas y navegación.
- [ ] Tests unitarios, integración, pgTAP si hay SQL y E2E.
- [ ] Confirmar SHA desplegado antes de declarar publicado.

## 11. Criterio de aceptación

La fase no se considera terminada hasta que:
- La empresa y cliente se identifican correctamente en la previsualización y PDF.
- Los cálculos visibles, persistidos y exportados coinciden exactamente.
- El usuario puede descargar y compartir un archivo profesional y legible.
- No se confunde cotización con DTE, factura, venta cobrada o ingreso contable.
- Los estados y conversiones se respaldan con permisos, transiciones y evidencia.
- La suite de pruebas y una prueba real en el navegador confirman el comportamiento.
