# Roadmap de investigación y desarrollo — Nüva One Business Operating System

**Fecha de corte:** 13 de noviembre de 2026.  
**Estado:** roadmap propuesto, sujeto a gates de revisión. No autoriza despliegues ni migraciones productivas.

## 1. Objetivo

Consolidar las plantillas sectoriales y capacidades transversales en una arquitectura común, verificable y escalable. Evitar construir 23 aplicaciones distintas o habilitar capacidades que no existen end-to-end.

## 2. Fases

### Fase 0 — Congelar el mapa y proteger el trabajo existente
- Confirmar el HEAD y dependencia de PR #318/#321.
- Conservar IDs y contratos actuales.
- Inventariar rutas, módulos, tablas, RPCs, permisos, tests y readiness.
- Registrar límites de producto y capacidades planificadas.
- Evitar merge/deploy/migración mientras se amplía investigación.

**Salida:** auditoría de reutilización, catálogo maestro y decisiones registradas.

### Fase 1 — Certificar los primeros verticales
Orden de validación inicial:
1. Almacén/minimarket.
2. Ferretería/materiales.
3. Distribuidora/mayorista.
4. Ropa/calzado.
5. Taller mecánico/repuestos.
6. Restaurante/cafetería.
7. Servicios profesionales/agencias.

Por cada vertical:
- entrevistas/casos de uso;
- ficha operativa;
- catálogo y entidades;
- workflows y excepciones;
- KPIs;
- roles;
- documentos;
- obligaciones;
- pruebas Golden Business;
- aprobación y versión.

La prioridad comercial debe revisarse con evidencia de mercado y entrevistas, no solo por intuición.

### Fase 2 — Fortalecer el núcleo común
- Importación/exportación robusta.
- Catálogo, clientes y proveedores.
- Rentabilidad y costeo con fórmulas trazables.
- Cuentas por cobrar/pagar y caja proyectada.
- Tareas y alertas con estados claros.
- Auditoría y permisos.
- Salud de integraciones.

### Fase 3 — Capacidades verticales reutilizables
Orden técnico orientativo:
1. Unidades y conversiones por producto.
2. Variantes y matrices.
3. Lotes, vencimientos y FEFO.
4. Series y garantías.
5. Multi-bodega y transferencias.
6. Recetas/BOM y costeo.
7. Órdenes de producción.
8. Agenda y reservas.
9. Órdenes de trabajo.
10. Proyectos, flota y activos.

Cada capacidad requiere modelo tenant-safe, transacciones, idempotencia, concurrencia y pruebas de regresión.

### Fase 4 — Inteligencia y automatización
- Catálogo gobernado de métricas.
- Diagnóstico y detección de anomalías.
- Pronósticos con intervalos/confianza y calidad de datos.
- Recomendaciones con evidencia.
- Centro de tareas.
- Workflows idempotentes con aprobaciones.
- Verificación del resultado e impacto.
- Inngest puede evaluarse como orquestador de ejecuciones durables; PostgreSQL/Nüva conserva la fuente de verdad.

### Fase 5 — Relación con clientes y ecosistema
- CRM Customer 360.
- Fidelización y campañas con consentimiento.
- Portal de clientes.
- Postventa, garantías y reclamos.
- API/webhooks.
- Integraciones DTE, pagos, bancos y comercio digital.
- Finanzas Abiertas según cronograma y participantes habilitados.

### Fase 6 — Escala y madurez
- People/turnos con alcance legal revisado.
- Academia contextual.
- Oportunidades Sercotec/Corfo verificadas.
- Simulador de expansión.
- Benchmark anonimizado solo con cohorte suficiente, controles técnicos y revisión legal.
- Nüva Impact Score con metodología publicada.

## 3. Gates por capacidad

Una capacidad solo avanza:
- research → especificación → prototipo → implementación → pruebas → piloto → available.
- Los estados deben ser observables y auditables.
- El onboarding no puede saltar fases.
- No presentar piloto como función general.
- No presentar una recomendación como acción ejecutada.

## 4. Gates técnicos obligatorios

- TypeScript/build/tests/lint conforme a baseline del repositorio.
- Migraciones verificadas y pgTAP.
- Pruebas multi-tenant y RLS.
- Concurrencia/idempotencia para operaciones críticas.
- Tests de rollback y recovery.
- QA autenticado y móvil.
- Revisión independiente en cambios financieros/seguridad.
- Preview única del SHA final y verificación exacta.
- Producción solo con autorización explícita y plan de recuperación.

## 5. Métricas de éxito

### Adopción
- Tiempo desde registro hasta primera operación real.
- Porcentaje de onboarding completado.
- Porcentaje de plantilla confirmada sin asistencia.
- Activación y uso semanal por capacidad.

### Operación
- Tasa de ventas/pedidos fallidos.
- Quiebres, mermas y ajustes.
- Tiempo de ciclo de compra, despacho y servicio.
- Cierre y conciliación de caja.

### Finanzas
- Margen bruto con costeo definido.
- DSO y antigüedad de cuentas por cobrar.
- Exactitud del forecast de caja.
- Variación entre costo estándar y real.

### Inteligencia
- Alertas útiles vs. descartadas.
- Recomendaciones aceptadas.
- Acciones ejecutadas y verificadas.
- Falsos positivos y reversión.

### Impacto
- Tiempo ahorrado medido.
- Ahorro/cobro recuperado verificado.
- Reducción de pérdida/merma.
- Retención de clientes con cohortes comparables.

## 6. Primer sprint concreto

1. Revisar el catálogo de 23 IDs y detectar agrupaciones incorrectas.
2. Completar ficha maestra minimarket.
3. Completar ficha maestra ferretería.
4. Completar ficha maestra distribuidora.
5. Definir modelo de capacidades y readiness, alineado con la implementación existente.
6. Crear matriz de Golden Business y casos de prueba.
7. Preparar lista de brechas de código sin tocar producción.
8. Revisar con evidencia si las PR #318/#321 deben actualizarse, consolidarse o mantenerse como base.

## 7. Criterio de salida del sprint

No se declara terminado por documentos creados. Se considera listo para implementación cuando:
- Cada ficha P0 está completa y revisada.
- Las reglas no contradicen el modelo de datos.
- Cada capacidad está mapeada a código existente o issue específico.
- Los indicadores tienen fórmula y fuente.
- Las excepciones están descritas.
- La suite de simulación es ejecutable.
- Las brechas están priorizadas con riesgos y dependencias.
