# Ley 21.719 — inventario técnico de datos y brechas (borrador)

> **Estado:** BORRADOR TÉCNICO — NO ES CERTIFICACIÓN LEGAL NI SIGN-OFF.
> **Fecha de revisión:** 19 de noviembre de 2026.
> **Fecha de entrada en vigor verificada:** 1 de diciembre de 2026 (BCN, Ley 21.719; versión con vigencia diferida; última modificación indicada por BCN: Ley 21.806, 5 de febrero de 2026).  
**Fuente oficial:** https://www.bcn.cl/leychile/Navegar?idNorma=1209272
> **Alcance:** evidencia observable en el repositorio `main`. Las configuraciones reales de producción, contratos de proveedores, regiones y prácticas operacionales deben confirmarse con el responsable del servicio y asesoría jurídica chilena.

## 1. Conclusión ejecutiva

**Estado actual: NOT READY / UNKNOWN en cumplimiento integral.**

Existe una política pública de privacidad y términos con referencias a la Ley 21.719, pero el código revisado no demuestra todavía un proceso técnico completo de ejercicio de derechos, exportación y supresión de datos, un calendario de conservación por categoría ni un inventario aprobado de encargados/subencargados y transferencias internacionales.

La existencia de una página legal no equivale a capacidad operativa de cumplir solicitudes de titulares ni a aprobación jurídica.

## 2. Evidencia revisada

- `src/routes/privacy.tsx`: política pública, versión 2.0, última actualización declarada 22-09-2026; 20 secciones.
- `src/routes/terms.tsx`: términos y condiciones, versión 1.0, última actualización declarada 22-09-2026.
- `src/routes/api/chat.ts`: autenticación Supabase, contexto del negocio, límites de uso y generación IA.
- `src/lib/ai-gateway.server.ts`: proveedores configurables Groq, Lovable AI Gateway y OpenAI; orden/fallback por variables de entorno.
- `src/lib/ai-memory.server.ts`: conversaciones, mensajes, resúmenes y eventos de uso IA.
- `src/routes/api/telemetry.ts`: telemetría operacional con rutas sanitizadas, huellas de error permitidas y métricas técnicas.
- `src/routes/api/integrations.ts` y `src/routes/api/integrations-webhook.ts`: conexiones por negocio y eventos normalizados de integraciones.
- `src/routes/api/billing/mercadopago/*`: suscripciones y webhooks Mercado Pago.
- `src/routes/api/billing/payments/*` y `src/lib/fiscal/payment-service.server.ts`: intents, cobros y adaptadores Flow/VSB.
- `src/integrations/supabase/client.server.ts`: cliente de servidor con service role; evita usarlo desde código cliente.
- `src/routeTree.gen.ts` y `src/integrations/supabase/types.ts`: búsqueda de rutas y objetos de datos.

## 3. Inventario preliminar de categorías y sistemas

| Categoría | Ejemplos de datos | Sistema observado | Finalidad técnica observada | Estado |
|---|---|---|---|---|
| Identidad y cuenta | user ID, email, nombre, claims, rol | Supabase Auth / `business_members` | Autenticación, acceso y administración de cuenta | Parcial |
| Datos de empresa | razón/nombre comercial, RUT/tax ID, comuna, giro, plan | Supabase `businesses` | Prestación, configuración, facturación | Parcial |
| Clientes y contactos | nombres, emails, teléfonos, historial comercial | Supabase CRM y ventas | Gestión de clientes del negocio | Requiere mapa por tabla |
| Operación comercial | ventas, compras, productos, stock, cotizaciones, proveedores | Supabase PostgreSQL | Operación SaaS y reportes | Requiere mapa por tabla |
| Finanzas y pagos | documentos, montos, pagos, intents, identificadores de proveedor, email pagador | Supabase + Flow/VSB/Mercado Pago según flujo | Cobros, conciliación y suscripciones | Parcial |
| Personas y trabajo | trabajadores, contratos, remuneraciones, documentos, asistencia y LRE | Tablas `people_*` en Supabase | Gestión laboral del cliente | **Alto riesgo / datos sensibles** |
| Conversaciones IA | prompts, respuestas, mensajes, resúmenes y contexto de negocio | `ai_conversations`, `ai_messages`, `ai_usage_events` | Chat y funciones IA solicitadas | Parcial |
| Telemetría | ruta normalizada, fingerprint permitido, status, duración, Web Vitals | `owner_operational_events` | Diagnóstico y disponibilidad | Parcial |
| Integraciones | provider, cuenta externa, scopes, metadatos, payload normalizado de webhook | `nuva_integration_connections`, `nuva_integration_events` | Sincronización solicitada por el negocio | Requiere revisar payloads/secretos |
| Archivos | documentos y archivos cargados por clientes | Supabase Storage (uso concreto por módulo pendiente de inventario) | Almacenamiento de documentos y recursos | UNKNOWN |
| Comunicaciones/soporte | solicitudes enviadas a canales de contacto | Email y canales operativos por confirmar | Soporte y privacidad | UNKNOWN |

## 4. Proveedores y transferencias: inventario por confirmar

**Observado en código:**
- Supabase: autenticación, base de datos y almacenamiento.
- Vercel: hosting/ejecución serverless.
- Groq, Lovable AI Gateway y OpenAI: proveedores posibles de generación IA, configurados mediante variables de entorno.
- Mercado Pago: suscripciones y webhooks.
- Flow y VSB: adaptadores de pagos; el uso real depende de la integración conectada.
- Integraciones externas habilitables mediante Nüva Connect.

