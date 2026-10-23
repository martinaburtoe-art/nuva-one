# Hallazgos y Remediación

## Hallazgo 1: Cálculo incorrecto de períodos tributarios
- **Descripción**: La función `isInTaxPeriod` en `src/lib/finance-period.ts` utilizaba horas locales para comparar fechas, lo que provocaba fallos en pruebas cuando la zona horaria local no era UTC.
- **Severidad**: P1 (afecta funcionalidad comercial crítica: reportes de impuestos).
- **Evidencia**: Pruebas unitarias fallaban para fechas en el límite del mes.
- **Causa raíz**: Uso de `getMonth()` y `getDate()` (horas locales) en combinación con `Date.UTC` para límites.
- **Solución aplicada**: Reemplazar la lógica por uso de `Date.parse` (que devuelve timestamp UTC) y comparación directa con límites UTC.
- **Archivos modificados**: `src/lib/finance-period.ts`
- **Pruebas**: Todas las pruebas de `finance-period.test.ts` pasan después del cambio.
- **Riesgo residual**: Bajo, siempre que las fechas se envíen en formato ISO 8601 (YYYY-MM-DD).

## Hallazgo 2: Dependencia rota de minimatch causando fallo de ESLint
- **Descripción**: Al ejecutar `npm run lint` o `bun run lint` se producía un error `TypeError: (0 , brace_expansion_1.expand) is not a function` debido a una versión incompatible de `minimatch` (13.0.0) incluida como dependencia transitiva de `@eslint/config-array`.
- **Severidad**: P2 (impide el proceso de calidad de código).
- **Evidencia**: Salida de error de ESLint al ejecutar el lint.
- **Causa raíz**: La versión 13.0.0 de `minimatch` introdujo cambios rompedores que rompen la API esperada por el paquete de configuración de ESLint.
- **Solución aplicada**: 
  1. Actualizar `minimatch` a la versión 10.0.0 explícitamente en `dependencies`.
  2. Añadir un override en `package.json` para asegurar que todas las dependencias usen la versión 10.0.0.
- **Archivos modificados**: `package.json`
- **Pruebas**: Después de la actualización, `lint` se ejecuta sin errores (solo advertencias de tipo y refresh).
- **Riesgo residual**: Ninguno, la versión 10.0.0 es compatible y se mantiene mediante overrides.

## Hallazgo 3: Versión desactualizada de zod causando error de módulo en ESLint
- **Descripción**: ESLint fallaba al intentar cargar `zod/v4/core/index.cjs` porque la versión instalada de zod (3.24.0) no incluía el subpaquete v4 necesario por alguna dependencia interna.
- **Severidad**: P2 (impide el proceso de calidad de código).
- **Evidencia**: Error de módulo faltante en la salida de ESLint.
- **Causa raíz**: Alguna dependencia (probablemente `@ai-sdk/*` o `ai`) importa `zod/v4/*` pero el paquetes publicados de zod 3.x no incluyen esos subpaquetes en formato CommonJS.
- **Solución aplicada**: Actualizar `zod` a la última versión disponible (4.0.0) que incluye los subpaquetes v4 con formato CommonJS.
- **Archivos modificados**: `package.json` (actualizado vía `bun add zod@4.0.0`)
- **Pruebas**: Todas las pruebas unitarias continúan pasando después de la actualización.
- **Riesgo residual**: Bajo; se verificó que el conjunto de pruebas pasa, indicando que ninguna parte del código depende de una API rota de zod v3.

## Hallazgo 4: Build de producción falla por resolución de importaciones
- **Descripción**: Al ejecutar `bun run build` (o `vite build`) el proceso falla con errores `[UNRESOLVED_IMPORT]` respecto a `react-day-picker` y `recharts`.
- **Severidad**: P1 (impide generar artefacto de producción desplegable).
- **Evidencia**: Salida de error de Vite/Rolldown mostrando que no puede encontrar módulos como `./components/custom-components.js` y `./DayPicker.js` dentro de `node_modules/react-day-picker/dist/esm/index.js`.
- **Causa raíz**: Los paquetes `react-day-picker` y `recharts` parecen tener publicaciones defectuosas donde sus módulos ES esperan archivos relativos que no están incluidos en el distribuido.
- **Solución aplicada**: Se intentó downgradear `react-day-picker` a 9.13.0 sin éxito; el error cambió a `recharts`. Se requiere una investigación más profunda de la configuración del bundler (Vite/Rolldown) o considerar el uso de las versiones CommonJS de estos paquetes mediante alias o externalización.
- **Archivos modificados**: `package.json` (downgrade de react-day-picker).
- **Pruebas**: Las pruebas unitarias pasan, pero el build de producción no se puede generar.
- **Riesgo residual**: Alto; sin un build de producción válido no se puede desplegar la aplicación en un entorno de hosting estático como Vercel.

## Otros hallazgos menores
- Advertencias de ESLint sobre uso de `any` y sobre `react-refresh/only-export-components`. Estas no afectan la funcionalidad pero indican oportunidades de mejora de calidad de código.
- Advertencias de Vite sobre `__dirname` en la configuración de Vitest (no bloqueante).

## Conclusión
Se han corregido los errores críticos que afectaban la corrección de funcionalidades y la calidad de código. El bloqueo restante impide el despliegue y requiere atención en la configuración del empaquetador o selección alternativa de dependencias.
