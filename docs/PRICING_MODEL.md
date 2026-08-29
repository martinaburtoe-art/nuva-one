# Nüva One — Modelo de Pricing SaaS

**Versión:** 1.0.0  
**Fecha:** 2026-08-29  
**Estado:** pricing operativo vigente para beta/primeros clientes

## 1. Decisión de pricing

Nüva One utiliza una arquitectura de dos planes pagados, con una entrada de bajo riesgo para una MiPyme y una capa Pro orientada a inteligencia, finanzas avanzadas y automatización.

| Plan | Precio mensual | Precio anual | Usuarios incluidos | IA/mes | Productos máx. | Almacenamiento |
|---|---:|---:|---:|---:|---:|---:|
| Nüva Start | $11.990 CLP | $119.900 CLP | 1 | 100 créditos | 500 | 2 GB |
| Nüva Pro | $27.990 CLP | $279.900 CLP | 3 | 500 créditos | 5.000 | 10 GB |

Los precios publicados son precios comerciales de referencia en CLP. La lógica de costos internos debe mantener separados los valores netos de los valores con IVA; el IVA chileno vigente es 19% y no debe confundirse con ingreso neto de Nüva.

## 2. Principios utilizados

El precio final no se determina solamente por costo. El modelo utiliza cuatro capas:

1. **Costo económico:** infraestructura, IA, email, almacenamiento, soporte variable y otros costos directamente atribuibles.
2. **Costeo ABC:** asignación del consumo real de recursos por tenant/cliente y por actividad.
3. **Unit economics/CVP:** margen de contribución, costos fijos y punto de equilibrio.
4. **Valor/mercado/demanda:** disposición a pagar, alternativas disponibles y valor económico entregado a la MiPyme.

La regla de decisión es: el costo define el piso; el mercado y el valor definen el rango; el margen objetivo define el precio operativo sostenible.

## 3. Fórmula de precio mínimo por margen

Cuando existe un costo variable unitario `C`, una tasa variable sobre ventas `k` y un margen de contribución objetivo `M`, el precio mínimo compatible con el objetivo es:

`P = C / (1 - k - M)`

Donde:

- `P` = precio comercial neto objetivo.
- `C` = costo variable asignable al cliente.
- `k` = comisiones/tasas variables expresadas como proporción del precio.
- `M` = margen de contribución objetivo.

El precio comercial no debe bajar del piso económico salvo decisión deliberada y documentada de adquisición/promoción.

## 4. Punto de equilibrio

Para un escenario mensual:

`Q = CF / [P(1-k) - CV]`

Donde:

- `Q` = clientes necesarios para cubrir costos fijos.
- `CF` = costos fijos mensuales.
- `P` = ingreso mensual por cliente.
- `k` = porcentaje de costos variables sobre ingresos.
- `CV` = costo variable mensual por cliente.

El análisis debe ejecutarse por plan y también sobre el mix esperado Start/Pro.

## 5. Costeo ABC de Nüva One

El costo asignable a un tenant debe agrupar al menos:

- compute y base de datos;
- almacenamiento;
- egress;
- requests/API;
- IA: input tokens, output tokens, modelo y proveedor;
- correo transaccional;
- procesamiento de pagos cuando corresponda;
- soporte variable;
- consumo de automatizaciones e integraciones externas.

La métrica clave para IA no es solamente "mensajes": Nüva debe registrar tokens de entrada/salida, modelo, proveedor, latencia y costo estimado por request.

## 6. Estructura de valor por plan

### Nüva Start

El Start monetiza el **control operacional**:

- dashboard;
- inventario/SKU;
- scanner;
- ventas/caja;
- clientes y CRM básico;
- cotizaciones;
- compras/entregas;
- Nüva Score básico;
- IA básica para consultas y explicaciones.

### Nüva Pro

El Pro monetiza el salto desde control a **inteligencia y decisión**:

- todo Start;
- Nüva Score avanzado;
- Nüva Radar;
- Nüva Copilot;
- IA empresarial avanzada;
- flujo de caja completo;
- estado de resultados;
- rentabilidad y proyecciones;
- alertas y automatizaciones;
- reportes avanzados;
- gestión tributaria organizada;
- exportaciones avanzadas.