**No demostrado por esta revisión:**
- Qué proveedor/modelo está activo en cada entorno y qué fallback está habilitado en producción.
- Región efectiva de cada servicio y ubicación de backups/logs.
- Lista contractual vigente de subencargados y subprocesadores.
- Términos de retención, entrenamiento, uso secundario y borrado de cada proveedor IA.
- Cláusulas contractuales y mecanismo aplicable a cada transferencia internacional.
- Contratos de tratamiento de datos y anexos de seguridad firmados.

No asumir que todos los proveedores están activos, que todos reciben datos personales o que sus regiones son equivalentes. Requiere comprobación de configuración y contratos.

## 5. Retención y eliminación: hallazgos

1. `src/lib/ai-memory.server.ts` define una sesión conversacional de siete días de inactividad. Al vencer, marca la conversación como `archived`; este comportamiento no demuestra eliminación de `ai_messages`, resúmenes ni eventos de uso.
2. La política pública describe conservación de forma general, sin períodos concretos por categoría.
3. La telemetría tiene una función de purga en el esquema (`purge_owner_operational_telemetry`), pero deben verificarse su programación, parámetros, alcance y evidencias de ejecución.
4. No se verificó un calendario completo para archivos, eventos de integración/webhook, mensajes IA, documentos laborales, pagos, logs y backups.
5. La eliminación de datos debe respetar obligaciones legales de conservación, integridad contable y trazabilidad; no debe ejecutarse como borrado indiscriminado.

## 6. Derechos de titulares: brecha funcional

La política indica que las solicitudes pueden enviarse por email. En el árbol de rutas generado revisado no se identificaron rutas específicas para:
- recepción y seguimiento de solicitudes de titulares;
- exportación integral de datos por titular/negocio;
- rectificación con trazabilidad;
- supresión/anonimización con excepciones y registro;
- verificación de identidad y autorización del solicitante;
- evidencia de respuesta, responsable, plazos y resolución.

En los tipos de base revisados no se identificó una tabla específica de solicitudes de privacidad/derechos. Esto es una brecha de evidencia, no prueba de que no exista ningún procedimiento manual fuera del repositorio.

## 7. IA: tratamiento y controles por documentar

- El endpoint `/api/chat` construye contexto del negocio y persiste mensajes/conversaciones.
- Los resúmenes de conversación pueden contener hechos personales o comerciales y permanecen asociados a la conversación.
- El gateway puede seleccionar Groq, Lovable AI Gateway u OpenAI según configuración.
- Debe existir un mapa por función IA: datos de entrada, campos personales incluidos, proveedor efectivo, finalidad, región, retención, fallback y controles de minimización/redacción.
- Debe verificarse que logs, errores, prompts, herramientas, memoria y telemetría no expongan datos personales o de otros tenants.
- La política actual no reemplaza contratos y condiciones efectivas de los proveedores.

## 8. Incidentes y seguridad

La política declara detección, contención, investigación y recuperación. La evidencia operativa pendiente debe incluir:
- responsable y suplente de incidentes;
- severidad, triage, escalamiento y registro;
- criterios y procedimiento de notificación a clientes/titulares/autoridad conforme a ley;
- tabletop con escenarios de exposición entre tenants, filtración de documentos, tokens y proveedor IA;
- evidencia de backups, restauración y eliminación coherente con retención;
- revisión de accesos privilegiados y uso de service role en rutas server-side.

No se han modificado RLS, permisos ni configuración remota como parte de este borrador.

## 9. Plan priorizado antes del 1 de diciembre

| Prioridad | Entregable | Evidencia de cierre |
|---|---|---|
| P0 | Confirmar responsable legal, domicilio, contacto y rol responsable/encargado por tratamiento | Aprobación del titular y abogado chileno |
| P0 | Matriz de datos por módulo/tabla/campo y finalidad/base jurídica | Inventario firmado |
| P0 | Registro de proveedores/subencargados, regiones y transferencias | Contratos, DPAs y revisión de transferencias |
| P0 | Flujo de derechos de titulares: intake, identidad, exportación, rectificación, supresión, excepciones y auditoría | E2E multi-tenant y evidencia de respuesta |
| P0 | Calendario de retención por categoría y jobs verificables | Configuración, pruebas y logs de purga |
| P0 | Runbook de incidentes y tabletop | Acta, responsables, tiempos y acciones |
| P1 | Minimización/redacción de prompts IA y telemetría | Tests negativos y revisión de proveedores |
| P1 | Revisión de términos, privacidad, cookies y consentimientos | Sign-off jurídico |

## 10. Decisiones y autorizaciones pendientes

- Confirmar la persona jurídica/parte que operará comercialmente Nüva One.
- Confirmar si los datos de trabajadores y clientes se tratarán como encargado por cuenta del negocio cliente y documentar excepciones.
- Confirmar proveedores activos en Production y Preview; no inferirlos desde dependencias instaladas.
- Confirmar regiones, subprocesadores y mecanismos de transferencia.
- Aprobar períodos de retención con asesoría legal y obligaciones contables/laborales.
- Obtener revisión jurídica chilena antes de publicar declaraciones de cumplimiento.

## 11. Regla de certificación

No declarar la Ley 21.719 como cumplida ni usar la etiqueta READY mientras falten el inventario firmado, la revisión de contratos/transferencias, el flujo probado de derechos, la política de retención ejecutable y el sign-off jurídico/técnico.

**Resultado de este documento:** inventario técnico preliminar y brechas trazables. No se han cambiado datos de producción, políticas de acceso, RLS, configuración hosted Auth ni contratos.
