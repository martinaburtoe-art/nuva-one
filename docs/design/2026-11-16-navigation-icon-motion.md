# Nüva One — navegación con iconos reactivos

**Fecha:** 16 de noviembre de 2026  
**Base:** `feat/nuva-internal-workspace-ux-20261116`  
**Alcance:** respuesta visual de iconos en navegación autenticada; sin cambios de rutas, permisos, datos ni reglas de negocio.

## Implementación

- Se añade la clase reutilizable `.nuva-icon-motion` a los iconos del sidebar expandido/colapsado, dock móvil y directorio móvil.
- El destino activo recibe una entrada breve (220 ms) con desplazamiento mínimo, escala y rotación contenida.
- El hover de escritorio solo actúa con puntero fino y sobre navegación; el toque móvil entrega feedback de escala.
- La transición usa `transform`, `opacity` y `color`; no cambia dimensiones ni desplaza filas o tarjetas.
- No se instala una dependencia adicional: se reutilizan los SVG de `lucide-react` ya presentes.
- `prefers-reduced-motion: reduce` elimina animación, transición y transformación de estos iconos.

## Límites y verificación pendiente

- Esta es una mejora de navegación, no una certificación visual completa del producto.
- Debe verificarse en preview con sesión autenticada en Android (320, 360, 390 y 430 px), tablet y escritorio.
- Deben comprobarse foco de teclado, contraste, estado activo de cada ruta y ausencia de movimiento con reducción de movimiento habilitada.
- Typecheck, tests, lint, build y revisión visual deben ejecutarse sobre el head final del PR.
- No se afirma despliegue a producción ni finalización funcional hasta disponer de esa evidencia.

## Extensión CRM e inventario

- CRM: `CustomerAvatar` muestra iniciales derivadas del nombre del cliente en tarjetas móviles, tabla de escritorio y cabecera de la ficha lateral. No requiere ni simula fotografías personales.
- Inventario: la miniatura anuncia el nombre accesible de la foto y, si la carga falla, cambia el contenedor a un fallback accesible con icono de paquete y etiqueta de ausencia de fotografía.
- Abastecimiento reutiliza las mismas miniaturas del catálogo; no añade consultas ni modifica el modelo de datos.
