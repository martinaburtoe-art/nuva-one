# Nüva One — análisis operativo del video de referencia

Este documento convierte el video de referencia suministrado para la homepage en reglas de implementación. No reproduce su fotografía, copy ni branding.

## Medición del material

- Duración: ~26,57 s.
- Formato observado: 576×1024, 30 fps; la captura muestra un sitio editorial dentro de un navegador.
- El montaje contiene 14 bloques visuales claramente diferenciables.
- Ritmo medio: ~1,90 s por bloque.
- La referencia usa cambios de escena muy frecuentes, pero no como cortes secos: la percepción es de continuidad mediante desplazamiento, zoom, crossfade y cambio de composición.

## Cadencia aproximada observada

| # | Ventana | Función visual | Traducción Nüva |
|---|---:|---|---|
| 01 | 0,0–1,8 s | Apertura / hero | Inicio |
| 02 | 1,8–3,5 s | Recorrido espacial | Ventas |
| 03 | 3,5–5,3 s | Nuevo ambiente | Clientes |
| 04 | 5,3–7,1 s | Cambio de espacio | Inventario |
| 05 | 7,1–8,8 s | Detalle / proximidad | Scanner |
| 06 | 8,8–10,6 s | Espacio amplio | Compras |
| 07 | 10,6–12,4 s | Vista abierta | Caja |
| 08 | 12,4–14,1 s | Interludio editorial | Despachos |
| 09 | 14,1–15,9 s | Datos / estadística | Finanzas |
| 10 | 15,9–17,6 s | Galería / catálogo | Nüva Score |
| 11 | 17,6–19,4 s | Material / detalle | Automatizaciones |
| 12 | 19,4–21,2 s | Material / detalle | Nüva Studio |
| 13 | 21,2–22,9 s | Material / detalle | Conexiones |
| 14 | 22,9–26,57 s | Cierre / CTA | Nüva One |

## Reglas de experiencia

1. El scroll es el director de tiempo: no debe sentirse como una página de cards que simplemente se desplazan.
2. Cada capítulo debe tener una composición dominante, una trayectoria de cámara y un punto de salida preparado para el siguiente.
3. El texto editorial pertenece al HTML/CSS, nunca al video generado.
4. La cámara debe mantener movimiento lento y continuo: dolly, lateral, pan, órbita suave o macro controlado.
5. El crossfade debe empezar antes del cambio conceptual y terminar cuando la nueva composición ya sea legible.
6. El zoom/pan debe ser suficientemente pequeño para conservar estabilidad al hacer scrub con el scroll.
7. Desktop usa master 16:9; mobile debe recortar/recomponer sin destruir sujeto ni copy.
8. Los capítulos no deben depender de una UI falsa dentro del video. Cuando un módulo necesita datos, estos se superponen desde la aplicación real.
9. La estética Nüva debe ser luminosa, humana, premium, editorial y documental; evitar cyberpunk, neón, hologramas, robots, dashboards flotantes y estética genérica de SaaS.
10. La continuidad entre escenas se construye con el último frame de una escena como ancla visual de la siguiente cuando el generador lo permita.

## Criterio de aceptación audiovisual

Una escena no entra a producción solo por ser bonita. Debe cumplir simultáneamente: composición editorial, movimiento suave, fotorealismo, ausencia de texto/logo/UI incrustados, continuidad razonable con el mundo Nüva, espacio para tipografía web y salida visual compatible con el siguiente capítulo.

## Implicación para la implementación actual

La experiencia editorial de `/experience` ya reserva 14 capítulos y dos capas de arte para crossfade. El siguiente bloqueo de release es material real: 14 masters cinematográficos y sus posters/last frames. El fallback CSS no sustituye los masters finales.
