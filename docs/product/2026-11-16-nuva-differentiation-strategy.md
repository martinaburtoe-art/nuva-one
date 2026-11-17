# Nüva One — estrategia de diferenciación y siguiente nivel

**Fecha:** 16 de noviembre de 2026  
**Estado:** propuesta de producto accionable; no implica que las capacidades descritas estén implementadas.  
**Base técnica revisada:** `main` en `6f72167172279b2d5759395a766ebc3340d852b9`, `package.json`, PR #395, #399, #401, #402, #403 y #404.  
**Objetivo:** construir una ventaja de producto reconocible para empresas chilenas, no otra suite genérica de módulos.

## 1. Decisión estratégica

Nüva One no debe posicionarse como «otro ERP todo en uno» ni intentar ganar por cantidad de módulos. La categoría propuesta es:

> **Nüva One: sistema operativo empresarial con inteligencia contextual para negocios chilenos.**

Promesa funcional: **entender qué está pasando en el negocio, detectar qué requiere atención, explicar por qué y ayudar a ejecutar la siguiente acción con evidencia y control humano.**

La diferenciación no será un tema visual, un chatbot o una lista de integraciones. Será la combinación de:

1. Contexto empresarial local (Chile, CLP, SII, ciclos de caja, obligaciones y prácticas comerciales).
2. Continuidad entre operaciones (cotización, venta, inventario, cobro, compra, gasto y resultado).
3. Inteligencia explicable basada en datos reales del negocio.
4. Una experiencia que convierte señales en trabajo priorizado, no solo indicadores.
5. Aprendizaje operativo por rubro, tamaño y madurez digital sin mezclar datos de clientes.

No afirmar exclusividad legal ni superioridad frente a competidores sin pruebas de mercado.

## 2. Qué puede hacer Nüva diferente

### 2.1 Nüva Pulse — la siguiente mejor acción

Crear una bandeja única y contextual de acciones recomendadas. No otra página de KPIs.

Cada señal debe contener:
- Qué ocurrió.
- Por qué importa para este negocio.
- Evidencia y registros fuente.
- Impacto estimado y método de cálculo.
- Urgencia y fecha límite, si aplica.
- Acción disponible.
- Riesgo, permisos y confirmación humana requerida.
- Estado: nueva, vista, en curso, resuelta, descartada o bloqueada.

Ejemplos que solo deben aparecer cuando los datos lo respalden:
- «Hay 4 cotizaciones sin seguimiento desde hace 5 días; valor potencial CLP $X».
- «El producto A podría quedar bajo stock de seguridad en N días según la velocidad de salida observada».
- «La cobranza X está vencida; el saldo documentado es CLP $Y».
- «La compra propuesta cubre Z días de demanda y supera el presupuesto configurado».

No generar alertas con datos incompletos, no duplicar la misma alerta desde varios módulos y no presentar estimaciones como hechos.

### 2.2 Nüva Business Context — conectar los registros

Desarrollar progresivamente un modelo de relaciones de negocio que conecte:
- Cliente ↔ oportunidad ↔ cotización ↔ venta ↔ documento ↔ pago.
- Producto ↔ movimiento ↔ venta ↔ compra ↔ proveedor ↔ costo.
- Gasto ↔ categoría ↔ periodo ↔ flujo de caja.
- Persona ↔ rol ↔ tarea ↔ autorización, con acceso estrictamente segregado.

No implica crear una base de datos paralela ni reemplazar el modelo actual. Primero mapear entidades, IDs, fuentes y relaciones existentes. Construir una capa de lectura/consulta solo cuando aporte valor y sea segura.

La ventaja será responder preguntas transversales con trazabilidad: «¿Qué clientes explican la caída de caja?», «¿Qué ventas provocaron quiebres de stock?» o «¿Qué cotizaciones convertidas se cobraron realmente?».

### 2.3 Nüva Intelligence — explicar, no solo conversar

La IA debe funcionar como analista operativo:
- Responder con periodo, moneda, filtros y fuentes.
- Mostrar cómo llegó a una conclusión.
- Distinguir hechos, estimaciones, hipótesis y recomendaciones.
- Declarar qué datos faltan y cuándo no puede concluir.
- Permitir abrir el registro de origen.
- Proponer acciones; ejecutar cambios sensibles solo tras autorización explícita.
- Mantener registro de las acciones ejecutadas y su resultado.

