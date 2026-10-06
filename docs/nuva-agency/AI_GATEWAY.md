# Nüva AI Gateway

## Objetivo

Nüva Agency no depende de una sola API. El gateway mantiene un orden de fallback:

1. Gemini
2. Groq
3. Cloudflare Workers AI

Cada proveedor es opcional y las credenciales nunca se imprimen ni se escriben en el repositorio.

## Variables

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (opcional)
- `GROQ_API_KEY`
- `GROQ_MODEL` (opcional)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_MODEL` (opcional)

## Comportamiento

El gateway:

- detecta qué proveedores están configurados;
- intenta en orden;
- aplica timeout;
- cambia automáticamente al siguiente proveedor ante error;
- devuelve el proveedor realmente utilizado;
- conserva errores técnicos solo en memoria de la ejecución;
- nunca expone tokens.

El gateway **no considera una cuota gratuita como ilimitada**. Su objetivo es convertir varias cuotas independientes en una única capa resiliente.

## Verificación

`npm run agency:gateway` muestra la matriz de proveedores sin hacer llamadas externas.

Para una prueba real:

`NUVA_GATEWAY_LIVE_TEST=true npm run agency:gateway`

La prueba real debe ejecutarse solo después de agregar las APIs.
