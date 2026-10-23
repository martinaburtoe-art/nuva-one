# Plan Comercial y Roadmap

## Objetivo comercial
Lanzar Nüva One como solución SaaS de gestión integral para pymes y empresas en el mercado chileno, inicialmente enfocada en módulos financieros y de facturación electrónica, con expansión posterior a CRM, inventario y analítica.

## Segmentos objetivo inicial
1. **Pequeñas empresas** (1-10 empleados) que requieren facturación electrónica y control básico de ingresos/gastos.
2. **Medianas empresas** (11-50 empleados) que necesitan integración entre contabilidad, inventario y ventas.
3. **Startups y empresas de servicios** que valoran la automatización y la IA para atención al cliente.

## Propuesta de valor
- Plataforma todo-en-un: facturación, contabilidad, CRM, inventario y analítica.
- Cumplimiento chileno: facturación electrónica SII, libros de IVA, retenciones.
- Inteligencia artificial incorporada: asistente para consultas, generación de reportes y sugerencias de optimización.
- Experiencia de usuario moderna: interfaz responsiva, diseño limpio, basado en Tailwind y shadcn/ui.
- Despliegue flexible: web, escritorio (Electron/Tauri) y móvil (Capacitor).
- Precio competitivo: plan por usuario/mes con escalado según módulos activos.

## Estratégia de precios (propuesta)
| Plan | Precio mensual (CLP) | Módulos incluidos | Límite de usuarios | Comentario |
|------|----------------------|-------------------|--------------------|------------|
| Básico | 9.990 | Finanzas básicas, facturación SII, dashboard | 1 usuario | Ideal para freelancers y microempresas. |
| Profesional | 24.990 | Finanzas completa, facturación SII, CRM básico, reportes | Hasta 5 usuarios | PyMEs que necesitan control de ventas y clientes. |
| Empresarial | 49.990 | Todos los módulos (finanzas, CRM, inventario, analítica, IA) | Ilimitados | Empresas en crecimiento que requieren scalabilidad. |
| Enterprise | Precio personalizado | Todo + SLA, soporte dedicado, personalización | Ilimitados | Grandes cuentas y requerimientos específicos. |

*Nota: Los precios son referenciales y deben validarse con estudio de mercado y disposición a pagar.*

## Canal de adquisición
- **Inbound marketing**: blog técnico, casos de uso, contenido SEO enfocado en "facturación electrónica Chile", "software contabilidad pymes".
- **Outbound**: llamadas frías a contadores y asesores tributarios que recomienden software a sus clientes.
- **Alianzas**: convenios con estudios contables, franquicias y cámaras de comercio.
- **Pruebas gratuitas**: 14 días sin tarjeta de crédito, con acceso a todos los módulos limitados a cierta cantidad de documentos.
- **Programa de referidos**: descuento por cada cliente que traiga otro usuario activo.

## Hoja de ruta (Roadmap) – próximos 6 meses

### Mes 1 (Octubre 2026)
- Corrección de bloqueo de producción (build) mediante ajuste de dependencias o configuración de Vite/Rolldown.
- Implementación de integración con proveedor DTE (IntegraDTE o similar) para facturas y boletas.
- Automatización de pruebas de emisión en entorno de certificación.
- Lanzamiento de beta cerrada con 5 empresas piloto (facturación y finanzas).

### Mes 2 (Noviembre 2026)
- Soporte para notas de crédito y débito electrónicas.
- Mejora del módulo de conciliación bancaria (importación de CSV de bancos).
- Expansión de la beta a 20 empresas.
- Recopilación de feedback y ajustes de UX.

### Mes 3 (Diciembre 2026)
- Lanzamiento oficial de la versión 1.0 (web) con planes Básico y Profesional.
- Publicación de caso de uso y testimonio de clientes piloto.
- Activación de programa de afiliados para contadores.
- Integración básica de IA: asistente para consultas de estado de cuenta y generación de recordatorios.

### Mes 4 (Enero 2027)
- Lanzamiento de la aplicación móvil (Android/iOS) mediante Capacitor.
- Módulo de inventario básico (registro de productos, stock mínimo).
- Integración de notificaciones push para recordatorios de vencimiento y aprobación de gastos.
- Apertura del plan Empresarial con límite ilimitado de usuarios.

### Mes 5 (Febrero 2027)
- Módulo de CRM completo: pipeline de ventas, automatización de follow-up, integración con WhatsApp Business API.
- Reportes avanzados: diseñador sencillo de gráficos y exportación a Excel/PDF.
- Evaluación de satisfacción NPS y ajuste de precios según respuesta del mercado.

### Mes 6 (Marzo 2027)
- Funcionalidades de IA avanzada: generación automática de borradores de facturas a partir de chats, predicción de flujo de caja.
- Preparación para cumplimiento de norma de facturación electrónica 2027 (si hubiera cambios).
- Plan de expansión a otros países de Latinoamérica (México, Colombia) mediante adaptación de tributos locales.
- Evaluación de ronda de financiación o reinversión de utilidades.

## Métricas de éxito (KPIs)
- **CAC** (Costo de Adquisición de Cliente): < 3 meses de LTV.
- **LTV** (Valor de Vida del Cliente): > 12 meses.
- **Tasa de conversión de prueba a pago**: > 25%.
- **Churn mensual**: < 5%.
- **Ingresos Mensuales Recurrentes (MRR)** objetivo a 6 meses: CLP 5.000.000.
- **NPS** (Net Promoter Score): > 40.
- **Tiempo medio de emisión de DTE**: < 10 segundos desde la acción del usuario hasta aceptación del SII.
- **Disponibilidad del servicio**: > 99.9% (excluyendo mantenimiento programado).

## Riesgos y mitigaciones
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Fallo de build de producción | Medio | Alto (no se puede desplegar) | Destacar tiempo de desarrollo para resolver dependencias; considerar ejector o mantener dos ramas (estable y desarrollo). |
| Cambios en la normativa del SII | Bajo | Medio | Suscribirse al boletín del SII, mantener contacto con proveedor DTE, diseñar módulo de generación desacoplado. |
| Resistencia al cambio de contadores | Medio | Medio | Ofrecer capacitación gratuita, involucrar a contadores en el diseño, demostrar ahorro de tiempo. |
| Competencia de jugadores establecidos | Alto | Medio | Diferenciarse mediante IA, experiencia de usuario y precio; enfocarse en nicho no atendido (pymes tecnológicas). |
| Seguridad y privacidad | Bajo | Alto | Realizar auditoría de seguridad antes del lanzamiento, usar mejores prácticas de gestión de secretos, obtener certificación ISO 27001 o equivalente a mediano plazo. |
| Dependencia de un solo proveedor DTE | Medio | Bajo | Tener al menos dos proveedores integrados o capacidad de cambiar mediante abstracción de servicio. |

## Próximos pasos inmediatos
1. Resolver el bloqueo de build (consultar con equipo de frontend sobre alternativas de bundler o versión de dependencias).
2. Contactar a IntegraDTE y AppDTE para obtener cuentas de prueba y documentación de API.
3. Diseñar la tabla de organizaciones y los campos necesarios para almacenar credenciales DTE de forma segura.
4. Crear un prototipo de flujo de emisión de factura en ambiente de certificación.
5. Preparar material de landing page y caso de uso para la beta cerrada.
