# Matriz Funcional SaaS

|| Módulo | Estado real | Valor comercial | Problemas identificados | Requisitos faltantes | Prioridad | Criterios de aceptación |
|--------|-------------|-----------------|-----------------|-------------------------|----------------------|-----------|--------------------------|
| Autenticación | Implementado (Supabase Auth) | Alto | Necesita MFA y recuperación de cuenta robusta | Soporte para autenticación social, MFA OTP | Alta | Los usuarios pueden iniciar sesión, recuperar contraseña y cambiarla de forma segura. |
| Dashboard | Implementado básicamente | Medio | Falta de personalización y widgets configurables | Sistema de drag-and-drop para widgets, filtros globales | Media | El usuario puede ver un resumen de sus métricas clave y personalizar la vista. |
| Finanzas | Parcialmente implementado | Alto | Cálculo de períodos tributarios corregido, pero falta conciliación bancaria y reportes impositivos | Conciliación bancaria, generación de libros IVA, integración con SII | Alta | Los usuarios pueden registrar ingresos y gastos, ver flujo de caja y generar reportes contables básicos. |
| CRM | Esqueleto | Medio | Falta de pipeline de ventas, automatizaciones y seguimiento de leads | Etapas de oportunidad, tareas automáticas, integración con email | Media | Los usuarios pueden crear contactos, oportunidades y seguir el estado de cada venta. |
| Inventario | Esqueleto | Alto | Falta de control de lotes, fechas de vencimiento y alertas de stock mínimo | Alertas de stock, gestión de múltiples almacenes, códigos de barras | Alta | El producto permite registrar stock, movimientos y generar informes de disponibilidad. |
| Ventas | Parcialmente implementado | Alto | Falta de cálculo de impuestos, generación de documentos tributarios (DTE) | Integración con SII para facturación electrónica, totales con IVA | Alta | Los usuarios pueden crear cotizaciones, convertir órdenes y emitir facturas válidas. |
| Compras | Esqueleto | Medio | Falta de gestión de proveedores y órdenes de compra | Catálogo de proveedores, tres-way matching, recepción de mercancía | Media | Los usuarios pueden registrar compras, gestionar proveedores y controlar gastos. |
| Reportes | Limitado | Medio | Solo existen reportes básicos; falta de diseñador de reportes y exportación avanzada | Diseñador de reportes, programación de envíos, exportación a Excel/PDF | Media | Los usuarios pueden crear reportes personalizados y programar su entrega. |
| IA | Protótipo | Alto | Falta de control de costos, límites de uso y trazabilidad | Gestión de tokens, fallback entre proveedores, registro de prompts | Alta | Las respuestas de la IA son coherentes, se controla el gasto y se puede auditorizar su uso. |
| Organización | Parcialmente implementado | Alto | Falta de gestión de sucursales y roles granulares | Jerarquía de sucursales, roles personalizados, permisos por módulo | Alta | Los administradores pueden crear sucursales, asignar roles y definir permisos específicos. |
| Configuración | Implementado básicamente | Medio | Falta de versionado de configuraciones y modo de mantenimiento | Historial de cambios, mantenimiento programado, backup/restore | Media | Los ajustes del sistema se pueden modificar sin afectar la operación y se pueden revertir. |
| Notificaciones | Esqueleto | Bajo | Solo notificaciones en tiempo real; falta de canales externos (email, SMS) | Plantillas de notificaciones, integración con email/SMS, centro de notificaciones | Baja | Los usuarios reciben alertas relevantes vía aplicación y pueden configurar canales externos. |
| Movilidad (Capacitor) | Configuración presente | Medio | Falta de pruebas en dispositivos nativos y ajustes de UI para pantallas pequeñas | Optimización para touch, manejo de estado offline, notificaciones push | Media | La aplicación se puede instalar y usar en Android/iOS con funcionalidad completa. |

## Auditoría de Build System (2026-10-18)

Durante la auditoría funcional, se identificó un bloqueo crítico en el sistema de construcción que afecta la capacidad de validar los módulos funcionales mediante pruebas automatizadas.

### Hallazgos
- El comando `bun install` falla con error: `error: failed to enqueue lifecycle scripts for esbuild: ENOENT`.
- Esto previene la instalación completa de dependencias, llevando a módulos faltantes o incompletos en `node_modules`.
- Como consecuencia, los scripts de lint, typecheck, test y build no pueden ejecutarse de manera confiable.
- Se ha verificado que el binario de esbuild funciona correctamente cuando se invoca directamente, sugiriendo que el problema está en la gestión de scripts de lifecycle de Bun, no en el paquete en sí.

### Impacto en la Matriz Funcional
- Aunque los módulos funcionales están implementados en el código fuente, su validación mediante pruebas automatizadas está bloqueada.
- No se puede ejecutar el suite de pruebas para verificar el comportamiento de autenticación, dashboard, finanzas, etc.
- Se recomienda proceder con la revisión estática del código fuente para cada módulo mientras se resuelve el problema de construcción.

### Próximos Pasos
- Continuar con la auditoría de código fuente para cada módulo funcional.
- Documentar cualquier desviación de los requisitos funcionales encontrados en el código.
- Si el sistema de construcción se recupera, ejecutar pruebas para validar la matriz funcional.

