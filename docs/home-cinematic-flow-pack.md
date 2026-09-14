# Nüva One — Google Flow master pack

Este pack convierte `docs/home-cinematic-veo-manifest.json` en una ejecución manual en Google Flow. No copia la fotografía del video de referencia: conserva solo su lenguaje editorial, ritmo, continuidad y cámara.

## Ajustes de salida
- Formato: **16:9**.
- Duración: **8 s** por capítulo.
- Modelo: **Veo 3.1 Lite** cuando esté disponible.
- Generación: **Frames to Video → First + Last** cuando existan ambos cuadros; si no, **First**.
- Para capítulos 02–13: usar como primer cuadro el `*-last.webp` del capítulo anterior.
- Para 14: usar `hero-last.webp` como primer cuadro.
- No generar texto, logos, UI, dashboards, marcas comerciales ni watermark dentro de la escena.
- Exportar cada MP4 con el nombre exacto del capítulo: `hero.mp4`, `sales.mp4`, … `final.mp4`.

## Bloque visual común
Fotorealismo editorial premium, negocio real chileno de barrio, luz natural diurna, paleta marfil/piedra/madera de roble claro, contraste contenido, textura cinematográfica sutil, profundidad de campo natural, cámara física y movimiento lento controlado. Personas reales, gestos espontáneos, nada posado. Sin estética cyberpunk, neón, hologramas, CGI, 3D render, dashboards flotantes ni interfaz generada.

## Escenas
01 **hero** — Apertura matinal del mismo local chileno; travelling lento hacia la entrada mientras entra luz suave. Termina cerca del mesón, preparado para continuar hacia la persona que atiende.

02 **sales** — Continuar desde el mesón: misma persona atendiendo una venta; énfasis en manos, producto y pago. Desplazamiento lateral muy suave y cierre en el intercambio del producto.

03 **customers** — El mismo cliente vuelve; reconocimiento natural entre cliente y dueño. Rack focus producto → cliente → dueño y pequeño push-in, sin posar.

04 **inventory** — Continuar hacia bodega/almacenamiento. Estanterías reales, stock imperfecto y cajas. El dueño busca un producto; cámara avanza con él hacia el interior.

05 **scanner** — Macro del producto encontrado. La mano acerca un lector/barcode scanner al código. Push-in macro lento y rack focus de código a producto; sin texto legible.

06 **purchases** — Continuar en almacenamiento. Una ubicación de estante queda visiblemente baja; el dueño detecta la falta y consulta discretamente un dispositivo. La decisión humana es el foco.

07 **cash** — Regreso natural al mesón. Pago contactless realista, entrega de producto y recibo. Push-in corto hacia el pago y cierre listo para continuar con un paquete.

08 **shipping** — El dueño toma un paquete sencillo desde el mesón y lo entrega hacia la salida/courier. Tracking suave siguiendo el paquete hasta la puerta.

09 **finance** — Más tarde, misma tienda y mismo dueño revisando el día en un laptop. Luz natural más cálida. Órbita o reencuadre muy lento; pantalla abstracta, sin texto legible.

10 **score** — Continuar desde la revisión hacia un plano más amplio. El local se percibe algo más ordenado. Pull-back lento y espacio negativo limpio para que la web coloque Nüva Score.

11 **automation** — El dueño realiza una tarea normal mientras una pequeña notificación aparece en un teléfono/laptop físico y la revisa sin detener su operación. Movimiento sutil, sensación de negocio funcionando solo.

12 **studio** — Over-the-shoulder del dueño haciendo una consulta en laptop. Push-in lento hacia la pantalla desenfocada; la web añadirá la interfaz real.

13 **connections** — Pull-back amplio: dueño, teléfono, laptop, terminal de pago y paquete conviven en el mismo entorno. Nada flota; la conexión se comunica por composición y continuidad.

14 **final** — Volver al mismo espacio del capítulo 01 usando `hero-last.webp` como primer cuadro. El local se siente ligeramente más ordenado y calmado. Pull-back lento, composición estable y mucho espacio negativo para el CTA final.

## Control de continuidad
No cambiar ubicación, arquitectura, iluminación, vestuario ni identidad entre capítulos. Cada final debe dejar un encuadre físicamente plausible para el inicio siguiente. Si Flow ofrece **First + Last**, usar el último cuadro del capítulo siguiente solo cuando sea necesario para fijar composición; nunca sacrificar naturalidad del movimiento por una transición artificial.

## Entrega al repositorio
Por cada capítulo se necesitan exactamente tres archivos: `<id>.mp4`, `<id>-poster.webp` y `<id>-last.webp`. El script `scripts/verify-home-cinematic-assets.mjs` exige MP4 1920×1080 y aproximadamente 8 s cuando se activa `REQUIRE_COMPLETE=true`.
