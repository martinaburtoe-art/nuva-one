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
- [x] Venta rápida y flujo POS consistente (RPC transaccional, control de stock disponible y UI).
- [ ] Inventario con variantes; [x] stock crítico/reorden base y control de disponibilidad.
- [x] Caja/gastos conectados a ventas y costos mediante triggers/ledger existentes.
- [x] Clientes, proveedores y cuentas por cobrar base; pagos y recordatorios existentes.
- [ ] Cotización → pedido → venta.
- [x] Catálogo conectado directamente al inventario.
- [x] Catálogo público compartible por URL.
- [x] Compartir catálogo por WhatsApp y consultas de producto; comprobante/cotización por WhatsApp pendiente.

### P1 — Integración
- [ ] Catálogo → pedido → reserva de stock.
- [x] Venta → descuento de stock → caja/ledger → CRM base.
- [x] Compra → stock/costo/caja/contabilidad; [ ] margen y reposición inteligente end-to-end.
- [x] Auditoría de movimientos críticos existente y preservada.
- [ ] Multiusuario, roles y permisos operativos end-to-end.

### P2 — Diferenciación Nüva
- [x] Nüva Score existente.
- [x] Nüva Intelligence existente.
- [ ] Predicción de demanda, quiebres y flujo de caja (bases de datos disponibles; modelo accionable pendiente).
- [ ] Detección de anomalías.
- [ ] Recomendaciones de precio, compra, cobranza y clientes (Nüva Intelligence/Score existentes; acciones específicas pendientes).
- [ ] Simulación de escenarios.
- [ ] Acciones asistidas/automatizadas con confirmación del usuario.

## Implementado en esta fase

La rama `feat/competitive-treinta-core` incorpora el hub operativo del dashboard y el catálogo como extensión directa del inventario. También añade un storefront público seguro mediante `get_public_catalog(slug)`, que expone únicamente información comercial necesaria y calcula disponibilidad descontando stock reservado/bloqueado. La publicación depende de `businesses.public_enabled` y `public_slug`.

La prueba de base de datos confirmó el RPC con un negocio público de prueba y devolvió productos/precios/disponibilidad sin exponer costos.

## Control de calidad

El revisor autónomo falló antes de ejecutar por una referencia inexistente de `google-github-actions/run-gemini-cli`. Esa referencia fue sustituida por una versión resoluble en el workflow. El cambio no se interpreta como fallo del producto.

## Regla competitiva

Treinta y otros gestores SMB sirven como referencia de **simplicidad operacional**, no como especificación para copiar. Nüva One implementa patrones de producto probados sin copiar código, textos, marca, diseño propietario ni implementación específica de terceros.


## Investigación competitiva — septiembre 2026

La revisión de fuentes públicas actuales de Treinta confirma como patrones operacionales relevantes: registro de ventas/gastos en segundos, inventario en tiempo real con alertas y variantes, catálogo compartible, estadísticas/reportes, control de clientes/proveedores, ventas a crédito, comprobantes compartibles por WhatsApp, descuentos y gestión de empleados. Nüva One ya cubre varias bases con una arquitectura financiera/contable más profunda; esta hoja de ruta prioriza cerrar las brechas operacionales sin copiar implementación, textos ni diseño propietario. Fuentes revisadas: Treinta Web/App Store/Google Play.