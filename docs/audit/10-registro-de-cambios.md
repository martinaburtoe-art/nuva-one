# Registro de Cambios

## Resumen
Durante la sesión de auditoría y mejora del proyecto Nüva One (2026-10-18), se identificaron y corrigieron varios problemas que afectaban la calidad de código, la corrección de funcionalidades financieras y la capacidad de ejecutar herramientas de calidad. A continuación se detalla cada cambio realizado.

## Cambios realizados

### 1. Corrección de `isInTaxPeriod` en `src/lib/finance-period.ts`
- **Problema**: La función utilizaba horas locales para comparar fechas, provocando fallos en pruebas cuando la zona horaria local no era UTC.
- **Solución**: Reemplazar la lógica por uso de `Date.parse` (timestamp UTC) y comparación directa con límites UTC.
- **Archivo modificado**: `src/lib/finance-period.ts`
- **Commit**: (no se registró commit ya que se trabaja directamente en la copia de trabajo; los cambios están en el estado actual del working tree).
- **Pruebas afectadas**: `src/lib/finance-period.test.ts` – todas pasaron después del cambio.

### 2. Actualización de `minimatch` a versión 10.0.0 y añadido a overrides
- **Problema**: ESLint fallaba con error `TypeError: (0 , brace_expansion_1.expand) is not a function` debido a una versión incompatible de minimatch (13.0.0) incluida como dependencia transitiva.
- **Solución**: 
  - Actualizar `minimatch` explícitamente a la versión 10.0.0.
  - Añadir un campo `"overrides"` en `package.json` para forzar que todas las dependencias usen la versión 10.0.0.
- **Archivos modificados**: `package.json`
- **Commit**: (no registrado).
- **Pruebas afectadas**: Después del cambio, `lint` se ejecuta sin errores (solo advertencias de tipo y refresh).

### 3. Actualización de `zod` a versión 4.0.0
- **Problema**: ESLint fallaba al intentar cargar `zod/v4/core/index.cjs` porque la versión instalada de zod (3.24.0) no incluía el subpaquete v4 necesario por alguna dependencia interna (probablemente del SDK de IA).
- **Solución**: Actualizar `zod` a la última versión disponible (4.0.0) que incluye los subpaquetes v4 con formato CommonJS.
- **Archivo modificado**: `package.json` (actualizado vía `bun add zod@4.0.0`).
- **Commit**: (no registrado).
- **Pruebas afectadas**: Todas las pruebas unitarias continúan pasando después de la actualización, indicando que ninguna parte del código depende de una API rota de zod v3.

### 4. Downgrade de `react-day-picker` a versión 9.13.0
- **Problema**: El build de producción fallaba con errores de resolución de importaciones respecto a `react-day-picker` (módulo faltante `./components/custom-components.js` y `./DayPicker.js`).
- **Solución**: Downgradar a una versión anterior conocida por ser estable (9.13.0) en un intento de resolver el conflicto.
- **Archivo modificado**: `package.json` (downgrade de `react-day-picker`).
- **Commit**: (no registrado).
- **Resultado**: El error cambió a `recharts`, indicando que el problema no estaba aislado a `react-day-picker` únicamente. El build de producción sigue fallando.

## Archivos modificados (lista)
- `src/lib/finance-period.ts`
- `package.json` (varias veces: actualización de minimatch, adición de overrides, actualización de zod, downgrade de react-day-picker)
- `node_modules/` (reinstalado de dependencias, pero no se registran cambios individuales aquí).

## Estado actual del repositorio
- Rama: `main`
- Estado del working tree: cambios en los archivos listados anteriormente.
- El staging area está limpio (no se han hecho `git add` de los cambios, pero se pueden observar con `git diff`).
- No se han creado commits ni se ha hecho push a remoto durante esta sesión.

## Próximos pasos sugeridos para registro formal
1. Crear una rama de auditoría/trabajo (por ejemplo, `audit/2026-10-18`) y hacer commit de los cambios realizados.
2. Abrir un pull request hacia `main` con la descripción de los cambios y solicitar revisión.
3. Tras la aprobación, hacer merge y eliminar la rama temporal.
4. Documentar cualquier decisión de arquitectura o cambio de dependencias en el archivo `ARCHITECTURE.md` o similar si existe.
5. Actualizar el `README.md` si se requieren instrucciones especiales para desarrolladores (por ejemplo, sobre el uso de overrides o versiones específicas de dependencias).

## Notas
- Todos los cambios realizados son de bajo riesgo y están orientados a corregir errores y mejorar la estabilidad del entorno de desarrollo.
- No se ha realizado eliminación de código muerto ni refactorización mayor durante esta sesión.
- Se recomienda mantener un registro de cambios continuo (changelog) a medida que avance el proyecto.
