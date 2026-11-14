# Nüva Documents — Paridad funcional con Invoice Fly

**Estado:** especificación ejecutable de producto y arquitectura  
**Proyecto:** Nüva One · Chile  
**Rama base de trabajo:** `feat/quotes-professional-editor-pdf-20261114`  
**Objetivo:** incorporar dentro de Nüva One el flujo de documentos comerciales y trabajo facturable que hace útil a Invoice Fly, sin crear una aplicación paralela ni copiar su código, marca o recursos protegidos.

## 1. Alcance y criterio de éxito

Nüva Documents debe permitir que una pyme gestione el ciclo completo:

**Cliente → presupuesto/cotización → aprobación → factura/documento de cobro → pagos/abonos → saldo y seguimiento → reportes.**

Y para negocios de servicios:

**Trabajo/proyecto → horas y materiales → cotización → ejecución → cargos facturables → factura → pago.**

Los documentos deben reutilizar los datos maestros de Nüva One (empresa, clientes, catálogo, inventario y finanzas). No se crean copias desconectadas de clientes o productos; se guardan snapshots inmutables de lo que efectivamente se emitió.

La experiencia objetivo es rápida, visual y mobile-first: crear, revisar, previsualizar, compartir y dar seguimiento sin cambiar de aplicación.

## 2. Benchmark de Invoice Fly: capacidades verificadas

Fuentes oficiales consultadas el 14-11-2026:
- https://invoicefly.com/
- https://intercom.help/invoicefly/en/articles/9886877-overview-of-invoice-fly
- https://intercom.help/invoicefly/en/articles/9891361-faqs
- https://invoicefly.com/product/invoice-management/
- https://intercom.help/invoicefly/en/articles/9924814-tracking-expenses

| Capacidad observada | Comportamiento de referencia | Objetivo Nüva |
|---|---|---|
| Facturas | Crear desde cliente, conceptos, precios, impuestos, descuentos, pagos y notas | Documento de cobro con estados, saldo y trazabilidad |
| Estimaciones/cotizaciones | Crear oferta y convertirla a factura tras aprobación | Ya existe base de cotización en PR #352; extender a ciclo completo |
| Plantillas | Diseños configurables con marca y varios layouts | Diseñador por negocio con plantillas y vista previa fiel |
| Compartir | Enlace web o PDF descargable/compartible | Portal público seguro + PDF |
| Aceptación | Solicitar y registrar aceptación/firma de estimaciones | Aceptación versionada, consentimiento y evidencia; no simular firma legal |
| Pagos | Stripe/PayPal en Invoice Fly | Adaptar a proveedores disponibles en Chile (Mercado Pago como prioridad existente); webhook y conciliación |
| Recordatorios | Seguimiento de pagos y vencimientos | Recordatorios auditables, idempotentes y configurables |
| Clientes | Ficha, historial de documentos, pagos y estados de cuenta | Reutilizar CRM existente y añadir timeline documental |
| Gastos/recibos | Registro manual y escaneo OCR de recibos | Integrar gastos existentes; captura/OCR con revisión humana |
| Tiempo facturable | Horas por cliente/trabajo, billed/unbilled y facturar tiempo | Registro de jornada/proyecto y selección explícita de horas facturables |
| Reportes | Invoices, expenses, balance, filtros por período/cliente | Panel documental conectado a finanzas, sin doble contabilización |
| Exportación | CSV/PDF/Excel según tipo de reporte | Exportaciones con permisos y filtros |
| Fotos en documentos | Adjuntar imágenes a facturas | Adjuntos con límites, orden, compresión y storage privado |
| Multiempresa | Más de un negocio por cuenta | Mantener aislamiento por business_id y contexto activo |

### Incertidumbres del benchmark que no deben convertirse en supuestos

- La documentación de ayuda de Invoice Fly indica que no ofrece automatización de facturación recurrente ni cobro automático, mientras páginas comerciales recientes mencionan recurring invoices. Tratar recurrencia como capacidad a verificar; no declararla requisito de paridad confirmada.
- La aceptación/firma no equivale por sí sola a firma electrónica avanzada.
- Invoice Fly habla de invoices; en Chile Nüva debe separar cotización comercial, comprobante de pago y DTE. Una cotización o PDF interno nunca debe presentarse como factura/boleta tributaria oficial.
- La disponibilidad de pagos online de Invoice Fly depende de Stripe/PayPal; Nüva debe usar integraciones realmente disponibles y configuradas para el negocio chileno.

## 3. Mapa funcional de Nüva Documents

