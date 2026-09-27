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
- Añadida `public.nuva_core_integrity_audit()` como gate interno de consistencia transversal. Es `SECURITY DEFINER`, de solo lectura y sin EXECUTE para `public`, `anon` o `authenticated`.

### Integridad transversal verificada

La ejecución del gate contra producción devolvió **0 fallos en todos los checks**:

- ventas pagadas sin transacción: 0
- ventas pagadas sin aplicación de stock: 0
- ventas con contabilidad pendiente: 0
- compras recibidas sin aplicación de stock: 0
- compras con contabilidad pendiente: 0
- líneas contables huérfanas: 0
- asientos publicados desbalanceados: 0
- movimientos de inventario huérfanos: 0
- movimientos de caja huérfanos: 0
- resultados de acciones huérfanos: 0
- riesgos críticos abiertos sin acción recomendada: 0

Además, la base ya dispone de triggers de integración para ventas, compras, pagos, caja, inventario, contabilidad y Action Queue; las verificaciones actuales no muestran duplicaciones ni huérfanos en los datos existentes.

### Auditoría de seguridad

Supabase mantiene cuatro tablas internas de operaciones con RLS sin políticas explícitas. Esto conserva denegación por defecto y no se trata como una vulnerabilidad; debe mantenerse documentado como superficie interna/service-only.

La protección de contraseñas comprometidas depende del plan de Supabase y no se activa mediante código cuando el proyecto no dispone de esa capacidad.

### Performance

Los avisos de índices no usados no se eliminan masivamente: el uso puede ser bajo en el dataset actual aunque sean necesarios en producción. La regla de esta auditoría es eliminar únicamente índices demostrablemente redundantes o incompatibles con consultas reales.

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

## Producción

Release actual:

- commit: `74870ee9c109243f7e286c1df7c40dda42fd1261`
- Vercel deployment: `dpl_6TipEB39EawfB9gPtsQWZpwaeDed`
- target: `production`
- estado: `READY`
- homepage: HTTP 200
- runtime errors agrupados últimos 60 minutos: 0

## Estado de cierre

La etapa Core Integration queda cerrada cuando los contratos de datos y seguridad anteriores mantienen 0 fallos, el gate permanece en CI/Factory y producción continúa sincronizada con `main`.

## Regla de cierre

No se declara una capacidad al 100% por existir una tabla o pantalla. Se considera cerrada cuando existe consumidor real, flujo de datos, autorización correcta, prueba de integración y evidencia de producción.
