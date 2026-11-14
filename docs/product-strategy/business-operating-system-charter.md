# Nüva One — carta estratégica del sistema operativo empresarial

**Estado:** propuesta de producto para investigación, revisión y desarrollo incremental.  
**Fecha de corte:** 13 de noviembre de 2026.  
**Alcance:** estrategia de producto, arquitectura funcional y gobierno de capacidades. No autoriza migraciones productivas ni despliegues.

## 1. Tesis de producto

Nüva One debe ser un sistema operativo empresarial para micro, pequeñas y medianas empresas chilenas. No será un ERP genérico con módulos aislados ni un conjunto de aplicaciones independientes por rubro.

Debe combinar:

1. **Un núcleo empresarial común:** empresas, sucursales, usuarios, clientes, catálogo, ventas, compras, inventario, caja, finanzas, documentos y reportes.
2. **Plantillas verticales estandarizadas:** modelos operativos versionados que definen procesos, datos, terminología, indicadores, alertas, roles y configuración recomendada para un tipo de negocio.
3. **Capacidades reutilizables:** variantes, lotes, vencimientos, unidades, conversiones, recetas, producción, órdenes de trabajo, agenda, proyectos, flota, reservas y crédito.
4. **Inteligencia transversal:** diagnóstico, explicación, pronóstico y recomendación basados en datos verificables.
5. **Ejecución controlada:** tareas, aprobaciones y automatizaciones auditables que convierten recomendaciones en acciones.
6. **Ecosistema:** integraciones desacopladas con pagos, DTE/SII, bancos, comercio digital, proveedores y herramientas externas.
7. **Confianza por diseño:** aislamiento multiempresa, permisos, privacidad, trazabilidad, resiliencia, exportación y recuperación.

## 2. Principio rector de estandarización

**Una plantilla oficial por modelo operativo; no una aplicación personalizada por cliente.**

Todas las empresas clasificadas como minimarket reciben la misma versión de la plantilla minimarket. Todas las ferreterías reciben la misma plantilla ferretería. La empresa puede activar parámetros expresamente permitidos por esa plantilla (por ejemplo, venta por peso, múltiples sucursales o despacho), pero no alterar libremente la definición del proceso.

La personalización queda limitada a:
- Datos maestros de la empresa.
- Parámetros explícitamente admitidos por el esquema de la plantilla.
- Preferencias visuales y de comunicación que no alteren reglas de negocio.
- Integraciones y complementos compatibles.
- Configuración de roles dentro de permisos autorizados.

No se permite que respuestas de onboarding:
- Activen capacidades aún no implementadas.
- Concedan permisos o cambien planes.
- Modifiquen reglas tributarias o sanitarias automáticamente.
- Infieran conversiones de unidades, equivalencias, precios o políticas.
- Alteren la integridad financiera, de inventario o de datos.

## 3. Separaciones que no deben romperse

| Concepto | Propósito | No debe confundirse con |
|---|---|---|
| Actividad legal/tributaria | Giros y obligaciones declaradas ante SII | Plantilla operativa |
| Plantilla vertical | Modelo de cómo opera el negocio | Giro tributario |
| Perfil de empresa | Tamaño, sedes, equipo y contexto | Permisos |
| Configuración operativa | Opciones admitidas y respuestas explícitas | Entitlements |
| Capacidad de producto | Función realmente implementada y liberada | Función solicitada |
| Autorización | Qué puede hacer cada actor | Perfil de negocio |
| Suscripción | Qué está contratado | Capacidad técnica disponible |

## 4. Resultado que debe experimentar el cliente

El propietario debe poder responder, con datos del sistema:
- ¿Cómo está funcionando mi empresa?
- ¿Estoy ganando dinero realmente?
- ¿Qué problema necesita atención hoy?
- ¿Qué debería comprar, reponer, cobrar o resolver?
- ¿Qué clientes estoy perdiendo?
- ¿Qué procesos están atrasados?
- ¿Qué decisión tendrá mayor impacto?
- ¿Qué puedo hacer para crecer sin poner en riesgo la caja?

