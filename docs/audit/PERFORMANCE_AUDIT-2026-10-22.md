# PERFORMANCE_AUDIT — Nüva One

Fecha: 2026-10-22 · Método: build local de producción (`npm run build`, rama `work` + fixes), lectura de chunk table de rolldown/vite 8 · Limitación: sin Lighthouse ni navegación real (requiere sesión autenticada); comparaciones con la referencia histórica (848→662 KB) son indicativas porque cambió el bundler (vite 8/rolldown + TanStack Start SSR).

## Build de producción (PASS, 11.39s + nitro)

- Salida: `.vercel/output/` (preset vercel de nitro): 39 MB totales (cliente + SSR + funciones).
- SSR: chunk router 247.90 kB (gzip 59.32); rutas SSR divididas (settings 71 kB, executive-command-center 82 kB, inventory 111 kB...).

## Bundle cliente — chunks principales (raw)

| Chunk | Tamaño | gzip | Observación |
|---|---|---|---|
| `exceljs.min-*.js` | 908 kB | — | Exportación Excel, **diferido** (no bloquea entrada) |
| `esm-*.js` | 428 kB | — | Dependencia pesada diferida |
| `jspdf.es.min-*.js` | 392 kB | — | Exportación PDF, **diferida** |
| `index-*.js` (entrada) | 368 kB | ~93 kB (ver log) | Entrada principal |
| `generateCategoricalChart-*.js` | 360 kB | — | recharts, diferido por ruta |
| `client-*.js` | 200 kB | — | Cliente supabase/AI |
| `styles-*.css` | 201.49 kB | 28.81 kB | Tailwind 4 + tokens |
| `index-*.css` | 103.89 kB | 18.77 kB | CSS adicional |

- Code-splitting **sano**: iconos lucide como micro-chunks (0.1–0.2 kB), rutas divididas, librerías pesadas cargadas bajo demanda.
- La entrada principal quedó en 368 kB raw — mejor que la referencia histórica de 662 kB, con la salvedad metodológica de arriba.

## Recomendaciones (P3, en backlog)

1. `@radix-ui/*` con `react-popper` anidado duplicado (vite warnings de bundling) — dedup de versiones Radix alineando todas al mismo minor.
2. Migrar `recharts` 2.13 → v3: resuelve el peer conflict con React 19 (deuda estructural, ver EXECUTION_LOG) y moderniza el chunk de gráficos. Requiere QA visual — hacer en incremento propio.
3. Analizar `esm-*.js` (428 kB) para identificar su origen exacto y si admite división.
4. `exceljs` (908 kB) y `jspdf` (392 kB): evaluar alternativas ligeras (SheetJS CE ~ la mitad; pdf-lib) SOLO si el costo de migración lo justifica — hoy están diferidas y no dañan la entrada.
5. Medir Lighthouse/Core Web Vitals sobre preview con sesión real cuando exista cuenta de prueba.