### 3.1 Centro documental
Una sola entrada dentro del producto con vistas:
- Resumen: documentos por estado, vencimientos, montos cotizados, facturados, cobrados y pendientes (cada métrica con definición).
- Cotizaciones / presupuestos.
- Facturas y documentos de cobro.
- Pagos y abonos.
- Plantillas y marca.
- Clientes y estados de cuenta (deep-link a CRM, no duplicar CRM).
- Trabajos, proyectos y tiempo facturable.
- Gastos y recibos (deep-link/integración con gastos).
- Reportes y exportaciones.

### 3.2 Editor de documentos
- Crear desde cliente existente o alta rápida; nunca duplicar identidad maestra.
- Agregar productos/servicios del catálogo o línea libre con descripción y unidad.
- Añadir imágenes/adjuntos y notas internas separadas de las visibles al cliente.
- Descuento por línea y global; impuestos configurables con reglas chilenas.
- Condiciones, vigencia, vencimientos, anticipos y calendario de pagos.
- Identidad del emisor desde la empresa activa; RUT, giro, dirección y contactos.
- Guardar borrador, previsualizar, duplicar, versionar, descargar PDF y compartir.
- Diseñador de plantillas: logo, colores, tipografía, bloques, visibilidad de campos, encabezado/pie y términos.
- Mobile-first, accesible por teclado, estados de carga/error y prevención de pérdida de cambios.

### 3.3 Portal del cliente
- URL pública de alta entropía, revocable y con expiración; no exponer IDs secuenciales.
- Mostrar solo el documento y datos autorizados para ese destinatario.
- Ver/descargar PDF, aceptar o rechazar cotización, dejar comentario y revisar pagos.
- Capturar nombre, correo, fecha, versión exacta, texto de consentimiento y evidencia técnica mínima.
- Pagar solo mediante checkout del proveedor habilitado; nunca capturar tarjetas directamente.
- No indexar públicamente; rate limiting, protección contra enumeración y revocación.
- Firma avanzada y validez contractual requieren evaluación legal separada.

### 3.4 Facturas, pagos y saldos
- La factura/documento de cobro es un objeto distinto de la cotización.
- Registrar pagos parciales, anticipos, fecha, medio, referencia del proveedor y conciliación.
- Saldo = total exigible menos pagos confirmados; pagos pendientes/rechazados no reducen saldo.
- Webhooks firmados, idempotencia por proveedor/evento y registro de auditoría.
- Reversas/anulaciones mediante eventos compensatorios; nunca borrar pagos confirmados.
- No activar pagos online hasta tener credenciales, webhook, conciliación y pruebas sandbox.

### 3.5 Trabajo, horas y materiales
- Proyecto/trabajo ligado a cliente y responsable.
- Registros de tiempo con inicio/fin o duración, tarifa y estado billable/non-billable.
- Materiales vinculados al catálogo; consumo de inventario solo cuando se confirma ejecución/venta según flujo operacional.
- Prevenir doble facturación: cada registro billable puede ser facturado una sola vez o parcialmente con saldo explícito.
- Desde el trabajo se pueden preparar cotización y factura con trazabilidad.

### 3.6 Gastos y recibos
- Reutilizar el módulo/tabla de gastos existente.
- Captura de imagen/PDF, OCR como sugerencia, revisión y confirmación humana.
- Proveedor, fecha, total, impuesto, categoría, medio de pago y adjunto original.
- No crear gasto contable definitivo solo por OCR; conservar documento fuente y auditoría.
- Evitar duplicados por hash/negocio/fecha/monto y permitir resolución manual.

## 4. Modelo de dominio objetivo

No implementar una tabla genérica sin discriminación que mezcle estados y efectos. Separar conceptos:

- `commercial_documents`: cabecera/versiones de cotización y factura interna; business_id, customer_id, document_type, document_number, status, currency, dates, totals, template_id, current_version_id.
- `commercial_document_versions`: snapshot inmutable del emisor, destinatario, líneas, impuestos, condiciones, adjuntos y totales; content_hash y created_by.
- `commercial_document_events`: timeline append-only: created, issued, shared, viewed, accepted, rejected, payment_requested, payment_confirmed, overdue, voided, converted.
- `commercial_document_lines`: líneas normalizadas o snapshot JSON validado, con origen catalog item opcional y descripción/precio/unidad congelados.
- `document_templates`: plantilla y configuración por negocio, con presets del sistema.
- `document_public_links`: token hash, expiración, revocación, alcance y contador/último acceso.
- `document_payments`: pagos y abonos confirmados/pending/failed/refunded, provider, provider_reference, idempotency_key.
- `client_work_logs`: tiempo billable/non-billable, cliente/proyecto, tarifa y facturación parcial.
- `document_attachments`: storage key, MIME, tamaño, hash, clasificación y relación.
- `document_delivery_attempts`: canal, destinatario, proveedor, resultado, timestamps y error normalizado.

