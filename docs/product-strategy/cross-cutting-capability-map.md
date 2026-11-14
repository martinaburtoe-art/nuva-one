# Mapa maestro de capacidades transversales de Nüva One

**Estado:** propuesta de producto y priorización inicial.  
**Fecha de corte:** 13 de noviembre de 2026.

## 1. Regla

Una capacidad transversal se implementa una vez y se reutiliza en las plantillas que la necesitan. No crear un módulo por cada vertical si el comportamiento puede resolverse con una capacidad compartida, con esquemas y reglas sectoriales explícitas.

Prioridad:
- **P0 — fundacional:** seguridad, integridad, trazabilidad, operación core y modelo común.
- **P1 — ventaja operativa:** alto valor transversal, una vez estabilizado el núcleo.
- **P2 — expansión:** nuevos canales, integraciones y verticales complejos.
- **R — investigación:** requiere validar demanda, regulación, coste o viabilidad.

Estado de implementación siempre debe consultarse en el registro de readiness del código. Esta matriz no habilita funciones.

## 2. Mapa

| Dominio/capacidad | Beneficio para cliente | Verticales | Prioridad | Dependencias/controles |
|---|---|---|---|---|
| Importación asistida Excel/CSV | Migrar sin recapturar | Todos | P1 | Vista previa, mapeo, deduplicación, validación y rollback |
| Exportación y portabilidad | Control sobre datos | Todos | P0 | Exportaciones por tenant, formatos abiertos, autorización |
| Multiempresa/multisucursal | Administrar varias operaciones | Todos | P0 | Aislamiento, consolidación explícita y permisos |
| Auditoría unificada | Saber quién cambió qué | Todos | P0 | Eventos append-only, actor, tenant, objeto, motivo |
| Continuidad/offline selectiva | Seguir trabajando ante cortes | Retail/POS y campo | P1 | Outbox, idempotencia, conflictos, no cachear datos sensibles |
| Salud de integraciones | Detectar sincronizaciones fallidas | Todos con conectores | P1 | Reintentos, DLQ, reconciliación y alertas |
| Finanzas y caja proyectada | Evitar déficit y decisiones tardías | Todos | P0 | Fuente de datos reconciliada; previsión con confianza |
| Rentabilidad por unidad de negocio | Saber qué deja dinero | Todos | P0 | Costeo y asignación de costos documentados |
| Cuentas por cobrar/pagar | Mejorar liquidez | B2B, mayoristas, servicios | P1 | Antigüedad, conciliación, permisos |
| Compras y proveedor | Reducir costo y faltantes | Comercio, producción, logística | P1 | Historial, lead time, MOQ, condiciones y calidad |
| Forecast demanda | Reponer mejor | Retail, alimentos, distribución | P1 | Estacionalidad, promociones, stockout censoring |
| Reposición sugerida | Evitar quiebres y sobrestock | Inventario | P1 | No ordenar automáticamente sin aprobación |
| CRM/Customer 360 | Retener y vender mejor | Todos | P1 | Consentimiento, calidad de identidad, no inferir sensibilidad |
| Segmentación/recurrencia | Campañas relevantes | Retail y servicios | P1 | Base legal, preferencias, opt-out y límites |
| Fidelización | Recompra y referidos | Retail, gastronomía, servicios | P2 | Pasivos, reglas de puntos, fraude y vencimientos |
| Portal de clientes | Autoservicio y ventas | B2B/B2C | P2 | Identidad externa, alcance de datos, DTE y pagos |
| Cotización→pedido→venta | Menos fricción comercial | B2B, ferretería, talleres | P1 | Estados, expiración, conversión idempotente |
| Postventa/casos/garantías | Resolver problemas y retener | Retail, electrónica, talleres | P1 | SLA, trazabilidad, normativa consumidor |
| Automatización de workflows | Reducir tareas repetitivas | Todos | P1 | Trigger/event, idempotencia, approvals, límites, auditoría |
| Centro de tareas | Convertir alertas en ejecución | Todos | P1 | Asignación, vencimiento, evidencia, escalamiento |
| Gestión documental | Centralizar respaldos | Todos | P1 | Retención, acceso, versionado, antivirus y firma si aplica |
| Personas/turnos | Organizar equipo | Retail, servicios, producción | P2 | Datos laborales sensibles y reglas DT |
| Academia contextual | Ayudar al usuario a aprender | Todos | P2 | Contenido revisado, accesibilidad y progreso |
| Objetivos y presupuestos | Planificar y medir | Todos | P2 | Definiciones KPI y ownership |
| Simulador expansión | Evaluar nueva sucursal/inversión | Comercio y servicios | P2 | Escenarios, supuestos editables, no promesa financiera |
| Benchmark sectorial | Compararse con pares | Todos | R | Cohortes suficientes, anonimización y revisión legal |
| Ecosistema de oportunidades | Encontrar apoyos/convocatorias | Pymes Chile | P2 | Elegibilidad verificada, vigencia y fuentes oficiales |
| Nüva Impact | Medir valor recibido | Todos | P1 | Línea base, atribución, metodología, transparencia |
| Alertas de riesgo y anomalías | Detectar desvíos | Todos | P1 | Umbrales, falsos positivos, explicación |
| Asistente IA contextual | Consultar datos y procedimientos | Todos | P1 | RAG por tenant, ACL en servidor, fuente, no ejecución libre |
| Recomendación→acción | Ejecutar acciones verificadas | Todos | P1 | Herramientas allowlisted, aprobación, preview, rollback |
| API y webhooks | Extender plataforma | Todos | P2 | Auth, rate limits, versionado, replay protection |
| Conectores de pago | Cobrar y conciliar | Todos | P0/P1 | Idempotencia financiera, webhook firmado, recovery |
| DTE/SII | Integrar operación tributaria | Según giro | P1 | Certificación/autorización y vigencia normativa |
| Finanzas Abiertas | Conciliar cuentas autorizadas | Todos elegibles | P2/R | CMF, consentimiento, participantes autorizados |
| Seguridad de sesión/MFA | Proteger acceso | Todos | P0 | Riesgo, recuperación, logs, revocación |
| Backup/restore drills | Recuperar operación | Todos | P0 | RPO/RTO, cifrado, pruebas periódicas |

