# Nüva One — auditoría competitiva y dirección de diseño comercial

**Fecha:** 16 de noviembre de 2026  
**Alcance:** experiencia autenticada, arquitectura de información, flujos operativos, sistema visual, responsive y criterios de salida comercial.  
**Tipo:** auditoría documental basada en el código de la rama de experiencia y en documentación pública de los productos comparados. No sustituye pruebas de uso, revisión visual en navegador ni validación con clientes.

## 1. Decisión de producto

Nüva One debe sentirse como una aplicación empresarial integrada, no como un portal con muchos módulos independientes. Su ventaja no puede ser simplemente «tener más funciones»: debe reducir el trabajo administrativo y conectar el ciclo de negocio chileno de extremo a extremo.

**Propuesta de experiencia:** «Un solo lugar para operar, entender y hacer crecer tu negocio». Cada pantalla debe responder tres preguntas:
1. ¿Qué está pasando? (estado y datos confiables)
2. ¿Qué requiere atención? (prioridad, impacto y vencimiento)
3. ¿Qué puedo hacer ahora? (acción primaria clara y segura)

No mostrar KPIs sin periodo, unidad, procedencia o explicación. No presentar datos de demostración como si fueran datos reales.

## 2. Benchmark competitivo: patrones que sí conviene aprender

| Producto | Fortaleza observada en sus materiales públicos | Patrón transferible a Nüva One | Qué no copiar |
|---|---|---|---|
| Holded | Facturación, contabilidad, tesorería, CRM, inventario y RR. HH. conectados; onboarding sencillo; flujos de cotización a factura y cobro | Conexión real entre módulos; una sola captura de datos; tareas simples y rápidas; acceso de asesoría/roles | La terminología o la regulación española (Verifactu, IVA/IRPF) |
| Odoo | Suite modular muy amplia, operaciones integradas, dashboards configurables y flujo CRM → cotización → inventario | Modularidad coherente, navegación por tareas y trazabilidad entre registros | Menús extensos y configuración excesiva para una pyme que solo quiere resolver su operación |
| Zoho One | Ecosistema amplio de apps interoperables para ventas, finanzas, RR. HH., operaciones y analítica | Consistencia transversal, identidad y permisos compartidos, automatizaciones entre áreas | Replicar la fragmentación de decenas de aplicaciones dentro de una sola interfaz |
| QuickBooks Online | Foco financiero, cash flow, dashboards configurables, drill-down y asistencia de IA para tareas financieras | Explicar variaciones, permitir bajar del indicador al movimiento y presentar previsiones con supuestos | Tratar una sugerencia de IA como asiento, conciliación o decisión contable confirmada |
| Xero | Conciliación bancaria, facturas, pagos, cuentas por pagar, reportes y acceso móvil | Estados de conciliación claros, bandejas de pendientes y colaboración con contador | Dependencia de integraciones bancarias no disponibles o no certificadas en Chile |
| Bsale | App móvil para vender, consultar ventas, controlar stock por sucursal, escanear códigos y revisar reportes | Acciones móviles reales, inventario operativo y lectura rápida por sucursal | Diseñar móvil como una versión comprimida de escritorio |
| Defontana | ERP web chileno, ventas, inventario, compras, contabilidad, SII y gestión laboral | Cobertura de procesos locales, integración operativa y cumplimiento | Interfaces densas sin jerarquía de tareas |
| Nubox | Contabilidad, remuneraciones, DTE/SII, cobranza y soporte local | Confianza normativa, claridad de obligaciones y acompañamiento para pymes/contadores | Convertir la experiencia en un panel exclusivamente contable |

### Lectura competitiva

- **Holded** es el referente más próximo al posicionamiento pyme «fácil de usar, completo y conectado».
- **Odoo** sirve como referente de amplitud e integración, pero también como advertencia contra la sobrecarga de navegación.
- **Zoho One** enseña consistencia de ecosistema y administración transversal.
- **QuickBooks y Xero** son referencias de claridad financiera, conciliación y análisis de movimientos.
- **Bsale, Defontana y Nubox** aportan expectativas locales: operación móvil, SII, documentos tributarios, cobranza y soporte en Chile.

No se atribuye cuota de mercado ni liderazgo por volumen: las fuentes públicas consultadas no proporcionan una medición comparable y fiable para Chile.

## 3. Auditoría de la experiencia actual observada en el código

### Hallazgos verificables

