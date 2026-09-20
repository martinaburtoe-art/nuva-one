# Nüva One — Competitive Product Roadmap

## Objetivo

Convertir Nüva One en un sistema operativo para pymes: operaciones simples como un POS/gestor SMB, pero con inteligencia que explica, recomienda y conecta acciones entre módulos.

## Principios

1. **Operación en segundos:** registrar una venta, gasto, producto, cliente o cotización requiere el mínimo de pasos.
2. **Dato único:** ventas, inventario, caja, CRM, compras y cotizaciones reutilizan el mismo contexto.
3. **Trazabilidad:** cambios críticos de stock, precios, caja y documentos deben poder auditarse.
4. **Inteligencia accionable:** no limitarse a mostrar KPIs; explicar variaciones y proponer acciones.
5. **WhatsApp como canal comercial:** compartir catálogo, comprobantes, cotizaciones y cobranza sin duplicar datos.
6. **Mobile-first:** las operaciones frecuentes deben funcionar especialmente bien en teléfono.

## Backlog competitivo

### P0 — Operación
- [ ] Venta rápida y flujo POS consistente.
- [ ] Inventario con variantes, stock crítico y reposición.
- [ ] Caja y gastos conectados a ventas.
- [ ] Clientes, proveedores y cuentas por cobrar.
- [ ] Cotización → pedido → venta.
- [x] Catálogo conectado directamente al inventario.
- [x] Catálogo público compartible por URL.
- [ ] Compartir comprobantes/cotizaciones por WhatsApp.

### P1 — Integración
- [ ] Catálogo → pedido → reserva de stock.
- [ ] Venta → descuento de stock → caja → CRM.
- [ ] Compra → costo → margen → reposición.
- [x] Auditoría de movimientos críticos existente y preservada.
- [ ] Multiusuario, roles y permisos operativos end-to-end.

### P2 — Diferenciación Nüva
- [x] Nüva Score existente.
- [x] Nüva Intelligence existente.
- [ ] Predicción de demanda, quiebres y flujo de caja.
- [ ] Detección de anomalías.
- [ ] Recomendaciones de precio, compra, cobranza y clientes.
- [ ] Simulación de escenarios.
- [ ] Acciones asistidas/automatizadas con confirmación del usuario.

## Implementado en esta fase

La rama `feat/competitive-treinta-core` incorpora el hub operativo del dashboard y el catálogo como extensión directa del inventario. También añade un storefront público seguro mediante `get_public_catalog(slug)`, que expone únicamente información comercial necesaria y calcula disponibilidad descontando stock reservado/bloqueado. La publicación depende de `businesses.public_enabled` y `public_slug`.

La prueba de base de datos confirmó el RPC con un negocio público de prueba y devolvió productos/precios/disponibilidad sin exponer costos.

## Control de calidad

El revisor autónomo falló antes de ejecutar por una referencia inexistente de `google-github-actions/run-gemini-cli`. Esa referencia fue sustituida por una versión resoluble en el workflow. El cambio no se interpreta como fallo del producto.

## Regla competitiva

Treinta y otros gestores SMB sirven como referencia de **simplicidad operacional**, no como especificación para copiar. Nüva One implementa patrones de producto probados sin copiar código, textos, marca, diseño propietario ni implementación específica de terceros.
