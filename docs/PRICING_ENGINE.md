# Nüva One — Pricing Engine

## Objetivo

El módulo `pricing-calculator` calcula un precio sostenible combinando costos, margen, punto de equilibrio, competencia, valor percibido y escenarios. No trata el costo como el único determinante del precio.

## Fórmulas base

- Costo ajustado por merma: `costo / (1 - merma)`.
- Costo variable unitario: costos variables ajustados + asignación ABC por unidad.
- Costo completo unitario: costo variable unitario + costos fijos asignados por volumen.
- Piso operativo: `CV / (1 - comisiones_porcentuales)`.
- Piso económico: `CT / (1 - comisiones_porcentuales)`.
- Precio objetivo con margen: `CT / (1 - comisiones - margen_objetivo)`.
- Margen de contribución: `precio * (1 - comisiones) - costo_variable`.
- Punto de equilibrio: `costos_fijos / margen_contribución_unitario`.

Las comisiones porcentuales incluyen pasarela, vendedor, marketplace, devoluciones esperadas y garantías esperadas.

## Modelo de recomendación

El motor pondera el precio objetivo por costos, la mediana de precios competitivos y el techo de valor económico. La diferenciación aumenta el peso de mercado; el valor percibido aumenta el peso del componente de valor. El precio nunca se recomienda por debajo del piso económico.

El `confidenceScore` indica la calidad de la información disponible; no representa una probabilidad estadística.

## IVA Chile

El motor trabaja económicamente con precios netos y mantiene IVA como capa de presentación. La tasa por defecto de la UI es 19%, configurable para casos especiales. El IVA recuperable no debe modelarse como costo económico cuando corresponda crédito fiscal; su tratamiento definitivo depende de la situación tributaria del contribuyente.

## Tipos de negocio

- `manufactured`: materiales, MOD, merma, actividades productivas y costos indirectos.
- `resale`: costo de adquisición/landed cost, logística, comisiones e inventario.
- `service`: horas facturables, costo hora y tiempo del dueño.
- `digital`: costos de plataforma, adquisición, soporte y bajo costo marginal.

## Seguridad y multi-tenancy

Los cálculos se almacenan en `public.pricing_calculations` con `business_id`. RLS limita lectura a miembros del negocio y escritura a owner/admin/staff. El `calculation_version` permite auditar cambios futuros del motor.

## Integraciones futuras

1. Seleccionar un producto de Inventario y precargar costo/precio.
2. En Cotizaciones, mostrar margen estimado antes de enviar.
3. Comparar precio real vs. precio recomendado después de cada venta.
4. Incorporar series históricas para estimar elasticidad y estacionalidad.
5. Alimentar el Asistente IA con el resultado y las advertencias del motor.
