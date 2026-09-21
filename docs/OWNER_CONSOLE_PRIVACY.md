# Private Owner Console — privacidad y observabilidad

## Finalidad

`/owner` existe para administrar la operación técnica de Nüva One: disponibilidad, errores, latencia, Web Vitals, estado de servicios e incidentes. No es una herramienta para inspeccionar a personas usuarias ni el contenido de sus negocios.

## Datos que NO se deben recolectar en esta telemetría

- nombres, emails, RUT u otros identificadores directos;
- IDs de usuario o de empresa;
- direcciones IP almacenadas por Nüva;
- cookies, tokens, headers de autenticación o sesiones;
- cuerpos de solicitudes/respuestas;
- mensajes, ventas, clientes, productos, documentos o contenido de PYMEs;
- datos sensibles.

Los errores del navegador se reducen a categorías técnicas (`type_error`, `network_error`, `stale_or_failed_chunk`, etc.) y no se almacena el mensaje original.

## Retención

La telemetría operacional se conserva por un máximo previsto de 30 días y debe purgarse mediante `purge_owner_operational_telemetry(30)`.

## Acceso

La tabla de telemetría no está disponible para `anon` ni `authenticated`. Las funciones de agregación se reservan para `service_role`, y la Edge Function exige una sesión cuyo `app_metadata.platform_role` sea `owner`.

## Principios aplicados

El diseño sigue minimización, finalidad, confidencialidad y limitación de conservación. La referencia normativa vigente en Chile al momento de esta implementación es la Ley N.º 19.628; la Ley N.º 21.719, publicada en 2024, establece un régimen actualizado cuya entrada en vigencia está fijada para el 1 de diciembre de 2026. Antes de esa fecha y durante la transición deben mantenerse actualizados el aviso de privacidad, las bases de licitud, los procedimientos de derechos de titulares, seguridad y retención conforme a la normativa aplicable.

Este documento describe controles técnicos y no constituye asesoría jurídica. La política pública de privacidad de Nüva One debe reflejar exactamente los tratamientos que efectivamente realice el producto.
