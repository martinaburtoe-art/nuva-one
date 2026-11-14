# Certificación P0 — Golden Businesses y matriz de capacidades

**Estado:** contrato de aceptación propuesto. Los escenarios son sintéticos; no representan clientes reales.
**Alcance:** `neighborhood_grocery`, `hardware_store`, `wholesale_distribution`.

## 1. Regla de certificación

Una plantilla se declara certificada únicamente cuando:
- El flujo completo está implementado en UI, servicios, persistencia y reportes.
- Las políticas de tenant/RLS y RBAC están verificadas.
- Los movimientos financieros y de inventario son atómicos e idempotentes.
- Los estados, reversas y errores están cubiertos.
- Las pruebas automatizadas y E2E pasan en CI.
- Se revisaron accesibilidad, móvil, carga, auditoría y recuperación.
- Existe evidencia reproducible vinculada a commit y entorno.
- No hay funciones simuladas ni indicadores que conviertan ausencia de datos en cero.

Una especificación escrita, un selector de perfil o un test unitario aislado no certifican una plantilla.

## 2. Matriz de capacidades: estado conservador

| Capacidad | Readiness observado en registry | Evidencia declarada por registry | Uso en P0 |
|---|---|---|---|
| Barcode | available | Registro de códigos y scanner móvil | Usable sujeto a E2E por SKU/tenant |
| Quotes | available | Módulo y flujo persistido de cotizaciones | Usable sujeto a prueba de conversión |
| Dispatch | available | Módulo shipments y eventos persistidos | Solo despacho básico; no agenda/rutas/POD avanzado |
| Customer history | available | CRM activity y customer records persistidos | Historial básico |
| Cash register | available | Caja, movimientos y controles de cierre | Usable sujeto a conciliación completa |
| Product variants | planned | Sin modelo tenant-safe familia/variante verificado | No activar |
| Fractional units | planned | products.stock es integer; ruta completa no verificada | No activar |
| Unit conversions | planned | Sin registro dimensional por SKU | No activar |
| Lots/expiry/FEFO | planned | Sin ciclo completo de lote/vencimiento/recall | No activar |
| Serial tracking | planned | Sin ciclo recepción/venta/devolución/reparación | No activar |
| Multi-warehouse | planned | Sin ownership y transferencias verificadas | No activar |
| Price lists | planned | Sin motor tenant-scoped por cliente | No activar |
| Volume pricing | planned | Sin motor completo cotización/POS | No activar |
| Dispatch scheduling | planned | Sin agenda/capacidad/rutas | No activar |
| Recipes/BOM | planned | Sin costeo y consumo verificado | No activar |
| Production orders | planned | Sin lifecycle de consumo/output/merma | No activar |
| Appointments | planned | Sin agenda y asignación de recursos | No activar |
| Work orders | planned | Sin lifecycle de mano de obra/repuestos | No activar |
| Projects | planned | Sin presupuesto/hitos/tiempo/costo | No activar |
| Fleet | planned | Sin ciclo vehículo/viaje/mantención | No activar |
| Asset rental | planned | Sin disponibilidad/contrato/devolución | No activar |
| Reservations | planned | Sin disponibilidad/check-in/cancelación | No activar |
| Commissions | planned | Sin cálculo/aprobación/liquidación | No activar |
| Returns/warranty | planned | Sin ciclo completo y trazabilidad | No activar |
| Credit accounts | planned | Sin límite, aging y cobranza | No activar |

La tabla refleja el registro de readiness existente en la rama de referencia consultada; debe actualizarse solo después de una revisión de código, esquema, RPC y pruebas. No es auditoría independiente de todos los módulos.

## 3. Matriz de trazabilidad que debe completarse antes de habilitar

Por capacidad, registrar:
- Perfil(es) que la requieren.
- Pantalla/ruta real.
- Servicio/hook/API real.
- Tabla/vista/RPC y claves tenant.
- Política RLS relevante.
- Eventos y auditoría.
- Operaciones de reversa/idempotencia.
- Test unitario/integración/E2E.
- Evidencia de CI y commit.
- Estado: `available`, `pilot`, `planned`, `blocked`, `deprecated`.

No basta encontrar un nombre de tabla o un botón. Debe existir un flujo persistido completo.

## 4. Fixture común de datos sintéticos

Todos los registros llevan prefijo `GB-` y un tenant aislado por escenario. Nunca usar datos de clientes reales.

