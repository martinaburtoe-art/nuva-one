# Flujo de trabajo remoto — Nüva One

Este documento describe cómo desarrollar Nüva One desde un workspace remoto sin depender de tu PC local.

## 1. GitHub Codespaces (recomendado)

### Requisitos
- Tu token de GitHub debe tener el scope `codespace`. Actualmente tiene: `gist`, `read:org`, `repo`, `workflow`.
- Para añadir el scope: `gh auth refresh -h github.com -s codespace`

### Pasos
1. Ve a https://github.com/martinaburtoe-art/nuva-one
2. Haz clic en el botón verde **"Code"** → pestaña **"Codespaces"** → **"Create codespace on main"**
3. Espera a que se complete la instalación (`postCreateCommand` ejecuta `npm install`)
4. Inicia el servidor de desarrollo: `npm run dev`
5. Abre el puerto 3000 que se reenvía automáticamente

### Comandos disponibles
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run lint` | Lint (ESLint) |
| `npm run typecheck` | TypeScript typecheck |
| `npm run verify:migrations` | Verifica integridad de migraciones Supabase |

### Variables de entorno
No commitees `.env`. Copia `.env.example` a `.env.local` y completa los valores en el Codespace. Los secretos nunca se suben al repositorio.

## 2. Flujo de desarrollo permanente

```
Workspace remoto → rama de trabajo → pruebas automáticas → Pull Request → revisión → merge a main → Supabase versionado y verificado → deployment de producción en Vercel → smoke tests
```

### Paso a paso
1. Crea una rama desde `main`: `git checkout -b <nombre-rama>`
2. Realiza tus cambios y haz commit: `git add <archivos> && git commit -m "..."`
3. Sube la rama: `git push origin <nombre-rama>`
4. Abre un PR en GitHub: `gh pr create`
5. Los checks de CI se ejecutan automáticamente (pgTAP, build, tests, lint, typecheck)
6. Tras la revisión y aprobación, haz merge a `main`
7. Vercel despliega automáticamente producción desde `main`
8. Verifica que https://nuva-one.vercel.app/ responde correctamente

## 3. Supabase

### Proyecto remoto
- Ref: `vnzyecnbdqbfuxawzrda`
- Región: us-east-2
- Estado: ACTIVE_HEALTHY

### Migraciones
Todas las migraciones están versionadas en `supabase/migrations/`. Las nuevas migraciones de este PR:
- `20261025120000_people_payroll_owner_admin_select_hardening.sql`
- `20261025130000_people_dashboard_summary_rpc.sql`
- `20261025130001_people_dashboard_summary_rpc_grants.sql`
- `20261025140000_people_operativo_limited_access_rpc.sql`
- `20261025140001_people_operativo_limited_access_rpc_grants.sql`
- `20261025150000_people_rls_select_hardening.sql`

### Pruebas de seguridad
El test pgTAP `supabase/tests/database/099_people_rls_hardening.sql` verifica:
- Políticas RLS en tablas sensibles (nómina, contratos, documentos, liquidaciones, LRE)
- Permisos de funciones RPC (`people_dashboard_summary`)
- El pseudo-rol `PUBLIC` no tiene EXECUTE sobre funciones sensibles

## 4. Vercel

### Producción
- Dominio: https://nuva-one.vercel.app/
- Dashboard: https://nuva-one.vercel.app/dashboard
- Despliegue automático desde `main`

### Preview
Cada PR genera un preview deployment automático en Vercel.

## 5. Recuperación

Si `main` se vuelve inestable:
1. Identifica el último commit bueno en `main`
2. `git checkout <commit-bueno>` en una rama de recuperación
3. Abre un PR de reversión si es necesario
4. Vercel volverá a desplegar desde `main` tras el merge

## 6. Seguridad

- Nunca commitees `.env`, `.env.local` ni archivos con secretos
- `.env.local` está en `.gitignore`
- Usa `vercel env pull` para variables de desarrollo (requiere autenticación Vercel)
- Los secretos de Supabase (service_role key) nunca se exponen en el frontend
