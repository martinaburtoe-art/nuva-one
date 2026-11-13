# Crosswalk de perfiles Nüva One y actividades económicas SII (Chile)

**Fecha de consulta:** 12 de noviembre de 2026  
**Fuente primaria:** buscador y listado de actividades económicas del Servicio de Impuestos Internos (SII).  
**Propósito:** ayudar a orientar el onboarding y ofrecer una referencia tributaria opcional. Este documento no reemplaza la consulta oficial del SII ni determina el giro correcto de una empresa.

## Regla fundamental de modelado

Nüva One debe mantener dos datos separados:

- **Perfil operativo Nüva:** describe cómo trabaja el negocio y activa su experiencia sectorial (por ejemplo, `hardware_store`, `neighborhood_grocery`).
- **Actividad económica SII:** código de seis dígitos que el contribuyente declara ante el SII. Puede haber varias actividades y deben corresponder a operaciones que efectivamente realiza.

No inferir un código SII a partir del perfil sectorial ni usar el código tributario como llave para activar capacidades. El mismo perfil operativo puede relacionarse con más de un código y una empresa puede tener más de un perfil operativo.

El SII señala que existen 674 actividades económicas identificadas por código de seis dígitos; indica también que pueden declararse varias actividades relacionadas con el giro efectivamente desarrollado y ampliarse cuando se comienza a realizar una actividad nueva. Fuente: [SII — 4 puntos claves para emprender](https://www.sii.cl/portales/emprendedor/4puntos_claves.html).

## Muestra de códigos oficiales útiles para el catálogo

Los códigos y descripciones siguientes se transcriben del listado vigente consultado del SII. Se incluyen los que tienen correspondencia práctica con perfiles prioritarios o próximos; **no es un catálogo exhaustivo**.

| Perfil Nüva One | Código SII | Descripción oficial resumida |
|---|---:|---|
| Almacén / minimarket | 472101 | Venta al por menor de alimentos en comercios especializados (almacenes pequeños y minimarket) |
| Supermercado | 471100 | Venta al por menor en comercios de alimentos, bebidas o tabaco (supermercados e hipermercados) |
| Carnicería | 472102 | Venta al por menor en comercios especializados de carne y productos cárnicos |
| Ferretería / materiales | 475201 | Venta al por menor de artículos de ferretería y materiales de construcción |
| Pinturas | 475202 | Venta al por menor de pinturas, barnices y lacas |
| Vidriería | 475203 | Venta al por menor de productos de vidrio |
| Distribuidora de frutas y verduras | 463011 | Venta al por mayor de frutas y verduras |
| Distribuidora de carnes | 463012 | Venta al por mayor de carne y productos cárnicos |
| Distribuidora de productos del mar | 463013 | Venta al por mayor de productos del mar |
| Mayorista de abarrotes | 463019 | Venta al por mayor de huevos, lácteos, abarrotes y otros alimentos |
| Mayorista de bebidas | 463020 | Venta al por mayor de bebidas alcohólicas y no alcohólicas |
| Distribuidora de materiales | 466302 | Venta al por mayor de materiales de construcción, artículos de ferretería, gasfitería y calefacción |
| Mayorista de vestuario | 464100 | Venta al por mayor de productos textiles, prendas de vestir y calzado |
| Mayorista de papelería | 464904 | Venta al por mayor de artículos de papelería y escritorio |
| Mayorista de libros | 464905 | Venta al por mayor de libros |
| Librería | 476101 | Venta al por menor de libros en comercios especializados |
| Papelería | 476103 | Venta al por menor de artículos de papelería y escritorio |
| Zapatería | 477101 | Venta al por menor de calzado en comercios especializados |
| Tienda de ropa | 477102 | Venta al por menor de prendas y accesorios de vestir |
| Comercio electrónico | 479100 | Venta al por menor por correo, por internet y vía telefónica |
| Restaurante / comida móvil | 561000 | Actividades de restaurantes y de servicio móvil de comidas |
| Panadería / pastelería | 107100 | Elaboración de productos de panadería y pastelería |
| Taller mecánico | 452002 | Mantenimiento y reparación de vehículos automotores |
| Repuestera | 453000 | Venta de partes, piezas y accesorios para vehículos automotores |
| Veterinaria clínica | 750001 | Actividades de clínicas veterinarias |
| Hotel | 551001 | Actividades de hoteles |
| Arriendo de vehículos | 771000 | Alquiler de vehículos automotores sin chofer |
| Arriendo de maquinaria | 773002 | Alquiler de maquinaria y equipo agropecuario, forestal, de construcción e ingeniería civil, sin operarios |
| Peluquería / estética | 960200 | Peluquería y otros tratamientos de belleza |

Fuente primaria para los códigos de esta tabla: [SII — Todos los códigos de actividad económica](https://www.sii.cl/ayudas/ayudas_por_servicios/1956-codigos-1959.html?type=3). La disponibilidad y descripción deben revalidarse contra el buscador oficial antes de mostrar una sugerencia tributaria al usuario.

## Diseño de la experiencia de onboarding

1. Preguntar primero: **¿Qué tipo de negocio administras?** El usuario elige un perfil operativo en lenguaje cotidiano.
2. Preguntar por su operación: retail, mayorista, servicio, fabricación, instalación, arriendo, venta online o mezcla.
3. Preguntar opcionalmente: **¿Conoces tu código de actividad del SII?** Permitir buscar por descripción o introducir seis dígitos.
4. Si no conoce el código, permitir omitir. Nunca bloquear la creación de la cuenta.
5. Si ingresa uno, mostrar la descripción oficial recuperada y pedir que confirme que corresponde a una actividad que efectivamente realiza.
6. Permitir varias actividades declaradas y distinguir cuál es principal para fines tributarios, sin asumir que esa actividad define por sí sola el perfil operativo.
7. Mantener una advertencia: Nüva One no determina el giro correcto ni ofrece una calificación tributaria automática.

## Consecuencias para el producto

- Ferretería y distribuidora de materiales pueden compartir capacidades de variantes y unidades, pero diferir en listas de precios, picking, bodegas, crédito y despacho.
- Un almacén y un supermercado pueden compartir el código macro de comercio alimentario, pero requerir escalas distintas de caja, sucursales, inventario, promociones y compras.
- Un restaurante puede tener inventario de ingredientes y recetas, mientras una panadería necesita fórmulas, lotes de producción, rendimiento y pedidos por encargo.
- Una empresa puede vender repuestos y prestar reparación; el onboarding debe permitir perfiles secundarios sin duplicar el negocio ni sus datos.
- Los códigos SII deben guardarse en un campo/relación tributaria específica cuando exista integración formal; jamás dentro de `industry_profile` ni `industry_config`.

## Fuentes y límites

- [SII — 4 puntos claves para emprender](https://www.sii.cl/portales/emprendedor/4puntos_claves.html): 674 actividades, códigos de seis dígitos, ejemplo de minimarket/panadería/papelería y actividades múltiples.
- [SII — Listado de actividades económicas](https://www.sii.cl/ayudas/ayudas_por_servicios/1956-codigos-1959.html?type=3): códigos y descripciones consultados.
- [SII — Homologación de códigos](https://www.sii.cl/destacados/codigos_actividades/homologacion_codigos.pdf): documento de homologación; sirve como referencia histórica, no como sustituto del catálogo actual.

Los códigos no constituyen asesoría tributaria. No se deben inferir obligaciones de IVA, categoría tributaria ni permisos a partir de la etiqueta del perfil de Nüva.
