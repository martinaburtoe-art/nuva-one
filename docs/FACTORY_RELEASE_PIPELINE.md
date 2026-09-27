# Nüva One Factory — Release Pipeline

La Factory no es un módulo del SaaS. Este pipeline es el mecanismo externo que convierte cambios validados en releases trazables.

## Flujo

`Discover → Design → Build → Verify → Release Evidence → Ship → Production Verify → Learn`

### 1. Discover
Registrar objetivo, alcance, restricciones, evidencia y criterios de aceptación.

### 2. Design
Definir UX/UI, comportamiento, estados, accesibilidad y compatibilidad con la arquitectura existente.

### 3. Build
Implementar en una rama de GitHub. Las migraciones de Supabase deben acompañar cualquier cambio de esquema.

### 4. Verify
CI comprueba, según el alcance del cambio:
- integridad de migraciones;
- pgTAP y recovery;
- Factory control plane;
- lint;
- TypeScript;
- tests;
- auditoría de dependencias;
- build.

### 5. Release Evidence
Cuando los gates automáticos terminan correctamente, CI genera `artifacts/factory-release-evidence.json`. El artefacto registra commit, workflow, ejecución y gates superados.

La evidencia no sustituye una verificación de producción.

### 6. Ship
El merge a `main` permite que el pipeline de despliegue de Vercel construya el release.

### 7. Production Verify
Antes de declarar un release como operativo se verifica:
- deployment Vercel en estado READY;
- commit desplegado coincide con el release;
- rutas públicas relevantes responden correctamente;
- ausencia de errores runtime recientes;
- pruebas visuales/E2E cuando el cambio afecta UI.

### 8. Learn
Registrar incidentes, decisiones, resultados y reglas reutilizables. Los aprendizajes vuelven a Knowledge/ADR y alimentan el siguiente ciclo de Factory.

## Regla de oro

**CI verde no significa producción verificada.**

Un release solo se considera completo cuando existe evidencia de CI y evidencia de producción.

## Uso local

`npm run factory:release-evidence`

Genera el mismo artefacto de evidencia sin afirmar que la producción está desplegada.