1. **La navegación tiene demasiados destinos de nivel equivalente.** En `dashboard-shell.tsx` se declaran múltiples entradas financieras (Finanzas, Contabilidad y tributación, Panel financiero, Control financiero, Integridad financiera, Indicadores), además de varios destinos de inteligencia. Aunque existen grupos y búsqueda, el usuario sigue teniendo que decidir entre herramientas que pueden parecer similares.
2. **La ruta Finanzas compone cinco superficies consecutivas.** `finance.tsx` monta control financiero, prioridad de cobranza, espacio SII, herramientas avanzadas y contabilidad. Es funcionalmente rico, pero requiere una jerarquía explícita y una priorización por tarea para no convertirse en una página larga.
3. **Centro Ejecutivo ofrece ocho áreas de trabajo.** `executive-command-center.tsx` organiza puesto de mando, decisiones, seguimiento, escenarios, factores, resultados, memoria y disciplina. El modelo es potente; debe comenzar con una síntesis de pocas prioridades y revelar las herramientas avanzadas cuando se necesitan.
4. **Nüva Agent ya diferencia especialistas.** `ai.tsx` contempla orquestador, finanzas, contabilidad, tributario Chile, ventas, inventario, CRM y estrategia. La experiencia comercial debe mostrar qué datos consultó, periodo, límites y nivel de confianza, y separar explicación de ejecución.
5. **El sistema de movimiento ya incorpora respeto por `prefers-reduced-motion`.** Las siguientes animaciones deben seguir siendo funcionales, breves y no bloquear contenido ni controles.

### Riesgos de producto que requieren comprobación visual/funcional

- Que las vistas financieras repitan indicadores o mezclen conceptos (ingresos, caja, utilidad, valor de inventario).
- Que el usuario no distinga dato real, dato estimado, dato de demostración o dato incompleto.
- Que existan varias rutas para la misma tarea sin una ruta principal reconocible.
- Que la experiencia móvil reduzca el contenido sin rediseñar las tareas frecuentes.
- Que las pantallas vacías, con error o sin permisos parezcan fallas en lugar de estados explicados.
- Que el exceso de módulos visibles perjudique el primer uso y la activación.

## 4. Dirección visual propuesta

### Principios

- **Premium, claro y operativo:** superficie base clara, neutros cálidos/perla, tipografía legible, contraste alto y un color de acción consistente. Mantener la identidad Nüva; evitar cambiar de tema sin una razón de producto.
- **Jerarquía antes que decoración:** título y contexto; una acción primaria; resumen del estado; tareas prioritarias; datos y tablas; herramientas secundarias.
- **Densidad adaptativa:** tablas y filtros para escritorio; tarjetas compactas y acciones de pulgar para móvil. No esconder datos esenciales en hover.
- **Movimiento con propósito:** feedback de selección, confirmación, progreso y transición de contexto. No animar cada tarjeta ni mantener elementos decorativos en movimiento.
- **Visualización responsable:** gráficos con periodo, unidad, leyenda, estados vacíos y acceso al detalle. Nunca inventar series ni completar datos faltantes con valores simulados.
- **Imágenes auténticas:** usar fotos de producto guardadas en el almacenamiento existente; si no existe foto, fallback visual consistente. No crear retratos ficticios de clientes ni empleados.
- **Accesibilidad:** foco visible, contraste, etiquetas, objetivos táctiles adecuados, teclado y reducción de movimiento.

### Tokens de experiencia recomendados

- Microfeedback: 120–180 ms.
- Cambio de estado: 180–260 ms.
- Transición entre paneles: 240–360 ms.
- Elevación hover: máximo 1–2 px, solo en superficies interactivas.
- Radio y sombra: sistema consistente; no convertir cada bloque en una tarjeta flotante.
- Estados obligatorios: cargando, vacío, error recuperable, sin permiso, guardado, sin conexión y datos desactualizados.

## 5. Arquitectura de información recomendada

No se debe borrar ni renombrar rutas funcionales sin comprobar enlaces, permisos y telemetría. La reorganización debe ser progresiva:

1. **Inicio:** resumen personalizado por rol, negocio activo y tareas urgentes.
2. **Operación:** caja, ventas, cotizaciones/documentos, compras, inventario y entregas.
3. **Clientes:** CRM, seguimiento y actividad comercial.
4. **Finanzas:** una entrada principal con pestañas/segmentos para caja y flujo, cuentas por cobrar/pagar, gastos, contabilidad y tributación. Herramientas avanzadas bajo «Más herramientas».
5. **Inteligencia:** Nüva Intelligence como centro de análisis y decisión; Nüva Agent como interfaz conversacional, sin duplicar paneles.
6. **Personas:** colaboradores, jornada, permisos, documentos y remuneraciones según rol.
7. **Administración:** negocio, usuarios, roles, conexiones, plan y ayuda.

