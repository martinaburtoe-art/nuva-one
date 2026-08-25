# NÜVA ONE — PLAN MAESTRO DE PREPARACIÓN Y FINANCIAMIENTO 2026

## Norte estratégico

**Maule como laboratorio de validación → Chile como mercado → Latinoamérica como expansión.**

El objetivo no es fabricar una postulación bonita. Es construir evidencia real para que el producto pueda defenderse frente a evaluadores, clientes y futuros inversionistas.

## TABLERO A — PRODUCTO

| Prioridad | Qué hacer | Por qué | Fondo | Resultado | Dependencia |
|---|---|---|---|---|---|
| P0 | Formalizar Nüva Intelligence Engine | Crear una tesis tecnológica única | Ambos | Arquitectura y narrativa central | Ninguna |
| P0 | Integrar ventas/compras/inventario/CRM/finanzas en señales | El valor diferencial está en el contexto cruzado | Ambos | Señales empresariales unificadas | Datos existentes |
| P0 | Diagnóstico explicable | La IA debe explicar el porqué | Ambos | Recomendaciones trazables | Intelligence Engine |
| P0 | Alertas accionables | Convertir análisis en acción | Ambos | Alertas con severidad, causa y acción | Señales |
| P0 | Medición de resultados | Sin métricas no existe validación | Ambos | KPI de impacto por empresa | Pilotos |
| P0 | Finanzas/contabilidad/tributario | Es un núcleo de decisión y diferenciación local | Semilla Inicia | Workspace profesional | Esquema actual |
| P1 | Conciliación bancaria | Mejora automatización financiera | Ambos | Flujo conciliado | Integraciones |
| P1 | CxC/CxP + aging | Alimenta cash forecasting | Ambos | Riesgo de liquidez | Datos financieros |
| P1 | Forecast verificable | Demostrar predicción sin inventar datos | Ambos | Escenarios con fuente | Histórico |
| P1 | Learning loop de IA | Crear activo de datos/feedback | BUILD | Métricas de recomendaciones | Instrumentación |
| P2 | Canal contador | Reduce barrera de adopción contable | Semilla Inicia | Red de validadores | Producto estable |
| P3 | Módulos sociales secundarios | No aportan a la tesis central | — | Mantener solo si tienen tracción | Validación |

## TABLERO B — FINANCIAMIENTO

| Prioridad | Qué hacer | Por qué | Fondo | Resultado | Dependencia |
|---|---|---|---|---|---|
| P0 | Monitorizar convocatoria Semilla Inicia Maule 2026 | No existe aún base vigente localizada que podamos tratar como definitiva | Semilla Inicia | Matriz actualizada | Publicación oficial |
| P0 | Monitorizar próxima BUILD | BIG 12 está cerrada | BUILD | Calendario real | Nueva convocatoria |
| P0 | No constituir todavía | Preservar antigüedad/elegibilidad | Ambos | Flexibilidad jurídica | Bases vigentes |
| P0 | 20 entrevistas MiPyme | Validar problema y ICP | Ambos | Evidencia primaria | Guion de entrevista |
| P0 | 10 entrevistas contadores | Validar contabilidad/tributario | Semilla Inicia | Requisitos reales y objeciones | Guion |
| P0 | 5 pilotos | Probar producto real | Ambos | Uso y resultados | ICP |
| P0 | 3 cartas de intención | Demostrar demanda | Ambos | Evidencia comercial | Pilotos |
| P0 | 10 empresas beta | Demostrar adopción | BUILD | Métricas | Pilotos |
| P0 | Instrumentar métricas | Convertir uso en evidencia | Ambos | Dashboard de tracción | Producto |
| P1 | Primeros clientes pagadores | Validación fuerte | Ambos | Ingresos reales | Pricing |
| P1 | Casos de éxito | Demostrar impacto | Ambos | 2 casos cuantificados | Clientes |
| P1 | Data room | Acelerar due diligence | Ambos | Carpeta lista | Documentación |
| P1 | Pitch 90s / 3min | Consistencia narrativa | Ambos | Pitch listo | Evidencia |
| P1 | Video | Requisito potencial y comunicación | Según bases | Video final | Pitch |
| P1 | Presupuesto por actividad | Justificar cada peso | Según bases | Budget auditable | Bases |
| P1 | Gantt | Alinear ejecución y gasto | Según bases | Plan ejecutable | Budget |
| P2 | Partnerships | Escalar distribución | BUILD | Canal | Validación |
| P2 | Contadores como canal | Escalar adopción | Semilla Inicia | Pipeline | Producto |
| P3 | LatAm | Escalar después de Chile | Ambos | Plan de expansión | PMF inicial |

## Sprint 0 — Seguridad y confiabilidad

### Objetivo
Eliminar riesgos técnicos que puedan destruir confianza durante una demo o due diligence.

### Acciones

