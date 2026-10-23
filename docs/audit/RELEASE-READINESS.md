# Checklist de Lanzamiento

## Build y despliegue
- [ ] Build de producción exitoso (`bun run build` o equivalente) sin errores.
- [ ] Artefacto de despliegue verificado (tamaño razonable, sin archivos innecesarios).
- [ ] Despliegue en entorno de staging (Vercel o similar) exitoso y saludable.
- [ ] Variables de entorno configuradas correctamente para producción (Supabase, Stripe, IA, etc.).
- [ ] Certificados SSL/TLS válidos y renovación automática configurada.
- [ ] CDN y caching configurados (headers de cache, compresión brotli/gzip).
- [ ] Monitoreo de uptime y alertas desplegadas (por ejemplo, UptimeRobot o similar).
- [ ] Logs de errores recolectados y accesibles (por ejemplo, mediante Sentry o LogRocket).
- [ ] **Estado actual: ❌ No cumplido** - El build de producción falla debido a dependencias faltantes causadas por el error de `bun install` (failed to enqueue lifecycle scripts for esbuild: ENOENT). No se puede generar artefacto de despliegue.

## Funcionalidad crítica
- [ ] Autenticación de usuarios (login, logout, refresh de token) funciona con cuentas reales.
- [ ] Recuperación de contraseña y verificación de email operativa.
- [ ] Creación, edición y eliminación de organizaciones y usuarios dentro de una organización.
- [ ] Módulo de finanzas: registro de ingresos y gastos, cálculo de totales, generación de reportes básicos.
- [ ] Facturación electrónica: generación de DTE (factura y boleta) y envío exitoso al SII (entorno de certificación).
- [ ] Recepción de aceptación o rechazo del SII y visualización al usuario.
- [ ] Integración de IA: consultas básicas reciben respuestas coherentes y dentro de límites de uso.
- [ ] Manejo de errores: mensajes de usuario claros y sin exposición de stack traces internos.
- [ ] Responsividad: la aplicación funciona correctamente en móviles, tablets y escritorio.
- [ ] Accesibilidad básica: contraste suficiente, navegación con teclado, etiquetas ARIA en formularios.
- [ ] **Estado actual: ⚠️ Parcialmente cumplido** - Aunque el código fuente parece implementar estas funcionalidades, no se pueden validar debido a la imposibilidad de ejecutar pruebas o build. Se requiere revisión estática del código.

## Seguridad y privacidad
- [ ] Ninguna clave secreta (certificado digital, clave tributaria, API keys) almacenada en texto plano en la base de datos.
- [ ] Variables de entorno sensibles solo accesibles desde el backend.
- [ ] CORS restringido a dominios autorizados.
- [ ] Headers de seguridad implementados (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- [ ] Política de privacidad y términos de servicio publicados y accesibles.
- [ ] Mecanismo para solicitud de exportación y eliminación de datos (derechos ARCO) implementado o planificado.
- [ ] Registro de auditoría de acceso a datos sensibles (login, cambio de contraseña, emisión de DTE) activo o en roadmap.
- [ ] **Estado actual: ⚠️ Pendiente** - No se han podido ejecutar análisis de seguridad de dependencias ni pruebas de aislamiento debido al bloqueo de construcción.

## Cumplimiento legal y tributario
- [ ] Certificado digital válido y renouveable obtenido para al menos una organización de prueba.
- [ ] Clave tributaria registrada y probada en entorno de certificación del SII.
- [ ] Los DTE generados incluyen todos los campos requeridos por el SII (RUT, razon social, giro, dirección, etc.).
- [ ] Los DTE se envían con firma digital válida.
- [ ] Se conserva copia del DTE enviado y la respuesta del SII por el tiempo legal requerido.
- [ ] Se generan los libros de IVA compras y ventas según normativa chilena (pendiente de validación con contador).
- [ ] Se implementa retención de impuestos donde corresponda (ej. honorarios, arrendamientos).
- [ ] Los reportes tributarios pueden ser exportados en formato oficial (Excel o PDF) si se requiere.
- [ ] **Estado actual: ⚠️ Pendiente** - Requiere validación mediante pruebas que actualmente no se pueden ejecutar.

## Operaciones y soporte
- [ ] Documentación de instalación y configuración para el equipo de operaciones (si se despliega on-premise).
- [ ] Runbooks para situaciones comunes: reinicio de servicio, restauración de base de datos, rotación de claves.
- [ ] Canal de soporte definido (email, chat, teléfono) y SLA establecido.
- [ ] Métricas de uso monitoreadas (usuarios activos, documentos emitidos, llamadas a IA).
- [ ] Copias de seguridad automatizadas de la base de datos Supabase (si se usa proyecto propio) o estrategia de exportación.
- [ ] Plan de respuesta a incidentes de seguridad (fuga de datos, compromiso de cuenta) definido.
- [ ] Versióning semántico aplicado y changelog mantenido.
- [ ] **Estado actual: ⚠️ Parcialmente cumplido** - El changelog se mantiene (ver 10-registro-de-cambios.md), pero otros puntos requieren verificacion en entorno operativo.

## Marketing y lanzamiento
- [ ] Página de aterrizaje (landing page) con propuesta de valor clara y llamado a la acción.
- [ ] Material de presentación (slides, video demo) listo para uso comercial.
- [ ] Casos de uso o testimonios de empresas piloto obtenidos y con permiso para publicación.
- [ ] Estrategia de contenido inicial (blog, redes sociales) definida y calendario de publicaciones creado.
- [ ] Campaña de acceso anticipado o beta pública anunciada.
- [ ] Programa de referidos o afiliados configurado y enlaces de tracking funcionando.
- [ ] Equipo de ventas capacitado en el manejo de objeciones y demostración del producto.
- [ ] Soporte post-venta garantizado durante los primeros 30 días (onboarding y entrenamiento).
- [ ] **Estado actual: ⚠️ Pendiente** - Requiere revisión de los materiales existentes.

## Post-lanzamiento (primer mes)
- [ ] Revisión diaria de logs y métricas durante la primera semana.
- [ ] Recopilación de feedback de usuarios y priorización de mejoras.
- [ ] Corrección de bugs críticos encontrados en producción dentro de 24 horas.
- [ ] Publicación de informe de lanzamiento y logros iniciales.
- [ ] Evaluación de cumplimiento de KPIs (CAC, LTV, churn, NPS) y ajuste de estrategia si es necesario.
- [ ] Plan de actualizaciones mensuales comunicado a los usuarios (nuevas características, mejoras, mantenimiento).
- [ ] **Estado actual: ⚠️ Pendiente** - Depende de un lanzamiento exitoso.

## Conclusión
El principal bloqueo para el lanzamiento es la falla del sistema de construcción que impide generar un build de producción exitoso. Sin un build válido, no es posible cumplir con la mayoría de los criterios de esta checklist. Se recomienda priorizar la resolución del error de `bun install` antes de proceder con la validación de los demás ítems.
