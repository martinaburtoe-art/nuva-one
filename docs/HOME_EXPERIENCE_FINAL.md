# Nüva One — Homepage Cinemática /experience

## Estado

La experiencia editorial vive en `/experience` y no reemplaza la homepage de producción `/`.

## Referencia audiovisual

La referencia suministrada es una experiencia vertical grabada en pantalla, de 26,57 s a 30 FPS y 576×1024. Su lenguaje se basa en recorrido, cambios de escala, transiciones suaves, tipografía sobredimensionada, composición editorial y sensación de cámara continua.

## Traducción a Nüva One

La unidad narrativa es **momento de negocio + persona + consecuencia**, no módulo aislado.

Los 14 capítulos son:

1. Inicio — el negocio real
2. Ventas
3. Clientes
4. Inventario
5. Scanner
6. Compras
7. Caja
8. Despachos
9. Finanzas
10. Nüva Score
11. Automatizaciones
12. Nüva Studio
13. Conexiones
14. Cierre

## Motor

- El scroll controla un único `progress`.
- `getChapterState()` calcula capítulo, progreso local y easing `smoothstep`.
- La transición usa dos capas visuales y funciona hacia adelante y hacia atrás.
- `prefers-reduced-motion` elimina la interpolación.
- Los capítulos se pueden navegar desde la rail lateral.

## Media

Cada capítulo acepta un master MP4 y un poster WebP bajo `public/home-cinematic/`. Si el master no existe o falla, la experiencia conserva un arte cinematográfico CSS funcional; esto evita una pantalla rota durante desarrollo y permite incorporar los masters sin cambiar la arquitectura.

Los videos usan reproducción silenciosa inline y `preload="metadata"` para limitar el coste inicial. Los masters reales deben pasar una compuerta de integridad y QA visual antes de considerarse definitivos.

## Performance

La experiencia mantiene la página principal aislada y concentra la carga en `/experience`. La arquitectura evita listeners duplicados de scroll y evita depender de imágenes de poster inexistentes para mostrar contenido visual.

## Media generado por Veo

Veo 3.1 Lite no tiene nivel gratuito en la API; la generación requiere facturación y se cobra por segundo. Por ello la generación masiva no se ejecuta automáticamente desde este cambio. El pipeline existente puede generar los 14 masters cuando exista autorización presupuestaria y una clave Gemini API con acceso a Veo.

## QA pendiente antes de declarar la versión audiovisual definitiva

- 14 MP4 reales.
- 14 posters.
- 14 last frames.
- Verificación de continuidad entre escenas.
- Browser QA desktop/mobile.
- Verificación de rendimiento con media real.
- Validación final de producción después del deployment.
