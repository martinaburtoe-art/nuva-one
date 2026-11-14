# Registro regulatorio y de integraciones — Chile

**Fecha de revisión:** 13 de noviembre de 2026.  
**Uso:** investigación de producto y arquitectura. No constituye asesoría legal, tributaria, contable ni sanitaria. Verificar la versión normativa vigente antes de implementar o liberar.

## 1. Principio

La plantilla vertical identifica procesos operativos. No determina automáticamente giro SII, régimen tributario, IVA, permisos, patente municipal, autorización sanitaria, obligaciones laborales ni tratamiento de datos.

Las reglas legales deben vivir en un registro transversal de obligaciones, con:
- fuente primaria;
- jurisdicción;
- artículo/resolución aplicable;
- actividad/condición que activa la obligación;
- responsable de verificación;
- fecha de vigencia;
- versión y fecha de revisión;
- evidencia que debe conservarse;
- advertencia cuando la aplicabilidad dependa de hechos no capturados.

## 2. Registro inicial

| Área | Hecho relevante verificado | Implicación para Nüva | Fuente primaria |
|---|---|---|---|
| Estadística empresarial | INE reportó 1.207.333 empresas activas en 2025; comercio 33,6%, manufactura 10,2%, transporte/almacenamiento 8,8%; micro 71,7%, pequeñas 20,1% | Priorizar cobertura comercial y operativa, sin confundir universo total con TAM | https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/09/28/ine-publica-por-primera-vez-resultados-del-registro-estad%C3%ADstico-de-unidades-econ%C3%B3micas-%28rue%29-se-identificaron-1.207.333-empresas-activas-en-2025-a-nivel-nacional |
| DTE y facturación | ChileAtiende/SII describe inscripción para emitir facturas, notas de débito/crédito, guías y otros DTE; requiere inicio de actividades y condiciones específicas | Separar sistema comercial de emisión DTE; evaluar proveedor/certificación y contrato de integración | https://www.chileatiende.gob.cl/fichas/3007/1/pdf |
| Guía de despacho | SII indica formato electrónico obligatorio desde 17-01-2020 y relaciona guías con movimiento de bienes | Despacho debe modelar documentos, origen/destino y vínculo con entrega; revisar cambios normativos | https://www.sii.cl/destacados/factura_electronica/guia_despacho.html |
| Protección de datos | Ley 21.719, publicada 13-12-2024, texto consultado indica entrada en vigor 01-12-2026 | Preparar privacidad, derechos, finalidades, encargados, transferencias, incidentes y accountability antes de vigencia | https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272 |
| Finanzas Abiertas | CMF informa entrada en vigor SFA el 03-07-2027; incluye intercambio de información e iniciación de pagos y etapas de preparación | Diseñar conector desacoplado y consentimiento; no asumir acceso inmediato ni conectarse sin participante autorizado | https://www.cmfchile.cl/sitio/aplic/serdoc/ver_sgd.php?s567=d8a8944e8462648aaeca28f28112e23aVFdwQmVVNXFRVEpOUkUweVRtcEJlRTVCUFQwPQ%3D%3D&secuencia=-1&t=1782112640 |
| Consumidor/garantía | SERNAC explica garantía legal de 6 meses para productos nuevos defectuosos y tres opciones; retracto online de 10 días sujeto a excepciones | Postventa debe registrar venta, fecha de entrega, reclamo, resolución y evidencia; políticas no deben reducir derechos legales | https://www.sernac.cl/portal/604/w3-article-89178.html |
| Alimentos | DS 977 define establecimientos de alimentos e indica autorización sanitaria para instalación/modificación/funcionamiento; higiene y procesos deben controlarse | Plantillas de minimarket, restaurante, cafetería, panadería y producción alimentaria deben contemplar trazabilidad/operación; Nüva no certifica autorización | https://www.bcn.cl/leychile/navegar?idNorma=71271&idVersion=2026-10-02 |
| Apoyo a mipymes | Sercotec publica programas digitalizados y fondos, incluyendo Digitaliza tu Almacén, Crece y Capital Semilla | Directorio de oportunidades con elegibilidad, región, apertura/cierre y fuente verificada | https://www.sercotec.cl/programas-y-servicios-digitalizados/ |

## 3. Precaución de vigencia — Ley 21.719

La fuente primaria consultada en BCN muestra vigencia diferida al 01-12-2026. No reutilizar afirmaciones no verificadas sobre una eventual postergación. Antes de cada release posterior a esta fecha, comprobar la versión consolidada de LeyChile, Diario Oficial y normativa complementaria.

## 4. Integraciones: evaluación antes de construir

### SII / DTE
Evaluar:
- emisión, recepción y consulta de DTE;
- estados y rechazos;
- notas de crédito/débito;
- guías de despacho;
- firma/certificado digital y representación;
- folios y CAF cuando corresponda;
- certificación/autorización;
- proveedor, SLA, contingencia y portabilidad;
- conciliación DTE ↔ ventas/compras ↔ pagos.

No asumir que la API pública cubre todo el ciclo ni almacenar credenciales tributarias en frontend.

### Pagos
Evaluar cada proveedor con:
- contrato y documentación oficial;
- firma/verificación de webhooks;
- idempotencia por operación;
- estados ambiguos y consulta server-to-server;
- conciliación;
- devoluciones y contracargos;
- custodia de secretos;
- recuperación manual auditada.

### Finanzas Abiertas
Preparar interfaz de proveedor y modelo de consentimiento. La participación, acceso a datos e iniciación de pagos dependerán del marco CMF y participantes habilitados. No extraer credenciales bancarias del usuario ni automatizar pagos fuera del marco permitido.

### Ecosistema de apoyos
Sercotec/Corfo/municipalidades:
- guardar enlace a convocatoria oficial;
- vigencia y fecha de consulta;
- región y beneficiarios;
- requisitos y documentos;
- estado de postulación informado por usuario;
- no declarar elegibilidad sin comprobar todos los requisitos.

## 5. Obligaciones que requieren expediente adicional

- Laboral: contratos, jornada, asistencia, turnos, remuneraciones y protección de datos laborales.
- Salud/veterinaria: datos sensibles, fichas, confidencialidad, conservación y permisos.
- Alcohol y productos restringidos: controles de venta, edad y restricciones aplicables.
- Farmacia y dispositivos médicos: trazabilidad, autorizaciones y obligaciones sectoriales.
- Turismo/alojamiento: registro, seguridad y obligaciones específicas.
- Construcción/transporte: documentos de traslado, seguridad y subcontratación.

No activar módulos regulados hasta disponer de análisis de aplicabilidad y revisión especializada.

## 6. Gobierno del registro

- Revisión mensual de fuentes de cambio frecuente y antes de release.
- Revisión inmediata ante publicación de ley, resolución o circular relevante.
- Registrar quién revisó, qué cambió y qué versiones de plantilla/capacidad afecta.
- Mostrar fecha de actualización al administrador.
- Deshabilitar reglas obsoletas con mecanismo seguro, no borrar evidencia histórica.