## 7. Funcionalidades gratuitas transversales

**Perfil público y Red de Contactos no deben considerarse una feature premium.** Son funcionalidades de identidad, descubrimiento y networking del ecosistema Nüva y deben permanecer disponibles para cualquier usuario autenticado, independientemente del plan de su negocio.

Por tanto:

- no usar `plan === pro` para bloquear perfil público;
- no usar `advancedFinance`/`nuvaRadar` u otro feature comercial como proxy de acceso;
- el gating debe depender únicamente de autenticación/permisos de la función social cuando corresponda;
- las rutas públicas de perfiles/negocios deben respetar RLS y privacidad, pero no el plan comercial.

## 8. IA y límites

Los límites de IA son mecanismos de control de costo, no solamente mecanismos de monetización.

Start: 100 créditos/mensajes mensuales.  
Pro: 500 créditos/mensajes mensuales.

La arquitectura debe permitir:

- consumo por usuario y tenant;
- rate limiting;
- registro de uso;
- upgrade cuando se alcanza el límite;
- protección contra abuso;
- fallback de proveedor sin saltarse el límite comercial.

Si el costo por tenant se deteriora, la primera respuesta debe ser optimizar contexto/modelo/uso antes de aumentar precio de manera arbitraria.

## 9. Análisis de margen

La métrica operativa principal es:

`Margen de contribución = Ingreso neto - costos variables asignables`

Y:

`Margen de contribución % = Margen de contribución / Ingreso neto`

Para la beta, se recomienda monitorear mensualmente por plan:

- ARPU;
- costo variable medio por tenant;
- costo IA por tenant;
- costo IA / ingreso;
- margen de contribución;
- churn;
- conversión trial → pago;
- expansión por usuarios;
- consumo de almacenamiento/egress;
- costo de soporte por cliente.

## 10. Guardrails comerciales

No se debe permitir que un cliente de consumo extraordinario destruya el margen del plan por falta de límites técnicos.

Guardrails obligatorios:

1. límites de IA por plan;
2. límites de usuarios/productos/almacenamiento según configuración;
3. rate limits;
4. observabilidad de costo por tenant;
5. alertas de consumo anómalo;
6. upgrade path claro;
7. posibilidad de ajustar límites sin cambiar la arquitectura de billing.

## 11. Descuento anual

La configuración vigente de precio anual equivale aproximadamente a 10 meses pagados por 12 meses de servicio:

- Start: $119.900/año vs $143.880 si se pagara mensualmente durante 12 meses.
- Pro: $279.900/año vs $335.880 si se pagara mensualmente durante 12 meses.

Esto representa un descuento aproximado del 16,7% frente al precio mensual anualizado y favorece retención/caja anticipada sin convertir el plan mensual en una mala alternativa.

## 12. Regla de revisión

El pricing no debe cambiar por intuición aislada. Debe revisarse cuando exista evidencia suficiente de:

- costo variable real por tenant;
- uso de IA real;
- conversión del trial;
- churn;
- disposición a pagar;
- margen por plan;
- concentración de clientes intensivos;
- comportamiento de upgrades/downgrades.

Durante beta se prioriza aprendizaje y unit economics sobre maximización inmediata de ARPU.

## 13. Implementación técnica vigente

La fuente comercial central es `src/lib/plan-config.ts`.

El frontend de precios consume esa configuración y el sistema de features debe mantener el mismo contrato. No se deben duplicar precios o límites en múltiples rutas.

Cualquier cambio futuro debe actualizar primero la configuración central, luego billing/gating/UI y finalmente la documentación.

## 14. Decisión actual

**Pricing operativo para beta:**

- Nüva Start: **$11.990 CLP/mes**.
- Nüva Pro: **$27.990 CLP/mes**.
- Perfil público + Red de Contactos: **gratis para todo usuario autenticado**.

La estructura queda preparada para introducir un tercer nivel o add-ons únicamente cuando los datos de uso y unit economics de beta lo justifiquen.
