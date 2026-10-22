# CONNECTIONS_AUDIT — Nüva One

Fecha: 2026-10-21 · Auditor: Hermes Agent (JARVIS) · Convención: PASS / WARN / FAIL / UNKNOWN / BLOCKED

## Matriz de conexiones

| Servicio | Acceso local | Acceso remoto | Permisos | Prueba ejecutada | Estado | Bloqueos |
|---|---|---|---|---|---|---|
| GitHub (repo nuva-one) | gh CLI autenticado (martinaburtoe-art, keyring) | `gh repo view` OK; default branch `main`; repo público | lectura ✓; escritura ✓ (push autorizado por cuenta) | `gh auth status`, `gh repo view`, `gh pr list`, `gh run list` | **PASS** | — |
| GitHub Actions | — | 5 workflows programados activos, último run 2026-10-21T23:28Z, todos `success` | lectura ✓ | `gh run list` | **PASS** | — |
| GitHub branch protection | — | `GET /branches/main/protection` → 404 | — | `gh api` | **WARN** (hallazgo: main sin protección) | decisión del propietario |
| Supabase — identidad del proyecto | `supabase/config.toml` → `project_id = vnzyecnbdqbfuxawzrda` | URL del bundle desplegado = `https://vnzyecnbdqbfuxawzrda.supabase.co` | solo lectura pública | extracción desde bundle + curl | **PASS** (identidad confirmada) | — |
| Supabase — Data API (REST) | publishable key extraída del bundle (pública por diseño) | sondas con apikey válido, sin Bearer | anon (RLS) | `GET /rest/v1/<tabla>` → `42501 permission denied` en tablas existentes | **PASS** (anon denegado por RLS/grants — correcto) | verificación con usuario autenticado: pendiente |
| Supabase — CLI gestión | CLI 2.109.1 instalada | `SUPABASE_ACCESS_TOKEN` NO configurado | ninguno sin token | check de env | **BLOCKED** | requiere access token del usuario (no exponer en chat) |
| Vercel — CLI | 59.14.0 instalado, `.vercel/` sin `project.json` | `vercel whoami` → "Logged out" | ninguno | whoami | **BLOCKED** | requiere `vercel login` (acción del usuario) |
| Vercel — sitio desplegado | — | `GET https://nuva-one.vercel.app/` → 200; `/dashboard` → 200 | público | curl | **PASS** (servicio arriba) | no implica funcionalidad tras login |
| Proveedores de IA (app) | `@ai-sdk/openai-compatible`, groq/openai/lovable en `.env.example` | no verificado | — | pendiente inspección de código | **UNKNOWN** | — |
| Stripe | `.env.example` define STRIPE_SECRET_KEY/WEBHOOK/PRICE_ID | no verificado | — | pendiente | **UNKNOWN** | no ejecutar cobros |
| MercadoPago | `.env.example` define 3 vars | no verificado | — | pendiente | **UNKNOWN** | — |
| Meta / WhatsApp Business | `.env.example` define 6 vars | no verificado | — | pendiente | **UNKNOWN** | — |

## Detalle GitHub

- Cuenta activa: `martinaburtoe-art` (keyring). Repositorio accesible, público, último push 2026-10-18.
- 5 PRs abiertos: #231 SEO técnico (feat/openseo-technical-seo-20261017), #230 Resumen fullscreen, #227 knip dependency audit, #222 fix agency worker, #219 docs readiness. Ninguno fusionado por este auditor (fusión = impacto producción, requiere autorización).
- `main` SIN branch protection → cualquier push directo dispara despliegue a producción. **Recomendación P2**: activar protección + requerir PR.

## Detalle Supabase

- Identidad confirmada por dos fuentes independientes (config.toml local + bundle desplegado).
- Resuelto (v4): los 401 del sondeo eran `42501 permission denied for table X` de PostgreSQL — la publishable key es VÁLIDA; las tablas `profiles`, `products`, `sales`, `customers`, `inventory_movements` EXISTEN y DENIEGAN lectura anónima (correcto por defecto). 404 en `organizations`, `invoices`, `purchase_orders`, `expenses`, `employees`, `accounting_entries` = no expuestas al Data API para el rol anon (o nombre distinto). El endpoint raíz `/rest/v1/` exige clave SECRETA (comportamiento actual de Supabase; no es un fallo). Verificación con usuario autenticado y matriz RLS completa desde migraciones: pendiente.
- Gestión administrativa (migraciones, RLS, logs) requiere `SUPABASE_ACCESS_TOKEN` del usuario: configurar vía `hermes config set` o export en shell del usuario — nunca pegar el token en el chat.

## Detalle Vercel

- CLI deslogueado y `.vercel/project.json` ausente → no se pueden listar deployments, variables por entorno, ni promover previews. Todo despliegue queda **BLOCKED** hasta `vercel login` (login interactivo del usuario).
- El sitio en producción responde 200 — el despliegue automático por GitHub (Vercel Git integration) sigue funcionando sin CLI.

## Pendientes

1. Completar sondeo REST/RLS v2 (en curso).
2. Login Vercel (usuario).
3. Token Supabase (usuario, opcional para gestión).
4. Verificar proveedores IA/pagos desde el código (fase de auditoría interna).
