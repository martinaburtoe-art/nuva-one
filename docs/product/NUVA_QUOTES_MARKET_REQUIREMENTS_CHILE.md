# Nüva One — Cotizaciones profesionales: requisitos de producto y mercado (Chile)

**Estado:** criterio de producto para la implementación del módulo  
**Alcance:** cotización comercial / propuesta de venta. No es una factura, boleta ni DTE.

## 1. Conclusión ejecutiva

Una cotización profesional debe resolver tres trabajos en una misma experiencia: (1) preparar una oferta exacta y trazable, (2) comunicarla con claridad al comprador y (3) convertirla en una oportunidad/venta sin duplicar importes, registrar pagos ficticios ni afectar inventario antes de la confirmación operativa.

La referencia de mercado InvoiceFly valida el patrón de flujo breve: cliente → líneas de productos/servicios → descuentos e impuestos → plantilla/PDF → compartir → aceptación/seguimiento → conversión a factura. Nüva One debe adoptar ese flujo funcional, no copiar código, marca ni diseño propietario, y diferenciarse por la integración nativa con CRM, catálogo, inventario, ventas y finanzas.

## 2. Benchmark funcional

### InvoiceFly

Referencias oficiales consultadas:
- https://invoicefly.com/
- https://invoicefly.com/product/estimates-app/
- https://intercom.help/invoicefly/en/articles/9924791-creating-estimates-and-quotes
- https://intercom.help/invoicefly/en/articles/9924800-converting-estimates-quotes-to-invoices

Patrones de producto observados en la documentación pública:
- Crear una estimación/cotización desde cliente, productos/servicios y cantidades.
- Aplicar precios, descuentos, impuestos, notas y términos.
- Generar un documento compartible con plantillas.
- Registrar aceptación/firma como un hito distinto del envío.
- Duplicar, hacer seguimiento y convertir la propuesta aceptada a un documento posterior.

### Implicación para Nüva One

No confundir los hitos. Guardar no significa enviar; descargar no significa entregar; marcar aceptación manual no equivale a firma electrónica; y aceptar una cotización no significa cobrar ni despachar. Cada estado debe tener una evidencia asociada o estar claramente etiquetado como registro interno.

## 3. Estructura recomendada del documento

### A. Identidad del emisor
- Razón social / nombre comercial del negocio.
- RUT.
- Giro o actividad.
- Dirección comercial y comuna.
- Correo y teléfono de contacto.
- Logotipo (opcional).
- Identificador interno correlativo por negocio.

### B. Identificación del destinatario
- Razón social o nombre.
- RUT (cuando se disponga).
- Persona de contacto.
- Dirección.
- Comuna/ciudad/región.
- Correo y teléfono.

### C. Contexto de la oferta
- Número de cotización.
- Fecha de emisión.
- Fecha límite de vigencia.
- Asunto, proyecto u orden de referencia.
- Ejecutivo o responsable (evolución futura).
- Moneda y modalidad de precios.

### D. Detalle económico
Cada línea debe admitir:
- Producto/servicio, descripción técnica y/o alcance.
- SKU/código interno y unidad de medida.
- Cantidad con precisión decimal cuando corresponda.
- Precio unitario.
- Importe de línea.
- Descuento de línea (evolución futura).
- Impuesto/tratamiento aplicable (por ahora definido a nivel de documento; no mezclar tratamientos tributarios en una misma cotización).

Resumen:
- Subtotal neto.
- Descuento global.
- Base imponible.
- Impuesto desglosado.
- Total final con impuestos incluidos.
- Modalidad de ingreso: valores netos o valores brutos con impuesto incluido.

### E. Condiciones comerciales
- Alcance, entregables y exclusiones.
- Plazos estimados y fecha/ventana de entrega.
- Condiciones de pago y anticipos.
- Despacho, instalación o gastos adicionales.
- Garantía/soporte, cuando aplique.
- Vigencia de la oferta.
- Condiciones de aceptación y firma.
- Espacio para nombre, firma y fecha del cliente.

### F. Presentación y archivo
- Jerarquía visual clara, marca del negocio, tipografía legible y paleta sobria.
- PDF A4 multipágina, con encabezado/pie y numeración.
- Repetición de encabezados de tabla cuando una tabla continúa.
- Texto largo con ajuste de línea; no truncar descripción, notas o condiciones.
- Archivo nombrado con número, cliente y fecha.
- Metadatos PDF (título, autor, asunto).
- La previsualización debe ser consistente con el PDF exportado; la vista previa web es una aproximación de paginación, no una garantía de coincidencia de saltos de página.

## 4. Reglas relevantes para Chile

### IVA
El SII informa una tasa general de IVA de 19% (artículo 14 de la Ley sobre Impuesto a las Ventas y Servicios). La aplicación de IVA/exención/no afectación depende de la naturaleza de la operación y del contribuyente; el sistema no debe inferir que toda línea es afecta solo porque el negocio tenga RUT.

Fuentes:
- SII, tasa IVA 19%, actualizado 10-06-2025: https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm
- SII, información sobre IVA: https://www.sii.cl/destacados/international_transactions/4562-4572-esp-4569.html

