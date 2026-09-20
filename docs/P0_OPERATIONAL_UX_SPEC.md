# P0 — Operación rápida Nüva One

## Objetivo

Reducir una operación frecuente a pocos pasos sin duplicar información ni sacrificar controles de stock, permisos o trazabilidad.

## Venta rápida

1. Buscar producto por nombre o SKU.
2. Seleccionar cantidad.
3. Vincular cliente opcionalmente.
4. Elegir medio de pago.
5. Confirmar.

El precio debe provenir del producto salvo que el usuario tenga permiso explícito para aplicar un ajuste. El total debe calcularse en el cliente para feedback inmediato, pero la persistencia y cualquier mutación de stock deben validarse en servidor.

## Reglas de stock

- Nunca confiar en el stock enviado por el navegador.
- Una venta confirmada debe impedir overselling bajo concurrencia.
- Las reservas deben distinguirse del stock físico.
- Stock disponible = físico − reservado − bloqueado.
- Cancelaciones/devoluciones deben revertir exactamente el efecto de la operación original.

## Cadena de datos

Venta → detalle de venta → movimiento de stock → transacción/caja → cliente/CRM → métricas → Nüva Intelligence.

## UX

- Desktop: teclado y búsqueda rápida.
- Mobile: controles grandes y resumen fijo de la operación.
- Estados claros: guardando, confirmado, error recuperable.
- No perder el carrito ante un error de validación.
- Confirmaciones y errores en español.

## Próxima implementación

Priorizar el endpoint/transacción server-side que atomice la confirmación de venta con sus efectos secundarios. No reemplazar tablas existentes sin migración y pruebas de regresión.
