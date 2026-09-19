# Nüva One — Competitive Product Roadmap

## Objetivo

Convertir Nüva One en un sistema operativo para pymes: operaciones simples como un POS/gestor SMB, pero con inteligencia que explica, recomienda y conecta acciones entre módulos.

## Principios

1. **Operación en segundos:** registrar una venta, gasto, producto, cliente o cotización debe requerir el mínimo de pasos.
2. **Dato único:** ventas, inventario, caja, CRM, compras y cotizaciones deben reutilizar el mismo contexto.
3. **Trazabilidad:** cambios críticos de stock, precios, caja y documentos deben poder auditarse.
4. **Inteligencia accionable:** no limitarse a mostrar KPIs; explicar variaciones y proponer acciones.
5. **WhatsApp como canal comercial:** compartir catálogo, comprobantes, cotizaciones y cobranza sin duplicar datos.
6. **Mobile-first:** las operaciones frecuentes deben funcionar especialmente bien en teléfono.

## Backlog competitivo

### P0 — Operación
- Venta rápida y flujo POS consistente.
- Inventario con variantes, stock crítico y reposición.
- Caja y gastos conectados a ventas.
- Clientes, proveedores y cuentas por cobrar.
- Cotización → pedido → venta.
- Catálogo conectado directamente al inventario.
- Compartir por WhatsApp.

### P1 — Integración
- Catálogo → pedido → reserva de stock.
- Venta → descuento de stock → caja → CRM.
- Compra → costo → margen → reposición.
- Auditoría de movimientos y cambios críticos.
- Multiusuario, roles y permisos operativos.

### P2 — Diferenciación Nüva
- Nüva Score.
- Nüva Intelligence.
- Predicción de demanda, quiebres y flujo de caja.
- Detección de anomalías.
- Recomendaciones de precio, compra, cobranza y clientes.
- Simulación de escenarios.
- Acciones asistidas/automatizadas con confirmación del usuario.

## Regla competitiva

Treinta y otros gestores SMB sirven como referencia de **simplicidad operacional**, no como especificación para copiar. Nüva One debe implementar patrones de producto probados sin copiar código, textos, marca, diseño propietario ni implementación específica de terceros.

## Primera entrega implementada

La rama `feat/competitive-treinta-core` incorpora un hub operativo en el dashboard para acceso directo a Nueva venta, Agregar producto, Nueva cotización, Nuevo cliente y Nüva Intelligence. El objetivo es reducir fricción y hacer visible la conexión entre operación e inteligencia antes de abordar cambios de mayor impacto en datos o flujos transaccionales.