La IA no debe inventar datos, crear asientos contables, alterar stock ni emitir documentos tributarios sin validaciones y confirmaciones apropiadas.

### 2.4 Chile-native Operations — contexto local real

Convertir el conocimiento local en experiencia y estados verificables:
- CLP, UF y periodos correctamente identificados.
- Estado real de documentos tributarios y sincronización SII.
- Vencimientos y obligaciones según fuentes oficiales y calendario actualizado.
- Terminología y flujos chilenos, no traducciones de un ERP extranjero.
- Preparación técnica para interoperabilidad financiera, sin prometer acceso bancario antes de cumplir requisitos.

**Oportunidad futura:** la CMF indica que la entrada en vigor del Sistema de Finanzas Abiertas (SFA) está prevista para el 3 de julio de 2027, con hitos de preparación y pruebas previas. Nüva debe estudiar estándares, sandbox, requisitos y modelo de consentimiento desde ahora, pero no vender integración bancaria abierta como capacidad actual.

### 2.5 Industry Playbooks — comenzar con un rubro, no todos

Crear configuraciones y recorridos por tipo de negocio, inicialmente:
1. Comercio minorista y distribuidoras.
2. Servicios profesionales.
3. Negocios con inventario y múltiples sucursales.

Cada playbook debe cambiar onboarding, métricas, alertas, tareas y ejemplos, no duplicar el código ni imponer módulos que el cliente no necesita. Validar la selección mediante entrevistas y pilotos pagados.

## 3. Qué no debemos copiar

| Referente | Aprendizaje | Diferenciación Nüva |
|---|---|---|
| Odoo | Amplitud modular e integración | Menos carga de configuración; tareas y contexto primero |
| Holded | Simplicidad pyme y flujos conectados | Profundidad operativa chilena y decisiones explicables |
| Zoho One | Ecosistema coherente | Una experiencia unificada, no muchas mini-apps |
| QuickBooks / Xero | Claridad financiera y drill-down | Relacionar finanzas con ventas, inventario, compras y cobranza local |
| Bsale | Operación móvil | Móvil centrado en resolver tareas en terreno y punto de venta |
| Defontana / Nubox | Contexto tributario y contable chileno | Conectar cumplimiento con la operación diaria y sus consecuencias |

La comparación es una hipótesis estratégica, no un estudio de cuota de mercado ni una afirmación de superioridad. Debe validarse con entrevistas y pruebas de tareas frente a productos reales.

## 4. Diagnóstico de ejecución: el cuello de botella actual

La revisión de PR muestra una cadena de cambios abiertos y evidencia desigual:

| PR | Estado observado | Implicación |
|---|---|---|
| #395 | Draft; CI integral y QA visual autenticado pendientes; declara que PostHog no recibe eventos y replay está desactivado | No hay evidencia conductual para saber dónde se atascan los usuarios |
| #399 | Draft; depende de #398 y no tenía validación integral | Rama de UX encadenada |
| #401 | Draft documental; apilado sobre #399 | La auditoría no es todavía una decisión implementada |
| #402 | Draft; depende de #401; sin typecheck/tests/lint/build declarados | Finanzas no debe promoverse sin validar |
| #403 | Draft y mergeable=false; depende de #402; validaciones de código pendientes | Dashboard visual bloqueado |
| #404 | Draft; preview READY, CI Fast, People build, Safety y Production Smoke reportados PASS; CI integral pendiente; inspección visual manual pendiente | No declarar lanzamiento comercial todavía |

**Conclusión operativa:** congelar nuevas ramas visuales no esenciales hasta resolver la cadena, consolidar una rama integrable y validar un conjunto de experiencia coherente. No fusionar por orden numérico ni saltarse dependencias. Confirmar el estado actualizado de cada PR antes de cualquier merge.

## 5. Brechas técnicas y de producto que sí se pueden afirmar

### Evidencia directa
- El `package.json` de `main` no declara SDK de PostHog.
- La búsqueda de código en la rama por defecto no encontró referencias a PostHog.
- PR #395 declara explícitamente cero eventos ingeridos y grabaciones de sesión desactivadas.
- PR #404 declara que CI integral y revisión visual autenticada siguen pendientes.
- PR #403 declara que faltan typecheck, tests, lint, build y QA visual sobre su commit.
- La auditoría competitiva #401 detectó demasiados destinos financieros y de inteligencia de nivel equivalente, además de una ruta financiera extensa.

