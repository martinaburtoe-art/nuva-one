# Hermes Agent — ejecución local controlada para Nüva One

## Estado y objetivo

Este documento define un procedimiento revisable para combinar Hermes Agent en Windows con el repositorio Nüva One. La conexión entre esta conversación de ChatGPT y el terminal local NO está establecida por este documento ni por el gateway de Hermes.

## Evidencia observada el 2026-10-15

- Hermes Agent: versión reportada 0.22.1+33.gca069e1.
- Perfil: `default`, modelo reportado `z-ai/glm-5.3`.
- `hermes gateway status`: gateway activo manualmente (PID reportado 2148).
- `hermes mcp serve --help`: opciones visibles `-h`, `-v`, `--accept-hooks`; no anuncia un listener HTTP/TCP.
- Repositorio: `martinaburtoe-art/nuva-one`, rama base `main`.
- No se ha verificado una sesión MCP desde ChatGPT al PC.

## Arquitectura de menor riesgo

1. **ChatGPT/GitHub:** inspeccionar el repositorio y proponer cambios pequeños en una rama aislada. Abrir revisión antes de integrar.
2. **Hermes/Windows:** ejecutar localmente pruebas y comandos aprobados dentro de una carpeta de trabajo explícita.
3. **Evidencia:** conservar salida de comandos, código de salida, SHA de commit, diff y resultado de pruebas. Separar `PASS`, `WARN`, `FAIL` y `UNKNOWN`.
4. **Integración:** usar únicamente un cliente MCP compatible que pueda iniciar `hermes mcp serve` como proceso local stdio, o un puente local autenticado que esté documentado y limitado. No asumir que este chat puede conectarse a un servidor MCP arbitrario.
5. **Revisión:** no fusionar automáticamente cambios de la rama de integración a `main`.

## Límites de ejecución

- Carpeta permitida: únicamente la copia local de Nüva One que el propietario confirme.
- Antes de editar: comprobar rama, estado de Git y ruta absoluta; detenerse si hay cambios no guardados.
- Crear una copia de seguridad o un worktree separado antes de modificar archivos.
- Nunca escribir ni mostrar archivos `.env`, tokens, claves API, credenciales, datos personales o dumps de producción.
- No ejecutar comandos destructivos, scripts descargados no revisados, elevación de privilegios ni mutaciones de producción.
- No modificar auth/RLS, pagos, checkout, migraciones o workflows de seguridad sin revisión humana explícita.
- No exponer PowerShell, SSH, MCP ni un puerto de control directamente a Internet.
- No usar `--accept-hooks` para autoaprobar comandos desconocidos.
- Las tareas recurrentes deben empezar pausadas y ser habilitadas por el propietario después de validar una ejecución manual.

## Checklist para habilitar ejecución local

- [ ] Confirmar la ruta local exacta del repositorio.
- [ ] Confirmar `git status --short`, rama y commit actual.
- [ ] Confirmar el cliente que soportará MCP local stdio; si no existe, no declarar conectividad.
- [ ] Configurar el cliente para lanzar Hermes como proceso local, sin servidor público.
- [ ] Probar primero una operación de solo lectura (por ejemplo, consultar rama y estado Git).
- [ ] Probar una escritura inocua en una carpeta temporal fuera del repositorio y verificar la reversión.
- [ ] Limitar los comandos a una lista aprobada y exigir aprobación antes de cambios de código.
- [ ] Ejecutar lint, typecheck y pruebas pertinentes; registrar evidencia.
- [ ] Revisar el diff y crear un commit únicamente en la rama aislada.
- [ ] Solicitar revisión humana antes de merge o despliegue.

## Próxima acción

El propietario debe compartir la ruta local del clon de Nüva One y confirmar qué cliente de escritorio puede cargar servidores MCP locales. No solicitar ni almacenar claves en este documento.