**Compatibilidad:** PR #352 ya agrega columnas y numeración a `public.quotes`. No reemplazarlo a ciegas ni duplicar datos. Antes de introducir `commercial_documents`, preparar estrategia de migración/compatibilidad que preserve historial y permita coexistencia temporal o migración verificable.

## 5. Máquina de estados y reglas de negocio

### Cotización
`draft → ready → sent → viewed → accepted | rejected | expired → converted`

- `sent` requiere entrega confirmada por canal real.
- `viewed` requiere evento de acceso al enlace.
- `accepted` exige aceptación registrada sobre una versión concreta.
- `converted` referencia exactamente una factura/venta destino.
- Una cotización aceptada no se edita; se crea nueva versión o duplicado y se conserva historial.
- Expiración calculada con zona horaria del negocio y sin borrar la propuesta.

### Factura interna / documento de cobro
`draft → issued → partially_paid → paid`, con ramas `overdue`, `voided`, `written_off` solo bajo permisos y reglas explícitas.

- Emitir documento interno no equivale a emitir DTE.
- No marcar paid por el mero retorno del navegador del checkout; exigir webhook verificado o conciliación autenticada.
- Pago parcial no cambia el documento a paid.
- Anulación conserva documento y eventos.

### Invariantes financieras y operativas
- Cotización nunca crea ingreso, caja, asiento ni movimiento de stock.
- Venta en borrador tampoco contabiliza ni mueve stock.
- Factura interna no genera asiento definitivo hasta el evento contable previsto.
- Solo venta/entrega confirmada afecta inventario conforme a las reglas actuales.
- Cada conversión y cada webhook deben ser idempotentes en base de datos, no solo en cliente.
- Todo registro pertenece a business_id y aplica RLS; tokens públicos se resuelven server-side con hash y alcance limitado.
- CLP se maneja en unidades enteras; precisión y redondeo explícitos. No usar float para persistencia monetaria.
- Snapshot emitido debe seguir reproduciendo el PDF aunque CRM, catálogo o marca cambien después.

## 6. Chile: límites tributarios y legales

- Cotización, factura interna, recibo de pago y DTE son entidades y documentos distintos.
- Tasa general IVA 19% como configuración por defecto, no como inferencia universal. Exento/no afecto y casos especiales deben depender de clasificación y validación.
- Precio mostrado al consumidor debe ser transparente y considerar impuestos que correspondan.
- RUT debe validarse/formatearse; no inventar RUT ni datos tributarios faltantes.
- Emisión de DTE requiere integración SII/proveedor autorizado, firma y ciclo de certificación específico; queda fuera de la primera entrega de paridad documental.
- Firma de aceptación simple no debe etiquetarse como firma electrónica avanzada.
- Política de retención, privacidad, consentimiento, tratamiento de datos y documentos debe revisarse para Chile antes de abrir portal público.

## 7. Secuencia de implementación y Definition of Done

### Fase 0 — Base de cotizaciones (PR #352)
- [x] Editor de cotización con preview A4 y PDF multipágina.
- [x] Cálculo neto/bruto, IVA, exento/no afecto y descuentos globales.
- [x] Snapshot básico de cliente, numeración y conversión idempotente a venta borrador.
- [x] Pruebas de cálculo y pgTAP de seguridad de conversión en CI de SHA `57a7f9174a43ebd71c2e384d6af6456768b9d1b0`.
- [ ] QA visual de PDF real en fixtures largos y móvil/escritorio.
- [ ] Migración controlada y release; no desplegar sin reconciliar esquema de producción.

### Fase 1 — Factura interna y ciclo de cobro
- [ ] Documento factura interno distinto de cotización y DTE.
- [ ] Conversión cotización aceptada → factura interna con snapshot, relación y protección de doble conversión.
- [ ] Pagos parciales/anticipos y saldo calculado.
- [ ] Estados y vencimientos con eventos auditables.
- [ ] Exportación PDF y vista previa consistente.
- [ ] Sin contabilización/stock prematuros.

### Fase 2 — Diseñador y plantillas
- [ ] Plantillas del sistema y por negocio.
- [ ] Editor visual de marca y bloques.
- [ ] Fotos y adjuntos con Storage privado.
- [ ] Vista previa web/PDF con paridad de contenido.
- [ ] Versionado y snapshots reproducibles.

### Fase 3 — Compartir y portal de clientes
- [ ] Envío por email con proveedor conectado y delivery evidence.
- [ ] Link seguro revocable/expirable.
- [ ] Visualización, descarga y eventos opened.
- [ ] Aceptar/rechazar versión exacta, consentimiento y audit trail.
- [ ] Pagos por checkout con webhook verificado.