### Precio total y transparencia
El artículo 30 de la Ley 19.496 dispone que el precio informado al consumidor debe comprender el valor total, incluidos los impuestos correspondientes. El artículo 3 reconoce el derecho a información veraz y oportuna sobre el bien/servicio, precio y condiciones relevantes.

Fuentes:
- SERNAC, artículo 30: https://www.sernac.cl/portal/609/w3-propertyvalue-58774.html
- BCN, Ley 19.496, texto refundido actualizado: https://www.bcn.cl/leychile/navegar?i=1160403&f=2025-07-11&p=10239813

### Separación entre cotización y DTE
Una cotización es una propuesta comercial; no debe presentarse como factura, boleta ni DTE. El SII describe los DTE como documentos tributarios emitidos, firmados digitalmente y sujetos a sus procesos de emisión/validación. La obligación de emitir el documento tributario que corresponda por una venta es un flujo distinto.

Fuentes:
- SII, qué es factura electrónica: https://www.sii.cl/factura_electronica/que_es_fact_elect.htm
- SII, operación IVA y emisión de documento tributario por ventas: https://www.sii.cl/destacados/operacion_iva/

**Límite:** este documento es criterio de producto y no sustituye asesoría tributaria/jurídica. Antes de ofrecer emisión DTE, firma electrónica avanzada o aceptación con efectos contractuales, se requiere diseño y validación legal/tributaria específica.

## 5. Modelo de estados recomendado

| Estado | Significado | Evidencia requerida |
|---|---|---|
| Borrador | Editable por usuarios autorizados | Registro interno |
| Lista para compartir | Documento revisado y congelado como versión | Snapshot/hash de versión (siguiente etapa) |
| Enviada | Entrega efectiva al destinatario | Evento de email/portal y destinatario |
| Vista | El destinatario abrió el enlace | Evento del portal |
| Aceptada | El cliente aceptó la versión identificada | Usuario/fecha/versión/consentimiento; firma si se ofrece |
| Rechazada | El cliente rechazó | Evento, fecha y motivo opcional |
| Expirada | Pasó la vigencia sin aceptación | Regla temporal |
| Convertida | Se creó una venta vinculada | ID de venta, idempotencia |

En la primera versión, los estados enviados/vistos no deben ser falsificados por un cambio manual. La etiqueta “aceptada · registro interno” deja claro que no existe aún una firma electrónica o portal de aceptación.

## 6. Integración nativa Nüva One

- CRM: asociar la cotización al cliente y conservar snapshot de los datos usados al emitir.
- Catálogo: permitir productos existentes y líneas libres; conservar SKU/unidad/descripcion como snapshot.
- Inventario: una cotización no descuenta stock. Una reserva debe ser una acción separada y explícita.
- Ventas: solo convertir propuestas aceptadas y hacerlo idempotentemente mediante RPC transaccional.
- Finanzas: una cotización no es ingreso reconocido ni caja; una venta borrador no debe crear asiento, transacción ni pago.
- Nüva Intelligence: usar cotizaciones como pipeline/proyección ponderada, nunca como ingreso realizado.
- Inngest: recordatorios futuros solo con evento/outbox posterior al commit, idempotencia, reintentos y aislamiento por negocio.

## 7. Controles de calidad indispensables

1. Cálculo de moneda CLP en enteros, con redondeo determinista por línea.
2. Pruebas para neto/bruto, IVA, descuentos, cantidades decimales y límites.
3. Validación de datos mínimos del emisor y destinatario; RUT como dato identificador, sin inventar datos ausentes.
4. Protección multi-tenant y permisos de lectura/escritura.
5. Numeración correlativa por negocio con concurrencia.
6. Snapshot de cliente, artículos y condiciones para que el PDF histórico no cambie al editar CRM/catálogo.
7. Paginación y textos extensos en PDF.
8. Exportación bloqueada si los totales persistidos no coinciden con el cálculo reproducible.
9. Conversión repetida idempotente; sin cobro ni movimiento de stock.
10. Pruebas E2E móvil/escritorio y verificación del PDF descargado real.

## 8. Alcance de la implementación de PR #352

Implementado en la rama de trabajo:
- Editor con previsualización A4 en vivo.
- Datos del negocio y del cliente; snapshot del destinatario.
- Líneas con descripción, SKU/unidad, cantidades y precio.
- Tratamiento tributario y modalidad neto/bruto.
- Validación de importes y vigencia.
- PDF A4 con paginación, identidad comercial, detalle, resumen, condiciones, firma y metadatos.
- Edición de borradores, duplicación y descarga desde listado.
- Numeración por negocio y conversión segura a venta borrador.
- Pruebas de cálculo y pgTAP de conversión.

Pendiente antes de release:
- CI completo sobre el SHA final.
- Ejecutar pgTAP en el pipeline de la rama.
- Revisar PDF generado real con casos largos y múltiples páginas.
- Aplicar migración solo tras aprobación y pipeline verde.
- Portal público de aceptación/firma y envío trazable son fases posteriores, no se deben anunciar como terminadas.