La interfaz debe traducir indicadores a lenguaje comprensible, explicar su origen y ofrecer acciones seguras. No debe exigir que el propietario sea experto en contabilidad, administración o tecnología.

## 5. Ciclo de inteligencia obligatorio

Toda señal inteligente debe recorrer un contrato común:

1. **Detectar:** identificar un evento, desviación, tendencia o riesgo.
2. **Validar evidencia:** comprobar fuente, período, calidad, frescura y suficiencia de datos.
3. **Explicar:** describir qué se observó y qué no puede concluirse.
4. **Priorizar:** estimar impacto, urgencia, confianza y reversibilidad.
5. **Recomendar:** proponer una acción específica y su razón.
6. **Autorizar:** solicitar aprobación cuando la acción tenga efecto comercial, financiero, laboral o irreversible.
7. **Ejecutar:** utilizar el flujo transaccional existente; nunca escribir directamente desde una capa de IA.
8. **Verificar:** comprobar el resultado real y registrar auditoría.
9. **Aprender:** evaluar si la recomendación produjo el resultado esperado, sin entrenar con datos de otros tenants sin base jurídica y controles.

## 6. Modelo de valor

Nüva debe medir impacto atribuible y no presentar estimaciones como resultados:
- Horas ahorradas, con método de medición.
- Reducción de quiebres, mermas y errores.
- Mejora de margen y recuperación de cobros.
- Clientes retenidos o recuperados.
- Cumplimiento de tareas y tiempos de ciclo.
- Reducción de capital inmovilizado.
- Calidad y completitud de datos.

Cada métrica debe mostrar período, línea base, fórmula, fuente, cobertura y nivel de confianza. No atribuir causalidad a Nüva cuando solo exista correlación.

## 7. Criterios de aceptación de una nueva capacidad

Ninguna función nueva entra al roadmap de implementación sin:
- Problema y usuario objetivo definidos.
- Evidencia de necesidad sectorial o transversal.
- Resultado medible.
- Modelo de datos y fuentes identificados.
- Dependencias y capacidades existentes revisadas.
- Riesgos de privacidad, seguridad, finanzas y regulación evaluados.
- Diseño de permisos y auditoría.
- Pruebas funcionales, de integridad y de regresión.
- Plan de despliegue, compatibilidad y rollback.
- Decisión explícita de construir, integrar, comprar, postergar o descartar.

## 8. No objetivos

- Crear forks de la aplicación por rubro.
- Duplicar ventas, clientes, inventario, caja o finanzas.
- Habilitar módulos ficticios por seleccionar una plantilla.
- Automatizar cobros, cambios contables, ajustes de stock o comunicaciones sensibles sin reglas y autorización.
- Prometer cumplimiento tributario, laboral, sanitario o de privacidad por seleccionar un rubro.
- Comparar indicadores entre sectores incompatibles.
- Utilizar datos de una empresa para revelar información de otra.
- Añadir IA donde una regla determinista y auditable sea más fiable.

## 9. Decisiones pendientes de aprobación

- Priorización comercial definitiva de los verticales.
- Alcance del portal externo de clientes.
- Nivel de autonomía permitido por clase de acción.
- Modelo de monetización de complementos e integraciones.
- Política de benchmarking anonimizado y sus condiciones jurídicas/técnicas.
- Alcance y calendario de conectores SII, banca y comercio digital.

## 10. Evidencia de contexto de mercado

El INE informó el 28-09-2026 que identificó 1.207.333 empresas activas en Chile para 2025; comercio concentró 33,6%, manufactura 10,2% y transporte/almacenamiento 8,8%. Microempresas fueron 71,7% y pequeñas empresas 20,1%. Es una señal para priorizar cobertura, no una estimación de mercado direccionable ni prueba de disposición a pagar.

Fuente: https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/09/28/ine-publica-por-primera-vez-resultados-del-registro-estad%C3%ADstico-de-unidades-econ%C3%B3micas-%28rue%29-se-identificaron-1.207.333-empresas-activas-en-2025-a-nivel-nacional
