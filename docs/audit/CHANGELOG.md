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
  - Añadir un campo `\"overrides\"` en `package.json` para forzar que todas las dependencias usen la versión 10.0.0.
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

### 5. Investigación y mitigación del fallo de `bun install` (esbuild lifecycle script)
- **Problema**: El comando `bun install` falla con error: `error: failed to enqueue lifecycle scripts for esbuild: ENOENT`, impidiendo la instalación completa de dependencias.
- **Investigación realizada**:
  - Verificado que el binario de esbuild funciona correctamente cuando se invoca directamente (`bun esbuild --version` retorna 0.25.0).
  - Confirmado que el script de postinstall (`node_modules/esbuild/install.js`) se ejecuta sin error cuando se ejecuta manualmente con Node o Bun.
  - Observado que cuando falla el enqueue del lifecycle script, muchas dependencias quedan sin instalar o incompletas (ej. debug, acorn, flatted).
  - Descartado que el problema sea la ausencia del script de instalación (el archivo existe).
  - Sospecha de interferencia de antivirus o permisos de filesystem, pero no se pudo confirmar.
- **Intentos de mitigación**:
  - `bun install --ignore-scripts` sigue fallando con el mismo error de enqueue.
  - Instalación incremental de dependencias faltantes vía `bun add --dev <paquete>` permite avanzar pero cada operación aún reporta "Failed to install 1 package".
  - `npm install --legacy-peer-deps` encontró un error diferente (`ENOENT` durante rename de `caniuse-lite`), sugiriendo posible conflicto de antivirus o bloqueo de archivos.
- **Archivos modificados**:
  - `package.json` (se agregó esbuild como devDependency mediante `bun add --dev esbuild@0.25.0`).
  - `bun.lock` (actualizado tras las operaciones de add).
  - Se creó `bun.lock.backup` como copia de seguridad.
- **Commit**: (no registrado).
- **Pruebas afectadas**: 
  - `lint`: actualmente falla debido a dependencias faltantes (después de instalar acorn, falla por flatted, etc.).
  - `typecheck`: falla debido a ausencia del script `pretotypecheck` en `package.json`.
  - `build`: falla debido a dependencias faltantes (vite, etc.).
  - Test suite: no se pudo ejecutar debido a dependencias faltantes.

## Archivos modificados (lista)
- `src/lib/finance-period.ts`
- `package.json` (varias veces: actualización de minimatch, adición de overrides, actualización de zod, downgrade de react-day-picker, adición de esbuild)
- `bun.lock` (actualizado)
- `bun.lock.backup` (creado)
- `node_modules/` (reinstalado de dependencias, pero no se registran cambios individuales aquí).

## Estado actual del repositorio
- Rama: `work` (creada para auditoría)
- Estado del working tree: cambios en los archivos listados anteriormente.
- El staging area está limpio (no se han hecho `git add` de los cambios, pero se pueden observar con `git diff`).
- No se han creado commits ni se ha hecho push a remoto durante esta sesión.

## Próximos pasos sugeridos para registro formal
1. Crear una rama de auditoría/trabajo (por ejemplo, `audit/2026-10-18`) y hacer commit de los cambios realizados.
2. Abrir un pull request hacia `main` con la descripción de los cambios y solicitar revisión.
3. Tras la aprobación, hacer merge y eliminar la rama temporal.
4. Documentar cualquier decisión de arquitectura o cambio de dependencias en el archivo `ARCHITECTURE.md` o similar si existe.
5. Actualizar el `README.md` si se requieren instrucciones especiales para desarrolladores (por ejemplo, sobre el uso de overrides o versiones específicas de dependencias).
6. Enfocar esfuerzos en resolver el bloqueo de `bun install` antes de proceder con pruebas de calidad y build de producción.

## Notas
- Todos los cambios realizados son de bajo riesgo y están orientados a corregir errores y mejorar la estabilidad del entorno de desarrollo.
- No se ha realizado eliminación de código muerto ni refactorización mayor durante esta sesión.
- Se recomienda mantener un registro de cambios continuo (changelog) a medida que avance el proyecto.
- El bloqueo actual en el sistema de construcción es el principal obstáculo para avanzar con la validación de calidad del producto.
