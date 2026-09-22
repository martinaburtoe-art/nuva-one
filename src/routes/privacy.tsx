import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const LAST_UPDATED = "22 de septiembre de 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidad — Nüva One" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-14 prose prose-slate dark:prose-invert">
        <h1>Política de Privacidad y Protección de Datos Personales</h1>
        <p className="text-sm text-muted-foreground"><strong>Versión:</strong> 2.0 · <strong>Última actualización:</strong> {LAST_UPDATED}</p>

        <div className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Marco de aplicación:</strong> esta política está diseñada para Nüva One considerando la normativa chilena vigente y la preparación para la Ley N.º 21.719, cuya entrada en vigor está prevista para el 1 de diciembre de 2026. La aplicación concreta depende de la calidad de las partes, el tratamiento efectuado y la normativa sectorial correspondiente.
        </div>

        <h2>1. Responsable y contacto</h2>
        <p>
          El responsable del tratamiento es Martín Ariel Aburto Espinoza, RUT 21.553.180-5, con domicilio en Talca, Región del Maule, Chile. Contacto de privacidad: <strong>privacidad@nuvaone.cl</strong>. Si la explotación del servicio cambia a una persona jurídica, esta identificación deberá actualizarse antes de operar bajo la nueva entidad.
        </p>

        <h2>2. Principios de tratamiento</h2>
        <p>
          Nüva One procura tratar datos personales de manera lícita, leal y transparente, para finalidades determinadas, explícitas y legítimas, limitando la información a la necesaria, manteniéndola exacta y actualizada cuando corresponda, conservándola solo durante el tiempo necesario y aplicando medidas de seguridad proporcionales al riesgo.
        </p>

        <h2>3. Categorías de datos</h2>
        <ul>
          <li><strong>Cuenta y autenticación:</strong> nombre, correo electrónico, datos de contacto, rol y credenciales protegidas. Las contraseñas no se almacenan en texto plano por Nüva One.</li>
          <li><strong>Datos del negocio:</strong> catálogo, precios, stock, ventas, compras, cotizaciones, gastos, proveedores y demás información que el usuario incorpore.</li>
          <li><strong>Datos de terceros incorporados por el cliente:</strong> información de clientes, trabajadores, proveedores o contactos. El cliente debe contar con una base jurídica válida para incorporarlos y utilizar el servicio.</li>
          <li><strong>Integraciones:</strong> información necesaria para conectar servicios activados por el usuario, según la integración concreta.</li>
          <li><strong>Pagos:</strong> los datos completos de tarjeta son procesados por el proveedor de pagos correspondiente; Nüva One no pretende almacenar el número completo de la tarjeta.</li>
          <li><strong>Datos técnicos y de seguridad:</strong> información mínima necesaria para autenticación, seguridad, diagnóstico y disponibilidad. La telemetría operacional de Nüva One se diseña para minimizar identificadores y no registrar contenidos de clientes.</li>
        </ul>

        <h2>4. Finalidades y bases jurídicas</h2>
        <p>Según el tratamiento concreto, Nüva One puede tratar información para:</p>
        <ul>
          <li>crear y administrar la cuenta y prestar el servicio contratado;</li>
          <li>procesar pagos, facturación y obligaciones contractuales;</li>
          <li>proteger la seguridad, prevenir fraude, abuso y accesos no autorizados;</li>
          <li>mantener registros técnicos y resolver incidentes;</li>
          <li>ejecutar integraciones solicitadas por el usuario;</li>
          <li>generar funciones de IA solicitadas por el usuario;</li>
          <li>cumplir obligaciones legales o atender requerimientos válidos de autoridad;</li>
          <li>enviar comunicaciones comerciales cuando exista una base jurídica y se respeten las preferencias del destinatario.</li>
        </ul>
        <p>
          La base jurídica no se presume de manera genérica: se determinará según la finalidad y la relación jurídica aplicable. Cuando el consentimiento sea la base utilizada, podrá retirarse conforme a la ley; la retirada no invalida retroactivamente tratamientos lícitos realizados antes de ella.
        </p>

        <h2>5. Rol de Nüva One y clientes empresariales</h2>
        <p>
          En determinados tratamientos Nüva One actúa como responsable de sus propios datos operacionales. Cuando una empresa cliente utiliza Nüva One para gestionar datos personales de sus clientes, trabajadores o contactos, la asignación entre responsable, encargado u otra figura legal se determinará según quién decide los fines y medios del tratamiento. Nüva One no asumirá automáticamente la condición de responsable respecto de tratamientos cuyo propósito y decisiones correspondan al cliente.
        </p>
        <p>
          El cliente es responsable de definir finalidades lícitas, informar a los titulares cuando corresponda y utilizar únicamente datos respecto de los cuales tenga una base jurídica suficiente.
        </p>

        <h2>6. Inteligencia artificial</h2>
        <p>
          Algunas funciones pueden enviar a proveedores de modelos de IA el contexto mínimo necesario para ejecutar una solicitud del usuario. Nüva One procurará minimizar los datos enviados y evitar datos innecesarios. Las salidas de IA pueden ser incorrectas y no constituyen asesoría legal, tributaria, contable, financiera, laboral ni profesional.
        </p>
        <p>
          No se utilizarán datos personales para entrenar modelos de terceros fuera de las condiciones contractuales y políticas aplicables al servicio concreto. Cuando una integración específica tenga condiciones distintas, se informarán antes de activarla cuando sea exigible.
        </p>

        <h2>7. Proveedores y destinatarios</h2>
        <p>
          Nüva One puede utilizar proveedores de infraestructura, autenticación, almacenamiento, pagos, mensajería, IA, analítica técnica y otras herramientas necesarias para prestar el servicio. El acceso de estos proveedores se limitará a lo necesario para la función contratada y estará sujeto a obligaciones de seguridad y confidencialidad según corresponda.
        </p>
        <p>
          También podremos comunicar información a autoridades cuando exista una obligación legal, orden judicial o facultad legalmente habilitante.
        </p>

        <h2>8. Transferencias internacionales</h2>
        <p>
          Algunos proveedores pueden tratar información fuera de Chile. Nüva One evaluará las condiciones legales aplicables a cada transferencia y procurará utilizar mecanismos que otorguen un nivel de protección adecuado, además de medidas contractuales, técnicas u organizativas apropiadas cuando corresponda.
        </p>
        <p>
          La ubicación concreta de cada tratamiento puede depender del proveedor y de la configuración vigente del servicio. No se declara que todos los proveedores utilicen una única ubicación geográfica permanente.
        </p>

        <h2>9. Registro de auditoría del negocio</h2>
        <p>
          En cuentas empresariales, la plataforma puede registrar eventos operacionales asociados a usuarios autorizados —por ejemplo, cambios relevantes— para seguridad, trazabilidad y administración interna. Estos registros se limitan a lo necesario, tienen controles de acceso y se conservan conforme a las necesidades operacionales y obligaciones legales aplicables.
        </p>

        <h2>10. Telemetría técnica de Nüva One</h2>
        <p>
          Para proteger la plataforma, Nüva One puede recopilar métricas agregadas de errores, rendimiento y disponibilidad, como latencia, Web Vitals y huellas técnicas sanitizadas. El diseño del sistema de observabilidad evita almacenar intencionalmente contenidos de conversaciones, registros comerciales, números de tarjeta, tokens, cookies o identificadores directos de clientes en la telemetría operacional.
        </p>

        <h2>11. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas proporcionales al riesgo, incluyendo controles de acceso, autenticación, aislamiento de datos entre negocios, Row-Level Security en la base de datos, protección de secretos, monitoreo técnico, recuperación y mecanismos de prevención y respuesta a incidentes. Ningún sistema conectado a Internet puede garantizar seguridad absoluta.
        </p>

        <h2>12. Conservación</h2>
        <p>
          Conservamos los datos mientras sean necesarios para la finalidad correspondiente, mientras exista la relación contractual o mientras una obligación legal exija conservarlos. Los períodos concretos pueden variar según el tipo de dato. Una vez cumplida la finalidad y agotadas las obligaciones de conservación, los datos serán eliminados, anonimizados o sometidos a medidas equivalentes cuando corresponda.
        </p>

        <h2>13. Derechos de los titulares</h2>
        <p>
          Los titulares podrán ejercer los derechos que reconozca la normativa aplicable, incluyendo acceso, rectificación, eliminación o cancelación cuando proceda, oposición, bloqueo o limitación cuando corresponda, portabilidad y demás derechos reconocidos por la legislación vigente o futura aplicable al tratamiento.
        </p>
        <p>
          Las solicitudes pueden enviarse a <strong>privacidad@nuvaone.cl</strong>. Se podrán solicitar antecedentes razonables para verificar la identidad del solicitante y evitar entregas indebidas. Nüva One responderá dentro de los plazos y bajo el procedimiento establecidos por la legislación aplicable.
        </p>

        <h2>14. Menores de edad</h2>
        <p>
          Nüva One es un servicio empresarial y no está dirigido específicamente a menores. Si un tratamiento concreto involucra datos de menores, se aplicarán las reglas especiales que correspondan y se evitará recopilar información innecesaria.
        </p>

        <h2>15. Cookies y tecnologías similares</h2>
        <p>
          Nüva One puede utilizar cookies o tecnologías equivalentes necesarias para autenticación, seguridad, funcionamiento y preferencias. Las tecnologías no esenciales destinadas a finalidades que requieran consentimiento solo deberán activarse cuando exista una base jurídica válida y, cuando corresponda, consentimiento previo.
        </p>
        <p>
          Los detalles de cada cookie o tecnología se informarán en el mecanismo de gestión de preferencias correspondiente cuando resulte aplicable.
        </p>

        <h2>16. Comunicaciones comerciales</h2>
        <p>
          Las comunicaciones estrictamente necesarias para prestar el servicio —por ejemplo, seguridad, recuperación de cuenta o facturación— pueden enviarse cuando sean necesarias para la relación contractual. Las comunicaciones promocionales estarán sujetas a las reglas legales aplicables y deberán permitir ejercer la opción de dejar de recibirlas cuando corresponda.
        </p>

        <h2>17. Incidentes y brechas</h2>
        <p>
          Nüva One mantiene procedimientos de detección, contención, investigación y recuperación de incidentes. Cuando una brecha de seguridad genere obligaciones de comunicación o notificación conforme a la legislación aplicable, se realizarán las comunicaciones a las autoridades, titulares o clientes que correspondan, dentro de los plazos y condiciones legalmente exigibles.
        </p>

        <h2>18. Cambios de esta política</h2>
        <p>
          Esta Política puede actualizarse por cambios legales, tecnológicos, contractuales o del servicio. Las modificaciones relevantes se comunicarán mediante mecanismos razonables y, cuando la ley lo exija, se solicitará el consentimiento correspondiente.
        </p>

        <h2>19. Contacto y reclamaciones</h2>
        <p>
          Para consultas o solicitudes de privacidad: <strong>privacidad@nuvaone.cl</strong>. Cuando corresponda, el titular podrá utilizar los mecanismos administrativos o judiciales reconocidos por la normativa chilena, incluida la autoridad de protección de datos que tenga competencia al momento de la solicitud.
        </p>

        <h2>20. Marco normativo</h2>
        <p>
          Esta política considera, según corresponda al tratamiento: Ley N.º 19.628 y sus modificaciones; Ley N.º 21.719 sobre protección de datos personales; Ley N.º 19.496 y normativa de consumo cuando exista una relación de consumo; Reglamento de Comercio Electrónico, Decreto N.º 6 de 2021; Ley N.º 21.459 sobre delitos informáticos; Ley N.º 21.663 Marco de Ciberseguridad cuando su ámbito resulte aplicable; y demás normativa chilena sectorial que corresponda.
        </p>

        <div className="mt-10 rounded-lg border bg-muted/40 p-4 text-sm">
          <strong>Nota de cumplimiento:</strong> este documento está diseñado para servir como base de cumplimiento y contratación, no constituye una certificación legal. La revisión final debe contrastarse con la estructura jurídica, proveedores, flujos de datos y contratos reales de Nüva One.
        </div>
      </main>
    </div>
  );
}
