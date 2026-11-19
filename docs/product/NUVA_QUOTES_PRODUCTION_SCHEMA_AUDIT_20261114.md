# Nüva One — auditoría de producción del módulo Cotizaciones

**Fecha:** 14-11-2026  
**Método:** consultas de solo lectura a Supabase de producción + revisión del repositorio/migraciones.  
**Resultado:** WARN / requiere reconciliación antes de desplegar cambios.  
**Cambios en producción:** ninguno. No se ejecutaron DDL, escrituras, RPC de conversión ni cambios de datos.

## 1. Esquema de producción frente a la aplicación

La inspección de `information_schema.columns` confirmó que la tabla `public.quotes` contiene:
`id, business_id, customer_id, customer_name, status, subtotal, tax, total, notes, items, valid_until, created_at, sent_at, discount_pct, terms`.

**No existe `quote_number` en la tabla de producción consultada.** La interfaz de repositorio intenta renderizar `q.quote_number`, y `supabase/migrations/20260802140000_quotes_premium.sql` añade esa columna y una numeración correlativa por negocio. La migración no aparece en el historial de migraciones de producción.

El historial remoto incluye `quotes_discount_terms_validation`, pero no registra `quotes_premium`, `unique_sale_quote_link` ni `secure_quote_conversion` con esos nombres/versiones. Debe reconciliarse la diferencia entre historial, archivos SQL y esquema instalado; no ejecutar una migración a ciegas.

## 2. Inconsistencia financiera en registros existentes

La consulta de solo lectura sobre los seis registros existentes mostró:
- Los importes guardados de `tax` y `total` son consistentes con aplicar aproximadamente 19 % sobre el subtotal bruto y sumar subtotal + impuesto.
- En los tres registros con descuento, el descuento no aparece reflejado en los importes persistidos observados: `total` sigue coincidiendo con `subtotal + tax`.
- La interfaz actual calcula el impuesto después del descuento y resta el descuento del subtotal antes de sumar el impuesto.
- El texto de condiciones por defecto dice “IVA incluido”, mientras que el cálculo de UI agrega el 19 % sobre el precio introducido.

Esto confirma que no se puede cambiar el motor de cálculo ni reinterpretar cotizaciones históricas sin una estrategia de compatibilidad. Antes de migrar, se necesita determinar si los importes actuales son netos o brutos, cómo se aplicó el descuento y qué registros son demo/operativos. No se deben reescribir montos históricos con una fórmula asumida.

## 3. RPC de conversión: discrepancia crítica

La definición de `public.convert_quote_to_sale(uuid)` instalada en producción fue leída mediante `pg_get_functiondef`.

En el cuerpo observado, el `INSERT INTO public.sales` declara 16 columnas:
`business_id, customer_id, customer_name, channel, payment_method, status, total, notes, sale_date, items, quote_id, stock_applied, is_credit, due_date, paid_amount, pos_reference`.

El bloque `VALUES` observado contiene 15 expresiones y no aporta un valor explícito para la columna `status`. Tal como está definida, esta discrepancia es incompatible con el número de columnas objetivo y puede hacer fallar la conversión. **No se ejecutó la RPC para probarlo**, porque sería una operación de escritura en producción.

Además, la función observada no debe considerarse una conversión comercial correcta hasta verificar:
- estado de venta que se crea;
- `paid_amount` y `payment_method` coherentes con un cobro real;
- `tax_treatment` y `vat_rate` heredados de la oferta;
- efectos de stock y contabilidad;
- idempotencia real y constraint única de `sales.quote_id`;
- rol y aislamiento de tenant en el contexto efectivo de ejecución.

Una cotización aceptada no equivale a una venta cobrada. El flujo no puede crear una venta `paid` ni declarar pago completo sin evidencia de pago.

## 4. Datos de perfil disponibles

Campos de negocio confirmados:
- `name`, `tax_id`, `giro`, `address`, `comuna`;
- `public_contact_email`, `public_contact_phone`;
- `logo_url`.

Campos de cliente confirmados:
- `name`, `tax_id`, `address`, `email`, `phone`;
- `shipping_comuna`, `shipping_city`, `shipping_region`, `shipping_postal_code`;
- `shipping_contact_name`.

Por tanto, la primera versión de PDF/preview puede mejorar la identidad del emisor y destinatario sin inventar columnas. Debe mostrar solo datos existentes y no vacíos.

## 5. Seguridad y alcance

La tabla `quotes` está habilitada con RLS y tiene política de acceso de miembros al negocio en el esquema base. La función instalada se inspeccionó, no se ejecutó. No se han hecho cambios de RLS. Cualquier cambio futuro debe respetar `business_id`, roles y reglas de autorización existentes.

## 6. Decisiones obligatorias antes de implementación

1. Reconciliar el historial de migraciones remotas con los archivos del repo, en particular la numeración premium.
2. Determinar semántica de precio y descuento de datos históricos. Preservar registros.
3. Definir contrato explícito de cálculo para cotizaciones nuevas: precio neto/bruto, tratamiento IVA por línea, descuento y redondeo.
4. Reparar y probar conversión en una rama/entorno aislado antes de tocar producción.
5. Confirmar que la conversión no marca pagos ficticios ni dispara efectos contables/stock incorrectos.
6. Sincronizar tipos TypeScript con esquema real una vez resuelta la migración.
7. Implementar preview y PDF a partir del mismo modelo de documento.

## 7. Estado de evidencia

| Control | Estado | Evidencia |
|---|---|---|
| Columnas de quotes | PASS | information_schema de producción |
| quote_number presente en producción | FAIL | columna no encontrada |
| historial contiene migración quotes premium | FAIL | list_migrations remoto |
| importes históricos reflejan descuento | WARN/FAIL | consulta agregada de registros; no reescribir |
| RPC de conversión bien formada | FAIL potencial | 16 columnas vs 15 valores; no ejecutada |
| RPC probada end-to-end | UNKNOWN | no se ejecutó escritura en producción |
| RLS modificado | NO | ninguna modificación |
| datos de producción modificados | NO | consultas SELECT únicamente |

**Regla de publicación:** no desplegar cambios de cotizaciones ni ejecutar migraciones en producción hasta cerrar los puntos 1–6 y ejecutar pruebas de integración en entorno aislado.
