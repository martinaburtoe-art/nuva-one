# Auditoría de trabajo heredado y punto de partida

**Fecha:** 13 de noviembre de 2026.  
**Repositor io:** `martinaburtoe-art/nuva-one`  
**Base revisada:** PR #318 y PR #321; rama agregada `feat/industry-intelligence-config-p0-v2-20261112`, HEAD `480142d3cd3a236c24cfd6706349edcfe03a521e`.  
**Advertencia:** las PR consultadas permanecen abiertas en Draft; no se presentan como producción.

## 1. Activos existentes que deben reutilizarse

### PR #318 — Industry Intelligence foundation
- Catálogo tipado de 23 perfiles operativos.
- Clasificación macro compatible con enum existente `business_industry`.
- Búsqueda tolerante a tildes.
- Preguntas de onboarding por perfil.
- Perfil principal y hasta tres secundarios.
- Primer cruce de códigos SII, manteniendo `giro` separado.
- Packs operativos detallados para ferretería, almacén/minimarket y distribuidora.
- Segunda ola de fichas para ropa/calzado, talleres, restaurantes/cafeterías y servicios profesionales/agencias.
- Registro de readiness de capacidades.
- Tests de catálogo, onboarding y disponibilidad.

### PR #321 — Configuración P0 y persistencia sectorial
- Persistencia aditiva opt-in en `businesses`:
  - `industry_profile`
  - `industry_secondary_profiles`
  - `industry_config`
  - `industry_config_version`
  - `industry_profile_updated_at`
- Validador de configuración y opciones permitidas.
- Preguntas explícitas sí/no; no inferir respuestas desconocidas.
- Onboarding y editor de configuración.
- Panel sectorial en Resumen basado en evidencia.
- Test pgTAP de contrato de esquema.
- Runbook para consolidar el release y no publicar la pila de PRs por separado.

## 2. Límites explícitos del trabajo heredado

La documentación de PR #318/#321 reconoce:
- `businesses.industry` tiene siete macroindustrias; no sustituye el catálogo vertical.
- `giro` tributario debe permanecer separado del perfil operativo.
- El stock actual de productos es entero; un campo numeric en movimientos no prueba soporte fraccionario end-to-end.
- No existe todavía modelo completo verificado de variantes, unidades/conversiones, lotes/vencimientos, series o multi-bodega.
- No se debe inferir conversión de caja/saco/rollo/pallet sin ratio explícito por producto.
- Despacho existente no prueba programación de rutas, capacidad ni slots.
- Solo se deben marcar disponibles capacidades con evidencia de flujo real.
- Seleccionar un rubro no debe conceder permisos ni activar módulos planificados.
- La migración sectorial sigue sin aplicar a producción.

## 3. Revisión de readiness declarada

El archivo `src/lib/industry-capability-readiness.ts` de la rama heredada declara disponibles, con evidencia, cinco capacidades:
- barcode;
- quotes;
- dispatch;
- customer_history;
- cash_register.

Y mantiene planificadas, entre otras:
- variantes;
- cantidades fraccionarias;
- conversiones;
- lotes/vencimientos;
- seriales;
- múltiples bodegas;
- listas de precios y precios por volumen;
- recetas/BOM y órdenes de producción;
- agenda, órdenes de trabajo y proyectos;
- flota, arriendo de activos y reservas;
- comisiones, garantías y cuentas de crédito.

Esto debe verificarse otra vez sobre el HEAD que se proponga fusionar. No promover readiness por documentación ni por la selección del perfil.

## 4. Riesgo de confundir catálogo con plantilla certificada

El catálogo de 23 IDs es una clasificación inicial, no prueba que existan 23 plantillas completas. La configuración detallada P0 está limitada a:
1. ferretería y materiales;
2. almacén/minimarket;
3. distribuidora y mayorista.

El resto puede identificarse, pero no debe recibir procesos avanzados no implementados. La investigación nueva debe profundizar los 23 perfiles existentes, decidir fusiones/divisiones y documentar nuevos verticales solo cuando exista evidencia. No forzar el número 27.

## 5. Dependencias de PR / release

- PR #316: Resumen responsive y PWA.
- PR #318: catálogo y base sectorial.
- PR #321: persistencia, onboarding, editor y panel sectorial.
- PR #330: integridad de pagos/inventario, Draft; revisión independiente requerida.
- PR #332: estados accesibles de IA, Draft.
- PR #333: recuperación de pagos Owner-only, Draft y apilada sobre #330.
- PR #334: patrones de UI móvil, Draft.

La línea de investigación no debe modificar ni fusionar estas PR ni activar su migración en producción. Respetar la estrategia de release agregado ya documentada en `docs/release/industry-intelligence-batch-release.md`.

## 6. Próximas brechas a investigar y cerrar

1. Definir el catálogo maestro y resolver perfiles que agrupan negocios demasiado distintos (p. ej. librería/electrónica; restaurante/cafetería; tienda mascotas/veterinaria; educación/gimnasio).
2. Describir los procesos por vertical con excepciones y documentos.
3. Auditar entidades existentes y proponer modelos reutilizables para variantes, unidades, lotes, series, recetas, OT, agenda, proyectos, flota, activos y reservas.
4. Definir el modelo de tareas/alertas y el motor de workflows; estudiar Inngest como ejecutor, sin convertirlo en fuente de verdad.
5. Definir modelo financiero de caja proyectada, costeo y margen con fuentes verificadas.
6. Definir CRM y portal externo, consentimiento y separación de datos.
7. Definir importación/exportación y migración desde planillas.
8. Crear catálogo de KPIs con fórmulas, períodos, granularidad, cobertura y fuentes.
9. Completar expediente de seguridad, privacidad y cumplimiento chileno.
10. Diseñar simulaciones Golden Business para cada plantilla certificada.

## 7. Reglas de ejecución para la siguiente fase

- Trabajo documental y ramas GitHub permitidos.
- No aplicar migraciones a Supabase productivo.
- No desplegar a Vercel ni generar múltiples previews.
- No tocar datos reales de clientes.
- No duplicar módulos o rutas.
- No cambiar readiness sin pruebas end-to-end.
- Toda modificación de código debe tener tests y evidencia de CI en SHA exacto.
- Toda operación financiera, de inventario o autorización debe mantener transacciones, idempotencia y aislamiento.
- Las decisiones de arquitectura deben contrastarse con el código real y los contratos existentes.