### Fase 4 — Servicios, tiempo y gastos
- [ ] Proyectos/trabajos por cliente.
- [ ] Tiempo billable/unbilled y conversión a líneas facturables.
- [ ] Materiales y costos sin doble movimiento de inventario.
- [ ] Integración con gastos y escaneo/OCR asistido.
- [ ] Controles de doble facturación y duplicados.

### Fase 5 — Reportes y pulido de paridad
- [ ] Reportes de documentos, cobros, gastos y balance.
- [ ] Estado de cuenta por cliente.
- [ ] Exportación CSV/PDF/XLSX.
- [ ] Recordatorios y tareas programadas idempotentes.
- [ ] Pruebas E2E móvil/escritorio y accesibilidad.

**Definition of Done global:** cada flujo está implementado en el producto real, persiste datos correctamente, respeta multi-tenant/RLS, tiene pruebas automatizadas y evidencia de QA, no crea efectos financieros/stock ficticios, y está desplegado con SHA verificable. Un documento de especificación, mock o estado manual no cuenta como funcionalidad terminada.

## 8. Dependencias técnicas y decisiones

- Reutilizar tablas y módulos existentes de CRM, catálogo, gastos, ventas y finanzas; antes de añadir tablas, inspeccionar esquema real y migraciones pendientes.
- La integración de pagos requiere credenciales y webhooks por negocio/proveedor. No almacenar secretos en el cliente.
- El envío requiere proveedor de email configurado, plantillas, opt-out y registros de entrega.
- Recordatorios y trabajos asíncronos deben usar outbox transaccional e idempotencia; no agregar Inngest hasta reconciliar ramas/stashes locales preexistentes y confirmar la arquitectura actual.
- Toda migración debe probarse sobre copia/entorno aislado, ejecutar pgTAP y plan de rollback; nunca aplicar directamente a producción como primer ensayo.
- Mantener PR #352 como base del trabajo documental inmediato; no mezclar otros frentes de Nüva One en esta iniciativa.

## 9. Fuentes oficiales de referencia

- Invoice Fly — producto: https://invoicefly.com/
- Invoice Fly — Overview: https://intercom.help/invoicefly/en/articles/9886877-overview-of-invoice-fly
- Invoice Fly — FAQ y flujos de crear, compartir, pagar, gastos, tiempo y reportes: https://intercom.help/invoicefly/en/articles/9891361-faqs
- Invoice Fly — gestión de facturas: https://invoicefly.com/product/invoice-management/
- Invoice Fly — gastos y escaneo: https://intercom.help/invoicefly/en/articles/9924814-tracking-expenses
- SII — factura electrónica y DTE: https://www.sii.cl/factura_electronica/que_es_fact_elect.htm
- SII — operación IVA: https://www.sii.cl/destacados/operacion_iva/


## 10. Implementación incorporada en la rama (14-11-2026)

La siguiente base ya fue añadida al repositorio, pendiente de validación CI y aplicación en entorno aislado:

- `supabase/migrations/20261114100000_nuva_documents_internal_invoices.sql`
  - Tabla `invoices` para documentos internos de cobro, con snapshot de cliente/emisor/líneas, importes, numeración por negocio y estado.
  - Tabla `invoice_payments` con idempotencia por negocio, medio/referencia y vínculo a transacción de ingreso.
  - Tabla append-only `invoice_events` para trazabilidad de conversión, emisión y pagos.
  - RLS: lectura de miembros; escrituras de tablas financieras revocadas al cliente y mutaciones únicamente por RPC autorizados.
  - RPC de conversión cotización aceptada → factura interna en borrador; emisión explícita; registro manual de abonos parciales con control de saldo e idempotencia.
  - Cada abono manual confirmado crea una transacción de ingreso en `public.transactions`; no genera venta, no descuenta stock y no pretende emitir DTE.
- `supabase/tests/database/119_internal_invoice_lifecycle.sql`
  - 25 aserciones pgTAP previstas para conversión, snapshots, separación DTE, emisión, pagos parciales, idempotencia, límites de saldo y reflejo en transacciones.
- `src/routes/_authenticated/invoices.tsx`
  - Primer espacio de trabajo: cotizaciones aceptadas pendientes de conversión, documentos internos, métricas de montos emitidos/cobrados/pendientes, emisión y registro de abonos.
- `src/routeTree.gen.ts` y `src/components/dashboard-shell.tsx`
  - Ruta autenticada `/invoices` y acceso desde navegación, bajo el permiso de cotizaciones.

**No afirmar como completado:** esta implementación no ha sido aún confirmada por CI en el SHA final, no se ha aplicado la migración en staging/producción, no existe aún PDF específico de factura, diseñador de plantillas, portal público, email delivery, integración de pagos online, OCR ni horas facturables. Los abonos actualmente son registros manuales confirmados por un operador y se reflejan en `transactions`; webhooks y conciliación de proveedores requieren una fase separada.