### Lo que todavía no está demostrado
- Activación, retención, conversión demo→pago y adopción por módulo.
- Las tareas más abandonadas por clientes reales.
- Rendimiento de producción por dispositivo y red.
- Calidad percibida frente a competidores en pruebas moderadas.
- Integridad de cada flujo comercial completo desde una sesión de usuario real.
- Disposición a pagar y cuál es el rubro inicial con mejor encaje.

No inventar métricas ni declarar que una función está conectada porque exista un botón o una pantalla.

## 6. Instrumentación de producto: instalar solo lo que falta

### Primera elección: PostHog

La revisión de `main` no encuentra el SDK; por lo tanto, no debe asumirse que está integrado. Antes de instalarlo:
1. Confirmar si existe un proyecto PostHog, región, token público y responsable de acceso.
2. Definir eventos con nombres y propiedades permitidas.
3. Excluir datos financieros, tributarios, personales, credenciales, textos libres, payloads y datos de clientes.
4. No activar Session Replay en pantallas autenticadas/financieras por defecto.
5. Si se habilita replay, aplicar máscara total de texto e inputs por defecto, lista explícita de elementos no sensibles, scrub de URL y red, y pruebas con datos sintéticos.
6. Respetar consentimiento, privacidad, retención y normativa aplicable.
7. Validar ingestión en un entorno de prueba antes de producción.

Eventos iniciales sin PII:
- `onboarding_step_completed` (step_id, elapsed_bucket).
- `first_value_action_completed` (action_type).
- `module_opened` (module_id).
- `workflow_started` / `workflow_completed` (workflow_id).
- `workflow_blocked` (reason_code).
- `integration_status_changed` (integration_type, status_code).
- `help_requested` (category).

No enviar nombres, correos, RUT, montos, IDs de clientes, textos de documentos ni datos de formularios.

### QA y observabilidad
- Mantener Playwright para recorridos críticos y capturas comparativas.
- Integrar axe en pruebas y revisión manual WCAG 2.2.
- Usar Vercel para deployments y métricas disponibles.
- Añadir Sentry solo si PostHog/Vercel no cubren los errores que necesitamos diagnosticar.
- Storybook solo cuando los componentes compartidos y tokens estén estabilizados.
- No añadir otra base de datos analítica ni otro framework de UI sin una necesidad demostrada.

## 7. Roadmap de 90 días con puertas de salida

### Sprint 0 — recuperar foco (1 semana)
- Congelar nuevos PR cosméticos.
- Revisar dependencias y estados de #395, #398, #399, #401–#404.
- Elegir una rama integrable y correr typecheck, tests, lint, build, smoke y QA visual.
- Resolver conflictos y documentar qué queda fuera.
- Publicar un solo preview de referencia.

**Salida:** una experiencia integrada candidata; sin despliegue productivo hasta aprobación.

### Sprint 1 — medir sin invadir privacidad (1 semana)
- Confirmar proyecto PostHog y credenciales en entorno seguro.
- Implementar eventos permitidos en entorno de prueba.
- Probar que no salen PII ni datos comerciales.
- Definir embudos: onboarding, primera venta, primera cotización, primer cobro y primera reposición.

**Salida:** eventos verificados y dashboard con datos reales, no capturas ficticias.

### Sprint 2 — entregar un flujo memorable (2 semanas)
Elegir el flujo de mayor valor con usuarios piloto. Hipótesis inicial: cotización → venta → cobro → actualización de inventario, según el rubro.
- Una captura de datos, no doble digitación.
- Estado claro en cada etapa.
- Historial y evidencia.
- Próxima acción contextual.
- UX móvil optimizada.

**Salida:** 5 usuarios piloto pueden completar la tarea sin asistencia; registrar tasa de éxito, tiempo y errores.

### Sprint 3 — Nüva Pulse (2 semanas)
- Construir una primera bandeja de 3–5 tipos de señales determinísticas.
- Evidencia enlazada al registro origen.
- Impacto solo si es calculable.
- Dedupe, snooze, asignación y resolución.
- Confirmación antes de acciones de riesgo.

**Salida:** cada recomendación se puede explicar y verificar.

### Sprint 4 — primer playbook sectorial (2 semanas)
- Entrevistas con 8–12 negocios del mismo rubro.
- Seleccionar el flujo repetido de mayor dolor.
- Configuración inicial guiada.
- Métricas y alertas específicas.
- Probar disposición a pagar.

