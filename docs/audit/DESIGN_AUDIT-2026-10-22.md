# DESIGN_AUDIT — Nüva One

Fecha: 2026-10-22 · Auditor: Hermes Agent (JARVIS) · Método: inspección de código (tokens, componentes, rutas). Sin navegación visual aún (requiere sesión de prueba) — los estados visuales son de código, no de capturas.

## 1. Sistema de tokens (evidencia: `src/styles.css`)

- **Base sólida y moderna**: Tailwind 4 con `@theme inline`, colores en **oklch** (mejor perceptualmente que hex), tema claro + oscuro completo y coherente (`:root` / `.dark`): background, foreground, card, popover, primary (+glow), secondary, muted, accent, destructive, success, warning, border, input, ring, chart-1..5, sidebar-* (7 tokens).
- Escala de radios derivada (`--radius: 0.75rem` + calc), tres niveles de sombra (`soft`, `elegant`, `glow`), tres gradientes utilitarios, utilidad `.glass` con blur.
- Tipografía: Inter + system stack, `font-feature-settings "cv11","ss01"`, antialiasing. Sin escala tipográfica tokenizada explícita (los tamaños viven en utilidades Tailwind) — candidato a tokenizar para el rediseño.
- **Identidad de marca vs tokens**: paleta declarada (negro #080809, dorado #E6C687, índigo #6366F1). El índigo está representado (oklch 0.35 0.18 270 ≈ índigo profundo; 0.65 0.22 268 en dark). El **dorado no aparece centralizado** en `src/styles.css` — su uso vive disperso en componentes/rutas (verificar y tokenizar como `--gold` / `--accent-gold` con par claro/oscuro).
- **Accesibilidad — PASS parcial**: `prefers-reduced-motion` manejado GLOBALMENTE (animations/transitions a 0.001ms) — excelente; `:focus-visible` global con outline 2px ring — PASS; safe-areas móviles (`env(safe-area-inset-*):`) — PASS; touch-action/tap-highlight en móvil — PASS.

## 2. Componentes (evidencia: `src/components/ui/` — 47 archivos)

Base shadcn/Radix completa: accordion, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, command, context-menu, currency-input (propio), dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner (toasts), switch, table, tabs, textarea, toast, tooltip, etc.

- Riesgo de duplicación: `toast.tsx` + `sonner` coexisten; `alert.tsx` vs `alert-dialog` — auditar cuál se usa de verdad por módulo antes de unificar.
- Los errores de tipos Radix de la ronda 1 de tsc eran síntoma de instalación dañada, NO del código — con node_modules sano, `tsc` pasa sin tocar los componentes. No reescribir la librería: **no existe una segunda biblioteca que crear**.

## 3. Dashboard / Resumen (ruta prioritaria)

- Ruta: `src/routes/_authenticated/dashboard.tsx` + `dashboard-shell.tsx`; commits recientes en main: "apply premium Resumen dashboard", "match light frosted-glass reference", "improve contrast on light dashboard cards" — hay una línea de trabajo activa de rediseño del Resumen.
- **PR #230 abierto** (`fix/resumen-fullscreen-dashboard-20261017`): rediseño del Resumen a dashboard fullscreen PENDIENTE de revisión/fusión — es la referencia inmediata de evolución visual; revisar su diff antes de tocar el dashboard (evitar duplicar esfuerzo).
- PR #231 (SEO técnico) también abierto.
- La petición previa de "replicar la referencia visual del dashboard" no tiene assets adjuntos en el repo local localizables — la referencia operativa disponible son los 3 commits de Resumen ya en main + el PR #230. Documentado como limitación; no se ha reproducido nada "con fidelidad" sin esa referencia.

## 4. Animaciones y motion

- `nuva-motion-system.css` (sistema propio) + `tw-animate-css` + keyframes locales (`fade-in-up` con cubic-bezier(0.16,1,0.3,1) — curva de calidad, `scan` para scanner). Sin Framer Motion — decisión razonable: la base CSS cubre microinteracciones sin peso extra. El rediseño puede mantener CSS salvo necesitar orquestación compleja (en ese caso, evaluar `motion` solo para el dashboard).
- `prefers-reduced-motion` ya respetado globalmente (ver 1).

## 5. Plan incremental de mejoras (Fase Cuatro — sin ejecutar aún)

1. **Incremento 1 — Dashboard/Resumen**: revisar y completar PR #230 (fullscreen) con evidencia visual (capturas antes/después en 4 breakpoints); tokenizar el dorado; jerarquía tipográfica del resumen.
2. **Incremento 2 — Componentes compartidos**: auditar duplicaciones (toast/sonner, alert), estados vacíos y skeletons consistentes, densidad de tablas unificada.
3. **Incremento 3 — Resto de módulos**: aplicar tokens a rutas divergentes; retirar los 5 CSS experimentales de home que hayan quedado muertos.
4. Verificación en cada incremento: build + capturas + contraste + reduced-motion (dogfood/browser).

## 6. Pendiente por falta de acceso

- Captura y comparación visual real del dashboard (necesita cuenta de prueba o sesión del usuario).
- Lighthouse y verificación responsive en navegador (cuando haya entorno).
