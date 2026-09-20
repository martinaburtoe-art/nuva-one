# Nüva One — Auditoría integral y plan de evolución
Fecha: 2026-09-20

## Objetivo
Consolidar la auditoría interna del repositorio, Supabase y producción con la revisión externa del mercado chileno/LatAm para orientar el producto hacia un sistema operativo empresarial: operar → entender → decidir → actuar → medir.

## Estado interno observado
- Supabase productivo: 85 tablas públicas, 229 políticas RLS, 71 funciones públicas, 345 índices y 22 vistas.
- El producto ya contiene POS/ventas, inventario, compras, caja, CRM, cotizaciones, cobranza, finanzas, contabilidad, tributario, envíos, automatizaciones, IA, Nüva Intelligence, analytics, Studio, catálogo público, comunidad, billing y control ejecutivo.
- Existe Centro Ejecutivo, Decision Engine, Action Center, customer intelligence, cash-flow forecasts, replenishment recommendations y outbox para n8n.
- La prioridad no es duplicar módulos; es cerrar los ciclos de negocio y unificar el contexto.

## Cambios aplicados en esta fase
1. Se creó `nuva_action_queue` tenant-scoped con RLS y estados explícitos.
2. Nüva Intelligence ahora permite **Preparar acción** y persistir una acción confirmada por el usuario.
3. Se mantiene la regla de que la inteligencia no ejecuta operaciones irreversibles sin confirmación.
4. La cola incorpora idempotencia por negocio/día para evitar duplicados accidentales.
5. La migración quedó aplicada en Supabase y versionada en Git.

## Producto: dirección objetivo

### Operate
Ventas, POS, inventario, compras, caja, clientes, cotizaciones, envíos.

### Manage
Finanzas, contabilidad, tributario, cobranza, personas y documentos.

### Connect
WhatsApp, bancos, ecommerce, SII, pagos, n8n, soporte y logística.

### Intelligence
Nüva Score, señales, forecasting, customer intelligence, pricing intelligence, anomalías y escenarios.

### Action
Cola de acciones, aprobación, ejecución, trazabilidad, resultado y memoria.

## Benchmark externo

### Treinta
Referencias: POS rápido, ventas/gastos, inventario, clientes/proveedores, deudas, reportes, variantes, códigos de barras y operación móvil.
https://treinta.co/

### Bsale
Referencia: POS + inventario + facturación + ecommerce y operación omnicanal.
https://www.bsale.cl/

### Defontana
Referencia: ERP chileno integrado con contabilidad, ventas, inventario, personas y finanzas.
https://www.defontana.com/cl/

### Nubox
Referencia: contabilidad, remuneraciones, facturación, conciliación y operación tributaria local.
https://www.nubox.com/

### Chipax
Referencia: automatización financiera, conciliación y flujo de caja.
https://www.chipax.com/

### Buk
Referencia: gestión de personas y workflows de RRHH.
https://www.buk.cl/

### Odoo / Zoho One / Holded
Referencias para ecosistema, integraciones, automatización, API y datos compartidos.
https://www.odoo.com/
https://www.zoho.com/one/
https://www.holded.com/es/

## Chile: compliance que debe permanecer en P0/P1
El SII publicó en 2026 nuevas resoluciones y validaciones DTE; el formato DTE vigente documenta requisitos de estructura, firma e integridad.
- https://www.sii.cl/normativa_legislacion/resoluciones/2026/res_ind2026.htm
- https://www.sii.cl/factura_electronica/factura_mercado/formato_dte_202602.pdf

La Ley 21.719 establece un marco actualizado de protección de datos personales y contempla protección desde el diseño y por defecto. Nüva debe mantener minimización, tenant isolation, trazabilidad, retención y mecanismos de derechos de titulares como requisitos de arquitectura.
- https://www.bcn.cl/leychile/navegar?idNorma=1209272

## Backlog de evolución

### P0 — confiabilidad
- Cerrar protección de contraseñas filtradas en Auth.
- Validar cross-tenant para todas las superficies de IA.
- E2E: venta → stock → caja → cliente.
- E2E: compra → inventario → costo → caja.
- E2E: cotización → venta.
- E2E: DTE/tributario.
- E2E: billing y webhooks.
- Datos de demo realistas y coherentes.
- Observabilidad de errores, latencia y jobs.

### P1 — inteligencia accionable
- Completar ciclo de `nuva_action_queue`: pending → approved → executing → completed/failed.
- Command Center unificado.
- Forecast de ventas, demanda, caja y cobranza.
- Scenario simulator.
- Importador inteligente Excel/CSV.
- Customer Intelligence con RFM/churn/LTV.
- Pricing Intelligence.
- WhatsApp como canal transversal.
- Catálogo → pedido → reserva → pago → venta → despacho.

### P2 — expansión
- People/HR Chile.
- Open banking.
- Ecommerce/marketplaces.
- Logística.
- Firma electrónica.
- API pública.
- Marketplace de integraciones.

### P3 — moat
- Business Graph.
- Contexto empresarial persistente.
- Memoria de decisiones.
- Recomendaciones basadas en resultados.
- Modelo de eventos compartido entre dominios.

## Criterios de arquitectura
- Todo dato empresarial debe permanecer tenant-scoped.
- Las acciones irreversibles requieren autorización explícita.
- Los eventos deben ser idempotentes.
- Integraciones externas deben usar adapters y nunca secretos en frontend.
- Las recomendaciones de IA deben conservar explicación, origen, timestamp y resultado.
- Evitar nuevos módulos aislados cuando una capacidad pueda componerse sobre dominios existentes.
- Toda mejora relevante debe acompañarse de pruebas de autorización, datos y regresión.

## Definition of Done para la siguiente etapa
Una capacidad se considera terminada sólo cuando:
1. existe UI,
2. existe lógica de dominio,
3. existe persistencia,
4. existe RLS/autorización,
5. existe manejo de errores,
6. existe idempotencia cuando corresponda,
7. existe test,
8. funciona en datos demo,
9. funciona en producción,
10. queda documentada.

## Principio rector
Nüva One no debe ganar por tener más menús. Debe ganar por conectar mejor los datos del negocio y convertirlos en decisiones y acciones verificables.


## 2026-09-20 QA hardening update

- Corrected malformed dollar quoting in `20260920043000_harden_catalog_and_agent_history.sql`; clean local migration rebuild now completes through the full migration set.
- Added bounded Supabase startup fallback to CI/load-test workflows so health-check stalls fail fast and retry with health checks bypassed.
- Certified `nuva_action_queue` RLS, manager-only mutation, transition validation, audit trigger, tenant isolation and idempotency indexes with pgTAP.
- Fixed the oversell pgTAP expectation to match the current atomic stock guard error contract. The full database suite subsequently passed: 22 files / 181 tests.
- Patched development dependency vulnerabilities: Vitest `4.1.11` / coordinated `@vitest/*` `4.1.11`, and js-yaml `4.3.2`.
- Production deployments for the hardened commits reached READY on Vercel.
