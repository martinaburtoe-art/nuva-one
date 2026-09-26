# Nüva One Factory

## Propósito

La Nüva One Factory es la capa externa de construcción y potenciación del producto. No forma parte del runtime comercial de Nüva One y ninguna herramienta externa es una dependencia funcional del SaaS.

## Principios

1. Nüva One sigue funcionando si cualquiera de estas herramientas desaparece.
2. GitHub es la fuente de verdad del código.
3. Supabase es la fuente de verdad de datos y seguridad.
4. Vercel es la fuente de verdad del despliegue.
5. Obsidian conserva conocimiento, decisiones y contexto; no sustituye GitHub.
6. Ningún artefacto generado por IA entra a producción sin validación.
7. No se añaden SDKs, iframes, tracking ni dependencias de estas herramientas al producto sin una decisión explícita.
8. Las herramientas se seleccionan por capacidad, coste, privacidad, exportabilidad y ausencia de vendor lock-in.

## Mapa de herramientas

| Herramienta | Uso Factory | Rol |
|---|---|---|
| OpenCode | implementación, refactor, debugging, tests | agente de ingeniería principal |
| OpenDesign | exploración visual, componentes, design system | agente de diseño |
| Cline | revisión, tareas aisladas, MCP y segunda opinión | agente secundario |
| Obsidian | arquitectura, ADR, auditorías, roadmap y memoria | memoria de proyecto |
| Hedra | vídeo, demos, campañas y piezas audiovisuales | media factory |
| MiniMax / Hailuo | generación audiovisual alternativa | proveedor/modelo creativo |
| Ideogram | dirección de arte, imágenes, tipografía y exploración de marca | visual factory |

## Flujo operativo

1. Discover: Obsidian registra objetivo, restricciones, evidencia y decisión.
2. Design: OpenDesign explora UX/UI y convierte resultados en especificación reproducible.
3. Build: OpenCode implementa sobre una rama de GitHub; Cline puede revisar tareas acotadas.
4. Verify: TypeScript, lint, tests, pgTAP, seguridad, build y validación visual.
5. Media: Hedra, MiniMax/Hailuo e Ideogram producen assets fuera del runtime.
6. Ship: GitHub → CI → Vercel.
7. Learn: resultados, errores y decisiones vuelven a Obsidian y documentación.

## Especialización

### OpenCode
Cambios de código medianos/grandes, análisis, tests, migraciones y refactors.

### OpenDesign
Lenguaje visual: tokens, jerarquía, componentes, responsive behavior, estados vacíos, errores y accesibilidad.

### Cline
Tareas acotadas, MCP, revisión cruzada y experimentos aislados.

### Obsidian
Mantener como mínimo las áreas Architecture, ADR, Audits, Product, Design, AI, Security, Release, Research y Factory.

### Hedra / MiniMax / Hailuo
Masters y variantes audiovisuales. Registrar proveedor/modelo, fecha, finalidad y licencia cuando el asset sea comercial.

### Ideogram
Exploración visual y assets de marca/publicidad. Los aprobados deben exportarse y quedar bajo control de Nüva One.

## Matriz de decisión

Antes de adoptar una herramienta:
- ¿Resuelve una capacidad necesaria?
- ¿Puede exportarse el resultado?
- ¿Introduce lock-in?
- ¿Tiene coste o límites relevantes?
- ¿Qué licencia tiene el output?
- ¿Maneja datos sensibles?
- ¿Puede sustituirse por una herramienta local/open-source?
- ¿Aumenta o reduce la complejidad?

Si no está claro, no se incorpora.

## Separación de producto

Estas herramientas no deben aparecer como módulos de Nüva One, ni en el menú, onboarding del cliente o integraciones comerciales por defecto. La Factory existe para construir mejor Nüva One.

## Seguridad

Nunca enviar a servicios creativos o agentes externos datos de clientes reales, credenciales, tokens, secretos de Supabase/Vercel, información tributaria o laboral identificable ni datos privados de negocios. Para demostraciones usar datasets sintéticos.

## Estado

Esta arquitectura es la base operativa de la Factory y debe evolucionar junto con el producto sin convertirse en dependencia del runtime.
