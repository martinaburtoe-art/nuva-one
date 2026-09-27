# Nüva One — Core Integration Audit · 2026-09-27

## Objetivo

Cerrar la etapa de integración central: eliminar superficies retiradas, proteger el núcleo multi-tenant y establecer la conexión operativa entre producto, Intelligence, Agent Council, Action Engine y Factory.

## Decisiones consolidadas

- Nüva Studio está retirado y no debe reaparecer.
- WhatsApp está fuera de alcance del producto actual.
- n8n está fuera de la arquitectura actual; no debe existir como dependencia runtime ni como outbox persistente.
- Nüva Intelligence es un módulo existente; no se duplica como una tarjeta/resumen independiente en la homepage.
- Nüva Agent Council y Action Engine permanecen como capacidades centrales.
- Nüva One Factory permanece fuera del runtime del SaaS y gobierna el ciclo de construcción/validación.

## Correcciones aplicadas en esta etapa

### Base de datos

- Eliminado `public.n8n_event_outbox`.
- Eliminados registros heredados de conversaciones `whatsapp`.
- `public.ai_channel` quedó limitado a `web`.
- Eliminada la columna heredada `businesses.webhook_url`.
- Añadidos índices para las FK de Nüva Connect (`created_by`, `connection_id`).
- Separadas las políticas de Nüva Connect en SELECT, INSERT, UPDATE y DELETE para evitar políticas permisivas solapadas en SELECT.

### Auditoría de seguridad

Supabase mantiene cuatro tablas internas de operaciones con RLS sin políticas explícitas. Esto conserva denegación por defecto y no se trata como una vulnerabilidad; debe mantenerse documentado como superficie interna/service-only.

La protección de contraseñas comprometidas depende del plan de Supabase y no se activa mediante código cuando el proyecto no dispone de esa capacidad.

### Performance

Los avisos de 188 índices no usados no se eliminan masivamente: el uso puede ser bajo en el dataset actual aunque sean necesarios en producción. La regla de esta auditoría es eliminar únicamente índices demostrablemente redundantes o incompatibles con consultas reales.

## Contratos de integración

```text
Venta
 ├─ Cliente
 ├─ Producto / Inventario
 ├─ Margen / Costos
 ├─ Caja / Finanzas
 └─ Cobranza
       ↓
Nüva Intelligence
       ↓
Agent Council
       ↓
Action Queue / Action Engine
       ↓
Resultado
       ↓
Nüva Business Memory
       ↓
Knowledge / Factory
```

El mismo principio debe aplicarse a Compras, People, Cotizaciones, Finanzas, Tributario y Operaciones.

## Siguiente bloque de auditoría

1. Verificar consumidores reales de cada entidad de Intelligence y Action Engine.
2. Verificar que ventas y compras generen efectos contables/caja/inventario exactamente una vez.
3. Verificar que People publique costos laborales hacia Finanzas sin duplicación.
4. Verificar que riesgos/oportunidades puedan convertirse en acciones trazables.
5. Ejecutar simulación integral de una pyme y registrar resultados.
6. Convertir fallos reales en tests de regresión.
7. Validar producción después de cada lote de cambios.

## Regla de cierre

No se declara una capacidad al 100% por existir una tabla o pantalla. Se considera cerrada cuando existe consumidor real, flujo de datos, autorización correcta, prueba de integración y evidencia de producción.