**Salida:** un segmento inicial con problema y propuesta de valor confirmados.

### Sprint 5 — robustez y lanzamiento (2 semanas)
- Accesibilidad WCAG 2.2 AA como objetivo de diseño y validación.
- Rendimiento real de producción.
- Seguridad y permisos por rol.
- Soporte, recuperación y monitoreo.
- Pruebas de carga y smoke de flujos.
- SHA exacto desplegado y rollback documentado.

**Salida:** checklist de lanzamiento firmado con evidencia.

## 8. Métricas de decisión

No fijar objetivos porcentuales arbitrarios antes de medir la línea base. Medir:
- Time-to-first-value.
- Tasa de finalización de onboarding.
- Activación por rubro.
- Conversión demo→pago.
- Éxito de flujos críticos.
- Tiempo de completar tareas.
- Errores por flujo y por dispositivo.
- Retención por cohorte.
- Porcentaje de recomendaciones aceptadas, descartadas y resueltas.
- Porcentaje de recomendaciones con evidencia suficiente.

Cada métrica tendrá definición, denominador, periodo, fuente y propietario.

## 9. Decisiones de no hacer

- No sumar más módulos por marketing.
- No añadir otra librería de componentes si Radix/Tailwind ya resuelven el caso.
- No instalar Mixpanel/Amplitude junto con PostHog sin caso de uso.
- No instalar Sentry por duplicación preventiva.
- No usar IA generativa para inventar alertas, métricas o datos contables.
- No crear integraciones bancarias no autorizadas ni hacer scraping de bancos.
- No activar grabación de sesiones sobre datos sensibles.
- No publicar cambios visuales sin revisión en dispositivo real.
- No hacer merge de ramas apiladas sin verificar la base y los checks.

## 10. Fuentes y fundamento

### Investigación de mercado y contexto chileno
- Ministerio de Economía, estrategia Digitaliza tu Pyme 2025: https://www.economia.gob.cl/wp-content/uploads/2026/03/100326-doc-estrategia-de-digitalizacion.pdf
- Ministerio de Desarrollo Social, programa Digitaliza tu Pyme y resultados de Chequeo Digital: https://bips.ministeriodesarrollosocial.gob.cl/docs/informes/2026/87129%20-%20Digitaliza%20tu%20Pyme%20%28Ex%20Pymes%20Digitales%29.html
- Banco Central, Informe de Percepciones de Negocios, febrero 2026: https://www.bcentral.cl/documents/33528/8120184/Informe%2Bde%2BPercepciones%2Bde%2BNegocios%2BFebrero%2B2026.pdf/d0b183aa-ac9a-47d7-3c5a-2c6c7149b1dd?t=1770236583268

### Regulación e interoperabilidad
- CMF, modificación NCG 514 y entrada en vigor del SFA en julio 2027: https://www.cmfchile.cl/portal/prensa/625/w4-article-110881.html
- CMF, Sandbox Tecnológico ATENA: https://cmfchile.cl/portal/prensa/625/w4-article-113897.html

### Producto, privacidad y calidad
- PostHog Session Replay: https://posthog.com/docs/session-replay
- PostHog privacy controls: https://posthog.com/docs/session-replay/privacy
- W3C WCAG 2.2: https://www.w3.org/TR/wcag/
- Nielsen Norman Group, 10 usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/

### Fundamentos bibliográficos
- Don Norman, *The Design of Everyday Things*.
- Steve Krug, *Don't Make Me Think*.
- Preece, Rogers & Sharp, *Interaction Design: Beyond Human-Computer Interaction*.
- Jakob Nielsen, *Usability Engineering*.
- John Ousterhout, *A Philosophy of Software Design*.
- Martin Kleppmann, *Designing Data-Intensive Applications*.
- Martin Fowler, *Refactoring*.

---

## Dictamen

**Nüva One tiene amplitud funcional y una identidad visual en construcción. Su siguiente ventaja competitiva debe ser el contexto y la acción: conectar los datos reales del negocio chileno, anticipar problemas operativos explicables y guiar al usuario hasta resolverlos.**

El orden correcto es: cerrar integración y QA → medir comportamiento con privacidad → perfeccionar un flujo comercial → entregar Nüva Pulse → validar un playbook sectorial → escalar.

Este documento es una estrategia y una especificación de trabajo. No certifica que las capacidades descritas estén implementadas ni que exista validación con clientes.
