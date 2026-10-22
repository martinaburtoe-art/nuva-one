# Arquitectura y Mapa Funcional

## Arquitectura general
Nüva One sigue una arquitectura de aplicación monolítica frontend con separación de responsabilidades mediante capas:
- **Presentación**: Componentes React con Tailwind CSS y shadcn/ui.
- **Estado y lógica de cliente**: React Query (TanStack Query) para caché y sincronización con servidor.
- **Comunicación con servidor**: Cliente Supabase (`@supabase/supabase-js`) para autenticación, base de datos en tiempo real y almacenamiento.
- **Rutas y navegación**: TanStack Router con soporte para carga diferida y divisiones de código.
- **Estado global**: Uso de `React Context` y `TanStack Query` para manejar estado de aplicación.
- **Integraciones de IA**: SDK de AI (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) para funcionalidades de chat y asistencia.
- **Pagos**: Integración con Stripe (`stripe`).
- **Movilidad**: Capacitor para empaquetado como aplicación móvil Android/iOS.
- **Build**: Vite con plugin `@tanstack/react-start` para renderizado del servidor y despliegue en Vercel ( mediante Nitros).

## Módulos funcionales identificados
Desde una inspección rápida del árbol de fuentes, se pueden identificar los siguientes módulos:

1. **Autenticación y gestión de usuarios** (`src/lib/auth*`, `src/routes/(auth)*`)
2. **Dashboard y espacios de trabajo** (`src/routes/_authenticated/dashboard.tsx`, `src/components/dashboard-*`)
3. **Finanzas y contabilidad** (`src/lib/finance-*`, `src/components/finance-*`)
4. **Gestión de contactos (CRM)** (`src/lib/crm*`, `src/components/crm*`)
5. **Inventario y productos** (`src/lib/inventory*`, `src/components/inventory*`)
6. **Ventas y cotizaciones** (`src/lib/sales*`, `src/components/sales*`)
7. **Compras y gastos** (`src/lib/purchases*`, `src/components/purchases*`)
8. **Reportes y analítica** (`src/routes/_authenticated/analytics.tsx`, `src/lib/report*`)
9. **Inteligencia artificial** (`src/lib/ai*`, `src/components/ai-chat*`, `src/components/nuva-intelligence*`)
10. **Gestión de organización y sucursales** (`src/lib/org*`, `src/components/org*`)
11. **Configuración y ajustes** (`src/lib/settings*`, `src/components/settings*`)
12. **Notificaciones y actividad** (`src/lib/notifications*`, `src/components/notifications*`)

## Dependencias clave
- **Frontend**: React 19, React DOM, TanStack Query, TanStack Router, Lucide React, Sonner (toast), Zod (validación), React Hook Form.
- **Estilos**: Tailwind CSS, Tailwind Merge, Class Variance Authority, Vaul (paneles desplegables).
- **IA**: AI SDK, OpenAI compatible.
- **Base de datos**: Supabase JS.
- **Pagos**: Stripe.
- **Movilidad**: Capacitor.
- **DevTools**: Vite, TypeScript, ESLint, Vitest, Prettier.

## Estado de implementación
La mayoría de los módulos presentan una interfaz de usuario básica y algunas llamadas a funciones de placeholder. Se requiere una revisión más profunda para determinar qué porcentaje de cada módulo está completamente implementado versus solo esqueleto.

## Integraciones
- **Supabase**: Autenticación, base de datos Postgres en tiempo real, almacenamiento de archivos.
- **Stripe**: Procesamiento de pagos y suscripciones.
- **IA**: Proveedores compatibles con OpenAI (por defecto, se puede configurar otros).
- **Capacitor**: Generación de binarios nativos para Android e iOS.

## Conclusión
La arquitectura es coherente y permite escalar. Sin embargo, se necesita una auditoría más detallada de cada módulo para identificar brechas de funcionalidad, código muerto y oportunidades de mejora.
