# Integración con el SII de Chile

## Fuentes oficiales consultadas
- **ChileAtiende – Emisión de Documentos Tributarios Electrónicos (DTE)**: https://www.chileatiende.gob.cl/fichas/13505-emision-de-documentos-tributarios-electronicos-dte-sistema-de-facturacion-gratuito-del-sii (consultado 2026-10-18)
- **IntegraDTE – Documentación para desarrolladores**: https://www.integradte.cl/docs/emit-dte (consultado 2026-10-18)
- **AppDTE – API Open Source**: https://www.appdte.cl/ (consultado 2026-10-18)
- **Sitio oficial del SII**: https://www.sii.cl (verificado mediante ChileAtiende)

## Capacidades verificadas
Según la documentación oficial, el SII permite la emisión de los siguientes DTE mediante sus sistemas gratuitos o mediante sistemas propios autorizados:
- Factura electrónica
- Factura exenta electrónica
- Boleta electrónica
- Guía de despacho electrónica
- Nota de crédito electrónica
- Nota de débito electrónica
- Factura de compra electrónica
- Liquidación de factura electrónica
- Factura de exportación electrónica
- Documentos relacionados con exportaciones y constructoras

Para emitir DTE mediante un sistema propio, se requiere:
1. **Certificado digital** entregado por una entidad certificadora acreditada por el SII.
2. **Clave tributaria** del contribuyente (RUT y clave).
3. **API key** si se utiliza un proveedor tecnológico autorizado (como IntegraDTE o AppDTE) o se desarrolla conexión directa mediante los servicios web del SII (requiere certificado y entorno de certificación).
4. **Formato de documento**: XML conforme al esquema del SII o JSON (como lo aceptan algunos proveedores).
5. **Proceso de firma digital**: El documento debe ser firmado con el certificado del emisor antes de enviarlo al SII.
6. **Envío mediante HTTPS** a los endpoints del SII ( entorno de certificación y producción ).