## 3. Capacidades de IA: niveles de autonomía

| Nivel | Comportamiento | Ejemplos | Política |
|---|---|---|---|
| A0 | Solo consulta/explica | Responder qué significa el margen | Puede responder con fuentes |
| A1 | Recomienda | Sugerir revisar precio | Explica evidencia y confianza |
| A2 | Prepara borrador | Crear borrador de compra/cobranza | No produce efecto externo |
| A3 | Ejecuta tras aprobación | Enviar pedido, registrar ajuste autorizado | Confirmación explícita y auditoría |
| A4 | Automatización acotada | Alertas o tareas reversibles | Reglas previas, límites, kill switch |
| Prohibido por defecto | Acción irreversible/sensible sin control | Cobrar, borrar, cambiar remuneración o DTE | Requiere diseño y autorización específica |

La IA no debe inventar hechos, escribir directamente a tablas de negocio ni saltarse permisos. Todas las operaciones pasan por servicios y RPCs transaccionales existentes o nuevos, con controles server-side.

## 4. Motor de automatización: contrato mínimo

Cada workflow debe declarar:
- ID/version.
- Tenant y ámbito.
- Evento disparador.
- Predicados tipados.
- Acción permitida.
- Requisitos de aprobación.
- Clave de idempotencia.
- Límite de frecuencia y concurrencia.
- Timeout/retry policy.
- Cola de fallos y reanudación.
- Auditoría de entrada/decisión/resultado.
- Mecanismo de desactivación.
- Pruebas de duplicación, orden y replay.

Separar eventos de dominio, ejecución de workflows y efectos financieros. La cola de trabajos no es fuente de verdad del estado del negocio.

## 5. Priorización de primera ola

1. Estabilizar y certificar perfiles/plantillas heredados.
2. Completar mapa de integridad de ventas, compras, inventario, pagos y caja.
3. Importación/exportación con validación.
4. Finanzas y rentabilidad con definiciones consistentes.
5. Centro de tareas y alertas accionables.
6. CRM/retención.
7. Automatizaciones reversibles y aprobadas.
8. Importantes integraciones externas según coste/beneficio y madurez.

## 6. KPIs de impacto del producto

No sumar impactos que se solapan. Registrar por separado:
- Tiempo ahorrado estimado vs. medido.
- Quiebres por período y denominador de días/productos disponibles.
- Merma por valor/cantidad y causa.
- Margen con método de costeo.
- Cobros recuperados con comprobante.
- Retención con cohorte y ventana.
- Automatizaciones ejecutadas, fallidas y revertidas.
- Recomendaciones aceptadas y resultado observado.

