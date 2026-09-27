# Nüva One Factory — Learning Loop

La etapa **Learn** cierra el ciclo de release sin convertir la Factory en parte del runtime de Nüva One.

## Flujo completo

> Estado de implementación: Learning Loop integrado en `main`.

`Discover → Design → Build → Verify → Release Evidence → Ship → Production Verify → Learn → Knowledge`

## Qué registra Learn

Cada release puede producir un registro de aprendizaje con:

- objetivo y alcance del cambio;
- resultado esperado;
- evidencia automática de CI;
- evidencia de producción;
- resultado real observado;
- incidentes y regresiones;
- decisiones tomadas durante la validación;
- aprendizajes;
- reglas reutilizables para futuras tareas;
- seguimiento pendiente.

## Regla de evidencia

La Factory **no inventa resultados de producción**.

El registro puede comenzar con información del release y expectativas, pero `actual_outcomes`, `production_evidence`, `incidents` y `regressions` deben completarse con evidencia real después de verificar producción.

Por eso el pipeline separa:

1. **Release Evidence:** generado automáticamente por CI.
2. **Production Verify:** comprobación real del deployment.
3. **Learn:** interpretación documentada de los resultados observados.
4. **Knowledge:** reglas y decisiones que pueden reutilizarse.

## Artefacto

Los registros siguen el esquema:

`docs/knowledge/release-learning/*.json`

El validador es:

`npm run factory:validate-learning -- <archivo>`

Ejemplo:

`npm run factory:validate-learning -- docs/knowledge/release-learning/2026-09-27-example.json`

El comando valida estructura y coherencia; no certifica que una afirmación sea verdadera. La evidencia debe proceder de CI, Vercel, pruebas o revisión humana verificable.

## Qué entra a Knowledge

Solo se promueven aprendizajes que sean reutilizables:

- reglas de ingeniería;
- reglas de UX/UI;
- patrones de seguridad;
- patrones de pruebas;
- decisiones arquitectónicas;
- prevención de regresiones.

No se almacenan secretos, tokens, datos de clientes ni payloads sensibles.

## Integración con Agent Council

Los hallazgos del Agent Council pueden alimentar `decisions`, `learnings` o `follow_up`, pero la Factory no ejecuta automáticamente cambios de producción a partir de un aprendizaje. El aprendizaje informa el siguiente ciclo; no sustituye CI, revisión ni controles de seguridad.
