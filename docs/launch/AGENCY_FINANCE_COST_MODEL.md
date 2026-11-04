# AGENCY_FINANCE_COST_MODEL.md

Modelo de costos y rentabilidad de Nüva One — SaaS B2B para pymes en Chile.

Generado: 2026-11-03
Especialista: Finance (agente 3)
Estado: Borrador para revisión del owner
Moneda: CLP (pesos chilenos), tipo de cambio referencial USD/CLP = 950 (sujeto a actualización)

---

## 1. Costos de infraestructura mensuales (estimación)

| Servicio | Plan estimado | Costo USD/mes | Costo CLP/mes | Notas |
|---|---|---|---|---|
| Supabase (proyecto Nüva One) | Pro / equivalente | $25 | $23.750 | Base de datos, Edge Functions, auth, storage básico |
| Vercel (proyecto nuva-one) | Pro / Hobby con uso comercial | $20 | $19.000 | Despliegues, preview, bandwidth |
| IA — nvidia/nemotron (inferencia) | Uso estimado 5.000 req/mes | $15 | $14.250 | Modelo principal de generación de código y texto |
| IA — glm-5.3 (fallback/lento) | Uso ocasional | $5 | $4.750 | Modelo secundario, sin visión |
| IA — Groq STT | Transcripción de audio | $3 | $2.850 | Speech-to-text para comandos de voz |
| IA — Gemini TTS | Síntesis de voz | $4 | $3.800 | Texto a voz para notificaciones |
| Telegram Bot API | Gratuito | $0 | $0 | Notificaciones al owner |
| GitHub (repositorio privado) | Gratis (uso individual/pequeño equipo) | $0 | $0 | |
| Dominio y DNS | mirax.cl / nuva-one.cl | $2 | $1.900 | Anual aproximado dividido por 12 |
| **Total estimado infraestructura** | | **$69** | **$65.550** | |

---

## 2. Costos de desarrollo y operación

| Concepto | Frecuencia | Costo CLP | Notas |
|---|---|---|---|
| Tiempo de desarrollo (Hermes/JARVIS autónomo) | Mensual | Incluido | No hay costo adicional de licencia de Hermes |
| Dominio anual | Anual | $22.800 | mirax.cl / equivalente |
| Certificados SSL | Incluido en Vercel | $0 | |
| Almacenamiento adicional Supabase | Según uso | Variable | Solo si se excede el plan base |
| **Total operación mensual** | | **~$65.550 + variable** | |

---

## 3. Modelo de precios SaaS B2B (pymes Chile)

| Plan | Precio CLP/mes | Precio USD/mes | Características |
|---|---|---|---|
| Básico | $19.990 | $21 | Hasta 3 usuarios, ventas e inventario básicos, sin CRM avanzado |
| Profesional | $39.990 | $42 | Hasta 10 usuarios, CRM completo, reportes, multi-sucursal |
| Empresa | $79.990 | $84 | Usuarios ilimitados, API, integraciones, soporte prioritario |

---

## 4. Punto de equilibrio (break-even)

| Métrica | Valor |
|---|---|
| Costo fijo mensual | $65.550 |
| Margen de contribución (plan Básico) | ~85% (costos variables marginales por usuario) |
| Clientes Básico necesarios para cubrir costos | ~4 clientes |
| Clientes Profesional necesarios para cubrir costos | ~2 clientes |
| Clientes Empresa necesarios para cubrir costos | ~1 cliente |

---

## 5. Proyección de ingresos (primeros 6 meses)

| Mes | Clientes Básico | Clientes Profesional | Clientes Empresa | Ingresos CLP/mes |
|---|---|---|---|---|
| 1 | 2 | 0 | 0 | $39.980 |
| 2 | 5 | 1 | 0 | $139.940 |
| 3 | 10 | 3 | 0 | $319.870 |
| 4 | 15 | 5 | 1 | $579.820 |
| 5 | 20 | 8 | 2 | $879.770 |
| 6 | 25 | 12 | 3 | $1.239.720 |

---

## 6. Rentabilidad proyectada (mes 6)

| Concepto | CLP |
|---|---|
| Ingresos mensuales (mes 6) | $1.239.720 |
| Costos de infraestructura | $65.550 |
| Utilidad bruta mensual | $1.174.170 |
| Margen | ~95% |

---

## 7. Supuestos y limitaciones

1. Los precios de Supabase y Vercel son estimaciones basadas en planes públicos; verificar contra facturación real.
2. Los costos de IA dependen del volumen real de uso (tokens, requests).
3. El tipo de cambio USD/CLP fluctuará; usar 950 como referencia solamente.
4. No incluye costos de marketing ni campañas pagadas (requieren autorización del owner).
5. No incluye costos de personal (Hermes/JARVIS opera de forma autónoma sin costo adicional de licencia).
6. Los precios de suscripción son proposiciones iniciales; validar con clientes reales antes de lanzar.

---

## 8. Próximos pasos para Finance

1. Validar costos reales de Supabase y Vercel contra consolas de facturación.
2. Definir precios finales con el owner.
3. Preparar cotizaciones para primeros clientes piloto.
4. Calcular CAC (costo de adquisición de clientes) y LTV.
5. Revisar mensualmente y ajustar según uso real.

**Autorización requerida:** Ninguna para este modelo de costos. Se requiere autorización del owner para definir precios finales y lanzar comercialmente.