La navegación debe priorizar el trabajo diario y no el organigrama interno del software. El acceso rápido debe ser contextual y mostrar solo las acciones permitidas.

## 6. Flujos comerciales que deben sentirse impecables

### Flujo A — vender y cobrar
Cliente → cotización → aprobación → documento tributario/factura → pago/cobranza → registro contable → actualización de stock cuando corresponda. Debe existir trazabilidad y evitar volver a escribir datos.

### Flujo B — comprar y reponer
Necesidad de stock → proveedor → orden/compra → recepción → actualización de existencias/costo → cuenta por pagar. Diferenciar pedido, recibido y disponible.

### Flujo C — dirigir el negocio
Resumen → alerta explicada → detalle que la respalda → acción propuesta → confirmación humana cuando tenga impacto → resultado medible.

### Flujo D — cumplimiento chileno
Mostrar estado de conexión y sincronización SII, documentos aceptados/rechazados, periodos, vencimientos y acciones de recuperación. No mostrar «cumplido» si no existe evidencia de aceptación o estado confirmado.

## 7. Priorización de implementación

| Prioridad | Entrega | Resultado esperado |
|---|---|---|
| P0 | Simplificar navegación y definir una ruta principal por tarea | Menos decisiones, menos duplicación percibida |
| P0 | Reordenar Finanzas por tareas y separar resumen de herramientas avanzadas | Lectura clara de caja, obligaciones y resultado |
| P0 | Auditar venta → cotización → documento → cobro → inventario | Experiencia comercial coherente y sin doble digitación |
| P0 | Estados de datos, errores, permisos y sincronización SII | Confianza y soporte reducido |
| P1 | CRM con pipeline, ficha y siguiente acción | Seguimiento comercial accionable |
| P1 | Inventario con fotografía real, disponibilidad, movimientos y reposición | Operación visual y verificable |
| P1 | Inicio por rol y onboarding orientado al primer resultado | Activación más rápida |
| P1 | Mobile-first para caja, ventas, escaneo, consulta y tareas | Uso real desde teléfono |
| P2 | Nüva Intelligence con explicación, evidencia, escenarios y feedback | Diferenciación basada en decisiones |
| P2 | Automatizaciones e integraciones visibles y auditables | Menos trabajo repetido sin pérdida de control |

## 8. Criterios de aceptación comercial

No declarar una pantalla «lista» hasta verificar:

- La acción primaria se identifica en menos de 5 segundos en una prueba moderada.
- Un usuario nuevo puede completar la tarea principal sin instrucciones externas.
- La vista móvil no requiere zoom horizontal para la tarea principal.
- Los datos tienen moneda/unidad, periodo y estado; los vacíos no se disfrazan de cero.
- Las acciones irreversibles requieren confirmación y dejan trazabilidad.
- Los errores explican qué ocurrió y cómo recuperarse.
- Los permisos se respetan en interfaz y backend; ocultar un enlace no es autorización.
- Se verifican teclado, foco, contraste y reducción de movimiento.
- Se ejecutan typecheck, pruebas, lint y build sobre el commit exacto.
- Se prueba el preview en móvil y escritorio antes de promover a producción.
- Se verifica el SHA desplegado y un smoke test de los flujos críticos después del despliegue.

## 9. Fuentes de benchmark

- Holded — funcionalidades y suite ERP: https://www.holded.com/es/funcionalidades
- Holded — ERP para pymes: https://www.holded.com/es/erp
- Odoo — suite de aplicaciones: https://www.odoo.com/
- Odoo CRM — pipeline y reporting: https://www.odoo.com/app/crm-features
- Zoho One — ecosistema empresarial: https://www.zoho.com/one/
- QuickBooks Online — planes, dashboards e IA: https://quickbooks.intuit.com/pricing/
- Xero — funcionalidades y conciliación: https://www.xero.com/us/accounting-software/all-features/
- Bsale — app móvil: https://www.bsale.cl/sheet/app-bsale
- Defontana Chile — ERP y módulos: https://www.defontana.com/cl
- Nubox — suite pyme y contable: https://app.nubox.com/
- Panorama ERP Chile (noviembre 2026; sin ranking de cuota de mercado): https://codigolibre.cl/erp-chile/

---

**Conclusión:** Nüva One ya tiene amplitud funcional y una base técnica de producto integrado. La brecha comercial prioritaria no es sumar más módulos: es convertir esa amplitud en una experiencia simple, confiable y coherente, donde cada usuario encuentre su próxima acción sin tener que aprender la arquitectura interna del sistema.
