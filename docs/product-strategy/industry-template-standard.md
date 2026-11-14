# Estándar oficial de plantillas verticales Nüva One

**Estado:** contrato de diseño propuesto; no implica que todas las capacidades estén implementadas.  
**Fecha:** 13 de noviembre de 2026.

## 1. Definición

Una plantilla vertical es una definición declarativa, versionada, validada y certificable del modelo operativo de un tipo de negocio. Es compartida por todas las empresas clasificadas en ese modelo.

La plantilla define:
- Problema y alcance del vertical.
- Actividades típicas y límites del modelo.
- Catálogo y estructura de datos.
- Flujos, estados y transiciones.
- Capacidades necesarias y opcionales.
- Roles operativos y responsabilidades.
- Formularios, campos y validaciones.
- Indicadores y fórmulas.
- Alertas y reglas.
- Documentos y reportes.
- Terminología y navegación.
- Requisitos sectoriales que deben verificarse.
- Pruebas de certificación.

## 2. No clasificar solo por nombre del rubro

La clasificación debe considerar cuatro dimensiones:

1. **Actividad:** qué vende, produce, arrienda o presta.
2. **Modelo de ingreso:** venta unitaria, por peso, por hora, por proyecto, por suscripción, por reserva, por volumen, por comisión.
3. **Modelo operativo:** compra-reventa, distribución, transformación/producción, prestación, reparación, proyecto, logística o alojamiento.
4. **Objetos operativos críticos:** SKU/variantes, lotes, series, recetas, activos, vehículos, citas, órdenes, obras, habitaciones, contratos.

Una actividad económica SII no es una plantilla. El catálogo SII sirve como referencia de actividad legal y estadística, no como fuente única del diseño operacional.

## 3. Estructura lógica de una plantilla

Contrato conceptual; los nombres y tipos finales deben alinearse con el código y persistencia existentes antes de implementarse.

```ts
type TemplateManifest = {
  id: string;                 // slug estable e inmutable
  version: number;            // versión semántica/entera controlada
  status: "draft" | "certified" | "deprecated";
  family: string;
  displayName: string;
  description: string;
  operatingModel: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  unavailableCapabilities: string[];
  catalogSchemaRef: string;
  workflows: WorkflowManifest[];
  roles: RoleManifest[];
  dashboardRef: string;
  kpiRefs: string[];
  alertRefs: string[];
  documentRefs: string[];
  onboardingSchemaRef: string;
  regulatoryReferences: RegulatoryReference[];
  certificationSuiteRef: string;
};
```

No se recomienda almacenar código ejecutable, SQL o expresiones arbitrarias en JSON de configuración. El manifiesto selecciona componentes previamente registrados; no ejecuta lógica proporcionada por usuarios.

## 4. Capas de configuración

Orden determinista de composición:
1. Núcleo común de Nüva.
2. Defaults certificados de la plantilla.
3. Opciones explícitas admitidas por el esquema de esa versión.
4. Preferencias de la empresa que no alteren reglas críticas.
5. Entitlements y autorización, evaluados independientemente.
6. Readiness del producto, evaluado independientemente.

Si una capacidad está en estado planned o pilot, ninguna respuesta puede hacerla usable en producción. Una configuración inválida se rechaza completa o se presenta para corregir; no se persiste parcialmente en silencio.

## 5. Estados de capacidad

- **available:** implementación end-to-end demostrada, con pruebas y permisos correctos.
- **pilot:** disponible solo en piloto explícitamente autorizado y acotado.
- **planned:** definida pero no operativa.
- **deprecated:** no debe asignarse a nuevas empresas; requiere migración controlada para clientes existentes.

El catálogo de perfiles no es un catálogo de disponibilidad.

## 6. Onboarding estándar

1. Seleccionar actividad principal desde búsqueda de perfiles.
2. Identificar líneas secundarias (máximo y reglas según el catálogo actual; no duplicar la principal).
3. Resolver el modelo operativo con preguntas mínimas y explícitas.
4. Capturar canales de venta, unidades, sedes, volumen y procesos críticos.
5. Mostrar resumen de la plantilla y sus opciones.
6. Explicar qué capacidades están disponibles, planificadas o requieren integración.
7. Confirmar y guardar de forma idempotente.
8. Permitir revisión posterior en configuración, con autorización.
9. Mantener historial de versión y cambios.