### Fixture Minimarket — GB-ALMACEN-001
- Local: Almacén La Esquina.
- Usuarios: owner, manager, buyer, cashier-01, cashier-02.
- Catálogo: 600 SKU; 40 perecibles como metadata de prueba, sin activar lotes en producción.
- Proveedores: 8; clientes: 120.
- Caja: 2 cajas, 2 turnos/día.
- Casos: código duplicado, costo faltante, recepción parcial, reintento idempotente, cierre con diferencia, devolución, merma, vencimiento no soportado y permisos.

### Fixture Ferretería — GB-FERRE-001
- Local: Ferretería El Constructor.
- Usuarios: owner, manager, sales-01, warehouse-01, buyer.
- Catálogo: 2.500 SKU con familias y atributos de test.
- Cotizaciones: 25 con partidas de unidades variadas.
- Casos: SKU parecido, código ambiguo, conversión inexistente, cotización versionada, descuento, picking, entrega parcial y margen incompleto.

### Fixture Distribuidora — GB-DIST-001
- Local: Distribuidora Valle Centro.
- Usuarios: owner, sales-01/02/03, credit-01, warehouse-01/02, dispatch-01.
- Catálogo: 1.200 SKU; clientes B2B: 80.
- Casos: snapshot de precio, concurrencia de stock, pedido parcial, rechazo, saldo pendiente, cobranza parcial, tenant isolation y falta de costo logístico.

## 5. Contratos de prueba transversales

### Seguridad
- Toda lectura/escritura tenant-scoped valida tenant y autorización server-side.
- Probar usuario anónimo, usuario de otro tenant, rol insuficiente y owner.
- Datos de costo, margen, crédito, salarios y documentos sensibles requieren permisos explícitos.
- Preferencias sectoriales no cambian RBAC.

### Inventario y finanzas
- Reintento no duplica movimientos.
- Concurrencia no crea saldo negativo ni sobreventa.
- Reversa conserva el evento original y crea compensación trazable.
- Ninguna operación multi-tabla deja estado parcial observable.
- Los saldos se concilian contra ledger/documentos fuente.

### Calidad de datos
- Ausente no equivale a cero.
- Unidad incompatible bloquea.
- Moneda y timezone explícitos.
- KPI muestra período, numerador, denominador, cobertura y timestamp.
- Documento confirmado preserva snapshot histórico.

### UX y resiliencia
- Loading, empty, error, stale y partial states diseñados.
- Móvil Android: acciones primarias alcanzables, sin overflow, scanner y formularios legibles.
- Doble tap/retry no duplica transacciones.
- Pérdida de red no afirma éxito; reintento recupera por idempotency key.
- Accesibilidad por teclado/lector y contraste.

## 6. Umbrales de salida

| Dimensión | Gate |
|---|---|
| Funcional | 100% de escenarios críticos P0 pasan |
| Seguridad | 0 fallos críticos/high de aislamiento o permisos |
| Inventario/finanzas | 0 duplicidades, 0 sobreventas reproducibles, reversas conciliadas |
| CI | Suite obligatoria verde en commit exacto |
| UX | Sin bloqueos P0/P1 en tareas principales |
| Observabilidad | Eventos correlacionables y errores accionables |
| Operación | Rollback de configuración y procedimiento de soporte |
| Datos | Importación con preview, errores exportables y conciliación |
| Evidencia | Informe con SHA, entorno, comandos, resultados y limitaciones |

No establecer un porcentaje global de aprobación que permita ocultar fallos críticos detrás de muchos tests verdes.

## 7. Orden de ejecución recomendado

1. Auditar rutas/servicios/tablas/RPC existentes para los cinco módulos disponibles.
2. Crear fixtures de prueba aislados y repetibles.
3. Ejecutar casos de los tres Golden Businesses sobre capacidades existentes.
4. Resolver gaps P0 de integridad, tenant, auditoría y UX.
5. Diseñar e implementar una capacidad faltante por vez, comenzando por la de mayor reutilización.
6. Repetir certificación cruzada en los tres perfiles.
7. Solo entonces actualizar readiness y habilitar UI.
8. Revisión independiente antes de migraciones sensibles o despliegue.

## 8. Decisión de arquitectura

Los tres Golden Businesses prueban una plataforma compartida con tres contratos de operación. No crear tres sistemas, tres inventarios paralelos ni lógica duplicada. Las diferencias se expresan en manifiestos/versiones de plantilla y capacidades compartidas, con validadores y permisos centrales.
