# Código Morto y Rendimiento

## Análisis de código muerto
Hasta la fecha no se ha realizado un análisis exhaustivo de código muerto utilizando herramientas como `madge`, `depcruise` o `unused-files`. Se recomienda ejecutar dicho análisis en una fase posterior para identificar:
- Archivos TypeScript/JavaScript sin exports ni imports.
- Componentes de React que nunca se renderizan.
- Funciones utilitarias sin llamadas.
- Estilos CSS no utilizados.
- Archivos de prueba o documentación duplicada.

## Código muerto eliminado
Ningún código muerto ha sido eliminado de forma intencional en esta fase, ya que se priorizó la corrección de errores y la estabilización del build.

## Análisis de rendimiento
Se han recopilado métricas básicas de tiempo de build y tamaño de paquetes mediante la salida de `vite build`. Sin embargo, debido al fallo del build de producción no se pudo obtener un tamaño final de bundle.

### Métricas de desarrollo
- Tiempo de arranque del servidor de desarrollo: ~2-3 segundos.
- Tiempo de recarga en caliente (HMR): aceptable.
- Número de módulos transformados en desarrollo: ~3300 (según salida de vite).

### Tamaño de dependencias (aproximado)
Se puede observar que el proyecto incluye un número significativo de dependencias, particularmente:
- `@tanstack/*` (router, query, start) – múltiples paquetes.
- `react-day-picker` – componente de selección de fecha pesado.
- `recharts` – biblioteca de gráficos.
- `ai` y `@ai-sdk/*` – SDK de inteligencia artificial.
- `supabase-js` – cliente de base de datos.
- `stripe` – procesamiento de pagos.

Se recomienda realizar un análisis de bundle con `rollup-plugin-visualizer` o el propio análisis de Vite para identificar dependencias pesadas y oportunidades de code-splitting.

## Optimizaciones aplicadas
Ninguna optimización de rendimiento se ha aplicado en esta fase debido al enfoque en corregir errores y estabilizar la base de código.

## Impacto del bloqueo de construcción en el análisis de rendimiento
El fallo del sistema de construcción (`bun install`) impide:
- Generar un build de producción exitoso para medir el tamaño final del bundle.
- Ejecutar herramientas de análisis de bundle (como `vite-bundle-analyzer`) debido a dependencias faltantes.
- Medir métricas de rendimiento reales (tiempo de carga, latencia) en un artefacto compilado.

## Próximos pasos
1. Resolver el bloqueo del sistema de construcción para permitir la instalación completa de dependencias.
2. Ejecutar un análisis de código muerto y eliminar lo que sea seguro.
3. Generar un build de producción exitoso y medir el tamaño del bundle.
4. Utilizar herramientas como `vite-bundle-analyzer` para visualizar el contenido del bundle.
5. Evaluar la posibilidad de cargar diferidamente módulos pesados (por ejemplo, gráficos, calendarios) mediante `React.lazy` o rutas dinámicas.
6. Considerar la división de paquetes de proveedores de IA y gráficos en chunks separados para mejorar el tiempo de carga inicial.