Las respuestas deben ser explícitas. "No sé" y sin respuesta no equivalen a "no". No inferir permisos, giro SII, IVA, autorizaciones sanitarias ni capacidades no liberadas.

## 7. Cambio de plantilla

Cambio de perfil principal:
- No debe borrar transacciones ni datos maestros.
- Debe producir una vista previa de incompatibilidades.
- Debe conservar la plantilla anterior en auditoría.
- Debe requerir autorización del propietario/administrador habilitado.
- Debe ejecutar migraciones de configuración idempotentes y versionadas.
- Debe identificar qué datos requieren mapeo manual.
- No debe convertir unidades, estados o procesos automáticamente sin reglas explícitas.

## 8. Negocios mixtos

Permitir un perfil principal y perfiles secundarios, pero no fusionar plantillas en un grafo arbitrario. El perfil principal gobierna el dashboard y el proceso principal; los secundarios aportan capacidades compatibles y explícitamente permitidas. Resolver conflictos mediante precedencia declarada y validación, nunca por orden accidental de selección.

Cuando dos actividades tengan procesos incompatibles, deben modelarse como líneas de negocio/centros operativos separados dentro del mismo tenant, si el modelo de datos lo permite, o declararse como una limitación del producto.

## 9. Certificación de una plantilla

Una plantilla no puede pasar a certified hasta completar:
- Investigación con fuentes sectoriales y revisión de casos reales.
- Validación de catálogo, vocabulario y unidades.
- Modelo de datos y reglas.
- Pruebas de flujo feliz y excepciones.
- Simulación completa desde compra/entrada hasta venta/entrega/cobro/cierre.
- Pruebas multiusuario, multi-sucursal y aislamiento tenant.
- Pruebas de idempotencia, concurrencia, reversión y recuperación.
- Pruebas de permisos y auditoría.
- Validación de KPIs contra datos de referencia.
- Revisión de obligaciones sectoriales.
- Prueba de usabilidad con al menos un usuario representativo del vertical.
- Evidencia de build, tests, migraciones y preview del SHA exacto.

## 10. Versión y rollout

- Major: cambio incompatible de proceso, modelo de datos o contrato.
- Minor: capacidad opcional compatible o nuevo flujo no disruptivo.
- Patch: corrección de contenido, etiquetas o reglas compatible.

Una nueva versión no debe reescribir silenciosamente el perfil de clientes existentes. Debe existir estrategia de adopción, compatibilidad y rollback.

## 11. Catálogo base heredado

La base de código revisada en PR #318/#321 declara 23 IDs de perfil:
`hardware_store`, `neighborhood_grocery`, `beverage_store`, `produce_market`, `butcher_fishmonger`, `apparel_footwear`, `books_stationery_electronics`, `wholesale_distribution`, `restaurant_cafe`, `bakery_pastry`, `manufacturing_workshop`, `auto_repair_parts`, `agriculture_agroinputs`, `transport_logistics`, `construction_contractor`, `professional_services`, `beauty_wellness`, `veterinary_pet`, `lodging_tourism`, `equipment_rental`, `education_fitness`, `field_technical_service`, `general_business`.

No sustituir estos IDs ni crear una segunda lista paralela sin decisión de migración y compatibilidad. Las etiquetas pueden evolucionar; los IDs persistidos son contratos.

## 12. Criterios de diseño por plantilla

| Área | Pregunta que debe contestarse |
|---|---|
| Catálogo | ¿Qué es una unidad vendible/servicio/activo? |
| Medición | ¿Unidad, masa, longitud, área, volumen, tiempo o capacidad? |
| Identidad | ¿SKU, variante, lote, serie, patente, paciente, habitación, contrato? |
| Entrada | ¿Compra, reserva, recepción, cosecha, horas o materiales? |
| Transformación | ¿Receta, BOM, corte, reparación, prestación o ninguna? |
| Entrega | ¿Mostrador, despacho, cita, retiro, ruta, proyecto o estadía? |
| Cobro | ¿Inmediato, crédito, anticipo, hitos, suscripción o comisión? |
| Calidad | ¿Vencimiento, garantía, inspección, control clínico o checklist? |
| Personal | ¿Caja, vendedor, técnico, profesional, conductor, operador? |
| KPIs | ¿Qué indicadores cambian decisiones reales? |

