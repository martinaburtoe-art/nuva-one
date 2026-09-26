# Nüva One — Tooling Factory Stack

## Propósito

Estas herramientas NO forman parte de los módulos comerciales de Nüva One. Son una capa externa de construcción, diseño, documentación, contenido y QA utilizada para acelerar y elevar el desarrollo del producto.

La regla es simple: **Nüva One consume resultados; no depende de estas aplicaciones para funcionar.**

## Stack recomendado

| Herramienta | Rol | Incorporación | Regla |
|---|---|---|---|
| OpenCode | agente principal de ingeniería | Alta | usar para explorar, implementar, refactorizar y validar; provider-agnostic |
| OpenDesign | sistema de diseño y prototipado | Alta | generar/validar UI y DESIGN.md; nunca introducir dependencia runtime |
| Cline | agente secundario / revisión | Alta | segunda opinión, tareas aisladas, MCP y worktrees; no duplicar el mismo trabajo de OpenCode |
| Obsidian | memoria técnica / producto | Alta | fuente documental humana; enlazar decisiones, arquitectura, auditorías y experimentos |
| Hedra | fábrica audiovisual | Alta | producir assets para homepage, demos, campañas y documentación visual; no runtime |
| Hailuo / MiniMax | proveedor/modelo audiovisual | Selectiva | utilizar cuando el resultado sea superior o más eficiente; preferentemente desde un agregador como Hedra |
| Ideogram | identidad visual / imágenes / tipografía | Alta | assets de marca, mockups, diagramas visuales y marketing; no runtime |

## Arquitectura

```text
                    NÜVA ONE
                       │
             ┌─────────┴─────────┐
             │                   │
       Producto/runtime      Knowledge
             │                   │
       React + TS + Vite     Obsidian
       Supabase              ADRs
       Vercel                decisiones
       Agent Council         auditorías
       Action Engine         benchmarks
             │
             └─────────┬─────────┘
                       │
                 FACTORY LAYER
                       │
     ┌──────────┬──────┼──────┬──────────┐
     │          │      │      │          │
 OpenCode  OpenDesign Cline Hedra   Ideogram
     │          │      │      │          │
     └──────────┴──────┴──────┴──────────┘
                       │
                 assets / code / specs
                       │
                    revisión
                       │
                    GitHub
                       │
                     CI/CD
                       │
                    Nüva One
```

## Principios de uso

1. **No vendor lock-in.** Ninguna de estas herramientas debe convertirse en dependencia obligatoria del runtime.
2. **BYOK / local-first cuando sea posible.** Las credenciales y modelos pertenecen al entorno de construcción, no al producto cliente.
3. **Una tarea, un dueño.** OpenCode y Cline no deben modificar simultáneamente el mismo conjunto de archivos.
4. **Diseño como sistema.** OpenDesign debe mantener reglas de marca, tokens, componentes y patrones; no generar pantallas aisladas sin sistema.
5. **Assets reproducibles.** Cada asset audiovisual o visual importante debe guardar prompt, modelo, versión, fecha y licencia/uso permitido.
6. **Obsidian como memoria, GitHub como fuente de verdad del código.** No copiar código desde notas como flujo normal.
7. **Nada de integración runtime por moda.** Una herramienta externa solo entra al producto si existe una necesidad funcional verificable.
8. **QA cruzado.** Para cambios de alto impacto, un agente puede implementar y otro revisar, pero la validación final debe pasar por CI y pruebas del repositorio.

## Flujo operativo recomendado

### 1. Descubrir
OpenCode en modo plan/read-only analiza el repositorio y propone el cambio.

### 2. Diseñar
OpenDesign transforma el requerimiento en un sistema visual reutilizable y, cuando corresponda, actualiza DESIGN.md.

### 3. Implementar
OpenCode ejecuta el cambio sobre una rama dedicada.

### 4. Revisar
Cline realiza una revisión independiente o una tarea acotada, evitando editar el mismo código en paralelo.

### 5. Validar
GitHub Actions ejecuta lint, typecheck, tests, migraciones y build/deploy.

### 6. Documentar
Obsidian registra decisión, evidencia, trade-offs, prompts relevantes y resultado.

### 7. Publicar
Solo los artefactos terminados entran en Nüva One: código, migraciones, assets optimizados y documentación necesaria.

## Audiovisual

Hedra funciona como orquestador creativo cuando conviene porque reúne múltiples modelos de vídeo, incluyendo MiniMax/Hailuo, Kling, Veo y otros. Esto permite seleccionar el modelo por tarea sin convertir Nüva One en una aplicación dependiente de un proveedor concreto.

Para assets críticos conservar:

- prompt maestro;
- imagen de referencia;
- modelo utilizado;
- duración/resolución;
- versión final;
- licencia/condiciones comerciales;
- ruta final en `public/` o storage.

## Hailuo / MiniMax

No se incorpora como SDK o módulo de Nüva One. Se considera una capacidad de la fábrica audiovisual. Si Hedra ya permite utilizar el modelo requerido, se prefiere el flujo unificado; si una generación directa ofrece una ventaja verificable, se puede usar MiniMax/Hailuo externamente.

## Ideogram

Se reserva para:

- dirección de arte;
- imágenes de producto;
- composición con texto;
- posters y piezas de campaña;
- exploración de identidad;
- referencias visuales para OpenDesign.

No se almacenan prompts de clientes ni información sensible en servicios externos.

## Obsidian

Estructura recomendada del vault:

```text
Nüva One/
├── 00 Dashboard/
├── 01 Producto/
├── 02 Arquitectura/
├── 03 Agent Council/
├── 04 Action Engine/
├── 05 Nüva People/
├── 06 Finanzas/
├── 07 Seguridad/
├── 08 UX-UI/
├── 09 Auditorías/
├── 10 Experimentos/
├── 11 Prompts/
├── 12 Assets/
└── ADR/
```

Cada decisión relevante debe tener un ADR breve con: contexto, decisión, alternativas descartadas, evidencia y consecuencia.

## Qué NO incorporar

- WhatsApp como dependencia de producto en esta fase.
- Nüva Studio como módulo o runtime.
- wrappers innecesarios de herramientas externas.
- credenciales de proveedores en el cliente.
- componentes generados que no respeten el design system.
- contenido de marketing sin registro de licencia/uso.
- duplicación de agentes para una misma tarea.

## Criterio de éxito

El stack externo debe reducir tiempo de construcción y aumentar calidad sin aumentar la complejidad del producto. Si mañana desaparece cualquiera de estas herramientas, **Nüva One debe seguir compilando, desplegando y operando normalmente**.