## Mecanismos de integración identificados
### Estrategia A: Integración directa con el SII
- **Desarrollo propio**: Implementar la generación del XML DTE, firma con certificado X.509, envío al servicio web del Sii (https://palena.sii.cl o similar en certificación).
- **Requisitos**: 
  - Obtener certificado digital (costo anual aproximado: CLP 50.000-150.000 según entidad).
  - Desarrollar módulo de generación y firma (puede utilizar bibliotecas como `xmldsig` o `node-forge`).
  - Mantener entorno de certificación y producción separado.
  - Suscripción a los servicios web del SII (gratuitos tras certificación).
- **Ventajas**: Control total sobre el proceso, sin dependencia de terceros.
- **Desventajas**: Complejidad técnica, responsabilidad de mantenerse actualizado con cambios en el esquema del SII, necesidad de gestionar certificados y claves de forma segura.

### Estrategia B: Proveedor de facturación electrónica o DTE
- **Ejemplos**: IntegraDTE, AppDTE, otros servicios autorizados por el SII.
- **Requisitos**:
  - Contratar servicio y obtener API key.
  - Enviar el DTE en formato JSON (como lo documenta IntegraDTE) o XML.
  - El proveedor se encarga de la generación del XML, firma y envío al SII.
- **Ventajas**: Menor carga de desarrollo, el proveedor maneja certificados y actualizaciones normativas.
- **Desventajas**: Costo continuo por transacción o suscripción, dependencia de terceros, posible limitación en personalización.

### Estrategia C: Integración híbrida
- **Descripción**: Nüva One genera el DTE en su formato interno (JSON o objeto) y delega a un proveedor la firma y envío, o bien maneja la firma internamente y delega solo el envío.
- **Ventajas**: Flexibilidad para elegir qué partes internalizar.
- **Desventajas**: Requiere coordinación y puede aumentar complejidad.

## Arquitectura propuesta (multiempresa)
Para cada organización (empresa cliente) se debe almacenar:
- `organization_id`
- `rut`
- `certificado_digital` (referencia a almacenamiento seguro, nunca en base de datos legible)
- `clave_tributaria` (solo para uso interno, no expuesta)
- `proveedor_dte` (enum: interno, integraDTE, appDTE, otro)
- `api_key_proveedor` (si aplica)
- `ambiente` (certificación / producción)

Flujo de emisión:
1. Usuario crea documento comercial (factura, boleta, etc.).
2. Backend valida datos y calcula totales.
3. Se genera objeto DTE según el esquema del SII (encabezado, detalle, referencia).
4. Según configuración de la organización:
   - Si `proveedor_dte === 'interno'`: 
     - Se firma el XML con el certificado almacenado en un vault (por ejemplo, AWS KMS, Azure Key Vault o servicio de almacenamiento seguro).
     - Se envía el XML firmado al endpoint del SII (certificación o producción) mediante HTTPS.
   - Si `proveedor_dte` es un tercero:
     - Se envía el objeto DTE (JSON) al endpoint del proveedor con la API key.
     - El proveedor responde con aceptación o errores y opcionalmente el ID del documento en el SII.
5. Se registra la respuesta (aceptado, rechazado, en proceso) y se asocia al documento comercial.
6. Se expone al usuario el estado y la posibilidad de descargar el DTE o el XML generado.

## Estrategia de secretos
- Los certificados digitales y claves tributarias nunca deben almacenarse en la base de datos en texto plano.
- Se recomienda utilizar un servicio de gestión de secretos (HashiCorp Vault, AWS Secrets Manager, o encriptación a nivel de aplicación con clave maestra almacenada en variable de entorno).
- En entorno de desarrollo se pueden usar certificados de prueba, pero nunca en producción.

## Riesgos identificados
- **Compromiso de claves**: Si el certificado o la clave tributaria se expone, terceros podrían emitir DTE fraudulentamente a nombre de la empresa.
- **Cambios en el esquema del SII**: El SII actualiza periódicamente los formatos; se requiere monitoreo y actualización del módulo de generación.
- **Dependencia de terceros**: Si se utiliza un proveedor externo, cualquier interrupción afecta la capacidad de emitir documentos.
- **Costos operacionales**: Los proveedores pueden cobrar por transacción o suscripción; los certificados tienen costo anual.

## MVP tributario recomendado
Para un lanzamiento inicial limitado, se propone:
- Soporte únicamente para **Factura electrónica** y **Boleta electrónica** (los documentos más comunes para pymes).
- Utilizar un proveedor autorizado (ej. IntegraDTE) para la primera versión, de modo que Nüva One solo necesite enviar los datos en formato JSON y manejar respuestas.
- Esto reduce la carga de desarrollo y permite validar el flujo con clientes reales antes de invertir en infraestructura de firma propia.
- Se debe incluir en el contrato con el proveedor cláusulas de nivel de servicio y responsabilidad.

## Costos conocidos y pendientes
- **Conocidos**:
  - Suscripción o costo por transacción del proveedor DTE (por definir).
  - Costos de desarrollo del módulo de integración (estimado: 2-3 semanas de trabajo de un backend engineer).
- **Pendientes**:
  - Costos de certificación digital si se elige la ruta interna.
  - Costos de auditoría de seguridad del módulo de firma.
  - Costos de mantenimiento ante cambios del SII.

## Próximos pasos
1. Seleccionar un proveedor DTE autorizado y obtener documentación de API y entorno de prueba.
2. Implementar un módulo de servicio que reciba los datos del documento comercial y los envíe al proveedor.
3. Crear pruebas de integración que simulen la emisión y recepción de aceptación del SII (usando entorno de certificación del proveedor).
4. Definir el flujo de manejo de errores (documento rechazado, timeout, etc.).
5. Documentar el proceso de actualización de certificados y renovación de claves.
6. Considerar la implementación de un webhook para recibir notificaciones de estado del SII (si el proveedor lo soporta).

## Conclusión
La integración con el SII es viable mediante estrategias de proveedor externo o desarrollo propio. Para un lanzamiento comercial rápido y con menor riesgo, se recomienda adoptar un proveedor autorizado y posteriormente evaluar la internalización según el volumen y requisitos de los clientes.