- Revisar funciones SECURITY DEFINER con acceso authenticated.
- Mantener checks de pertenencia al negocio dentro de funciones sensibles.
- Verificar RLS de tablas nuevas.
- Ejecutar advisors de seguridad y performance antes de cada release importante.
- Mantener pruebas de tenant isolation.
- Verificar que no existan errores runtime en producción.

### Criterio de terminado

- 0 errores runtime críticos.
- 0 bypass de tenant identificado.
- Todas las funciones sensibles tienen autorización explícita o están restringidas a roles internos.
- Migraciones reproducibles.

## Sprint 1 — Validación

### Objetivo
Convertir Nüva de producto funcional a producto validado.

### Acciones

1. Seleccionar ICP inicial: MiPyme chilena con operación real, múltiples procesos y necesidad de visibilidad financiera.
2. Reclutar 20 entrevistas.
3. Registrar problema, herramienta actual, costo, frecuencia y disposición a pagar.
4. Seleccionar 5 pilotos.
5. Medir onboarding, activación, uso, problemas y resultados.
6. Generar cartas de intención cuando exista intención real.

### Criterio de terminado

No se declara "validado" hasta tener evidencia documentada.

## Sprint 2 — Nüva Intelligence

### Arquitectura

**Datos → Contexto → Señales → Diagnóstico → Explicación → Recomendación → Acción → Resultado → Feedback.**

### Ejemplo

Ventas caen 18% vs periodo anterior.

↓

Nüva detecta caída.

↓

Cruza productos, clientes, inventario y margen.

↓

Explica posibles causas con evidencia disponible.

↓

Propone acción.

↓

Usuario acepta/descarta.

↓

Nüva registra resultado.

Este ciclo es la base de la diferenciación tecnológica.

## Sprint 3 — Finanzas profesionales

### Debe quedar listo para piloto

- Estado de resultados.
- Balance.
- Flujo de caja.
- Caja proyectada con fuentes.
- Cuentas por cobrar.
- Cuentas por pagar.
- Margen.
- Conciliación.
- Libro diario.
- Libro mayor.
- Plan de cuentas.
- Cierre.
- IVA.
- F29 como papel de trabajo/control.
- PPM.
- Calendario tributario.
- Exportación para contador.
- Trazabilidad.

### Regla legal

El producto debe separar claramente:

- cálculo interno;
- apoyo a revisión;
- información tributaria;
- declaración oficial ante SII.

No afirmar que Nüva reemplaza al profesional tributario/contable.

## Sprint 4 — Modelo de negocio

### Hipótesis iniciales

No son métricas actuales.

| Variable | Conservador | Base | Agresivo |
|---|---:|---:|---:|
| ARPU | $9.990 | $19.990 | $39.990 |
| Churn mensual | 5% | 3% | 2% |
| CAC | $80.000 | $50.000 | $30.000 |
| Margen bruto | 70% | 80% | 85% |

Estas cifras son únicamente escenarios de planificación y deben reemplazarse por datos reales cuando existan ventas.

## Sprint 5 — Presupuesto

Cada partida debe seguir:

**Actividad → objetivo → gasto → resultado → KPI → evidencia.**

### Semilla Inicia

No fijar monto definitivo hasta la convocatoria vigente. Como referencia histórica, el instrumento ha utilizado hasta $15 millones y 75% de cofinanciamiento en diversas convocatorias, pero esa condición no debe copiarse automáticamente.

### BUILD

BIG 12 contempló $15 millones equity-free. La próxima convocatoria debe volver a verificarse.

## Sprint 6 — Data room

Carpeta mínima:

- pitch;
- one-pager;
- resumen ejecutivo;
- problema;
- solución;
- innovación;
- arquitectura;
- roadmap;
- mercado;
- competencia;
- modelo de negocio;
- tracción;
- pilotos;
- cartas de intención;
- KPIs;
- impacto;
- presupuesto;
- Gantt;
- antecedentes del equipo;
- propiedad intelectual;
- seguridad;
- documentación jurídica cuando corresponda;
- documentación tributaria cuando corresponda;
- anexos de evidencia.

## Gate de postulación

No enviar hasta cumplir:

- [ ] convocatoria vigente confirmada;
- [ ] bases descargadas;
- [ ] elegibilidad revisada punto por punto;
- [ ] estrategia jurídica definida;
- [ ] producto estable;
- [ ] demo estable;
- [ ] evidencia de validación;
- [ ] métricas verificables;
- [ ] presupuesto compatible con bases;
- [ ] Gantt compatible;
- [ ] pitch consistente;
- [ ] video consistente;
- [ ] respuestas sin contradicciones;
- [ ] documentación completa;
- [ ] revisión final como evaluador adversarial.

## Regla de calidad

Si un dato no está respaldado por una fuente o evidencia interna, marcarlo como **DATO PENDIENTE**. Nunca convertir una hipótesis en un hecho.
