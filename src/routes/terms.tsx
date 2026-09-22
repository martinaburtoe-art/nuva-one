import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const LAST_UPDATED = "22 de septiembre de 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Términos y Condiciones — Nüva One" }] }),
  component: Terms,
});

function Terms() {
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
        <h1>Términos y Condiciones de Nüva One</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Versión:</strong> 1.0 · <strong>Última actualización:</strong> {LAST_UPDATED}
        </p>

        <p>
          Estos Términos y Condiciones regulan el acceso y uso de Nüva One, incluyendo su sitio
          web, aplicación, módulos, servicios asociados e interfaces de programación disponibles
          al usuario. Están redactados para operar en Chile y deben interpretarse de conformidad
          con las normas imperativas aplicables. Cuando una norma otorgue a un consumidor un
          derecho irrenunciable, este documento no lo limita ni lo excluye.
        </p>

        <div className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Importante:</strong> este documento constituye una base contractual y de
          cumplimiento preparada a partir de la normativa chilena identificada a la fecha de su
          actualización. Antes de una operación comercial masiva debe ser revisado por un abogado
          habilitado en Chile y completado con la razón social o calidad jurídica definitiva del
          prestador, domicilio contractual, correo de contacto legal, precios, política de
          contratación, tratamiento de datos y demás antecedentes reales de Nüva One.
        </div>

        <h2>1. Identificación del prestador y ámbito</h2>
        <p>
          Nüva One es operado, según la información actualmente declarada por el proyecto, por
          Martín Ariel Aburto Espinoza, RUT 21.553.180-5, con domicilio en Talca, Región del Maule,
          Chile (en adelante, “Nüva One”, “el Prestador” o “nosotros”).
        </p>
        <p>
          Si antes de la contratación el servicio pasa a ser explotado por una sociedad u otra
          persona jurídica, la identificación contractual deberá actualizarse y prevalecerá la
          información legal exhibida en el proceso de contratación.
        </p>

        <h2>2. Definiciones</h2>
        <ul>
          <li><strong>Plataforma:</strong> sitio web, aplicación, API y servicios digitales de Nüva One.</li>
          <li><strong>Usuario:</strong> persona natural o jurídica que accede o contrata el servicio.</li>
          <li><strong>Cuenta:</strong> credenciales y configuración asociadas al acceso de un usuario.</li>
          <li><strong>Datos del Usuario:</strong> información, archivos, registros, catálogos y demás contenido que el usuario incorpora o genera legítimamente mediante la Plataforma.</li>
          <li><strong>Servicios de Terceros:</strong> servicios externos integrados o utilizados por la Plataforma, como proveedores de infraestructura, pagos, autenticación, mensajería, IA o APIs.</li>
        </ul>

        <h2>3. Formación y aceptación del contrato</h2>
        <p>
          La contratación electrónica requiere que el usuario pueda conocer previamente y de forma
          clara las condiciones aplicables, el precio total o costo por período, las funcionalidades
          relevantes, las condiciones de renovación, cancelación y demás información exigible.
          La aceptación deberá efectuarse mediante una acción inequívoca; el silencio o la sola
          navegación por el sitio no constituyen aceptación contractual.
        </p>
        <p>
          Cuando corresponda, Nüva One conservará evidencia técnica de la contratación, como versión
          de los términos aceptados, fecha, hora y datos necesarios para acreditar la operación,
          respetando los principios de minimización y protección de datos.
        </p>

        <h2>4. Capacidad y representación</h2>
        <p>
          El usuario declara tener capacidad legal para contratar. Si actúa por una empresa,
          organización o tercero, declara contar con facultades suficientes para obligarlo. El
          administrador de una cuenta empresarial es responsable de mantener actualizados sus
          representantes y permisos internos.
        </p>

        <h2>5. Descripción del servicio</h2>
        <p>
          Nüva One es una plataforma de gestión para pymes y negocios que puede incluir módulos de
          ventas, inventario, compras, gastos, finanzas, cotizaciones, CRM, marketing, analítica,
          automatizaciones, inteligencia artificial, integraciones y otras funcionalidades que se
          indiquen expresamente en cada plan.
        </p>
        <p>
          Las funcionalidades disponibles, límites, integraciones y condiciones pueden variar por
          plan. Las características concretas contratadas serán las informadas al momento de la
          contratación y no podrán modificarse en perjuicio del usuario consumidor contrariando las
          normas imperativas aplicables.
        </p>

        <h2>6. Prueba, planes, precios y contratación</h2>
        <ul>
          <li><strong>Prueba:</strong> cuando exista una prueba gratuita, su duración, alcance y fecha de término se informarán antes de su activación. No se efectuará un cobro por el solo término de la prueba salvo que el usuario haya contratado previamente un plan pagado y las condiciones hayan sido informadas de manera clara.</li>
          <li><strong>Precio:</strong> el precio aplicable será el informado antes de contratar, incluyendo los impuestos, cargos y costos que legalmente deban integrarse al costo total.</li>
          <li><strong>Suscripción:</strong> si el plan es recurrente, se informará expresamente la periodicidad, monto o fórmula de cálculo, medio de pago, fecha o regla de cobro y mecanismo de cancelación.</li>
          <li><strong>Medio de pago:</strong> los pagos pueden ser procesados por terceros especializados, actualmente Stripe cuando dicha integración se encuentre habilitada. Nüva One no pretende almacenar el número completo de tarjetas de pago en sus propios sistemas.</li>
          <li><strong>Comprobantes:</strong> cuando corresponda, se entregará confirmación electrónica de la contratación y del pago conforme a la normativa aplicable.</li>
        </ul>

        <h2>7. Renovación, cancelación y término de suscripción</h2>
        <p>
          Las suscripciones de duración determinada o renovables se regirán por las condiciones
          informadas antes de contratar. El usuario podrá solicitar la cancelación mediante los
          mecanismos habilitados en la Plataforma o por el canal de contacto informado.
        </p>
        <p>
          La cancelación de una suscripción recurrente impide nuevos cobros posteriores al término
          del período ya pagado, salvo obligaciones legítimamente devengadas con anterioridad. Si la
          legislación aplicable reconoce un derecho de término anticipado o retracto, éste prevalecerá.
        </p>
        <p>
          Nüva One no podrá imponer renovaciones, cobros adicionales o servicios accesorios que no
          hayan sido informados y aceptados conforme a la legislación aplicable.
        </p>

        <h2>8. Derecho de retracto y derechos del consumidor</h2>
        <p>
          Cuando el usuario tenga la calidad de consumidor bajo la Ley N.º 19.496, se respetarán los
          derechos que dicha ley reconoce en contratación electrónica. En particular, cuando resulte
          aplicable el derecho de retracto de los contratos celebrados por medios electrónicos, el
          consumidor podrá ejercerlo dentro del plazo y bajo las condiciones establecidos por la
          ley, salvo que exista una exclusión válida expresamente informada y permitida por ella.
        </p>
        <p>
          Nada en estos Términos pretende excluir o restringir garantías, acciones, indemnizaciones,
          derechos de información, retracto u otros derechos que la normativa de protección al
          consumidor establezca imperativamente.
        </p>

        <h2>9. Datos del negocio y titularidad</h2>
        <p>
          Entre Nüva One y el usuario, el usuario conserva sus derechos sobre los Datos del Usuario
          que legítimamente incorpore a la Plataforma. Nüva One obtiene únicamente las licencias
          técnicas necesarias para alojar, procesar, respaldar, transmitir y mostrar esos datos con
          el objeto de prestar el servicio contratado.
        </p>
        <p>
          El usuario garantiza que posee las autorizaciones necesarias para ingresar y tratar datos
          de terceros dentro de la Plataforma y que dicho tratamiento es lícito. En particular, si
          incorpora datos de clientes, trabajadores, proveedores o contactos, deberá contar con la
          base jurídica y las autorizaciones que correspondan.
        </p>

        <h2>10. Protección de datos personales</h2>
        <p>
          El tratamiento de datos personales se rige por la
          <Link to="/privacy"> Política de Privacidad de Nüva One</Link>, que forma parte del marco
          contractual de la Plataforma en lo que corresponda.
        </p>
        <p>
          Nüva One aplicará los principios y obligaciones de protección de datos que resulten
          exigibles en Chile, incluyendo licitud, finalidad, proporcionalidad, calidad, seguridad,
          transparencia y confidencialidad. Para tratamientos realizados por cuenta de un cliente
          empresarial, la asignación de roles entre responsable y encargado del tratamiento deberá
          atender a la realidad de cada tratamiento y al contrato aplicable.
        </p>
        <p>
          Considerando la entrada en vigor de la Ley N.º 21.719 el 1 de diciembre de 2026, Nüva One
          procurará mantener sus procesos, contratos y documentación preparados para sus exigencias
          antes de dicha fecha, incluyendo derechos de los titulares, minimización, seguridad,
          conservación y transferencias internacionales cuando sean aplicables.
        </p>

        <h2>11. Seguridad y gestión de incidentes</h2>
        <p>
          Nüva One implementará medidas técnicas y organizativas razonables y proporcionales al
          riesgo, incluyendo controles de acceso, separación de información entre negocios,
          protección de credenciales, cifrado cuando corresponda, monitoreo técnico y mecanismos de
          respaldo y recuperación que formen parte de la arquitectura vigente.
        </p>
        <p>
          Ningún sistema conectado a Internet puede garantizar seguridad absoluta. En caso de un
          incidente que afecte datos personales, Nüva One actuará conforme a las obligaciones
          legales aplicables, sus procedimientos de respuesta y los deberes de notificación que
          correspondan según la naturaleza del incidente.
        </p>

        <h2>12. Uso permitido</h2>
        <p>El usuario deberá utilizar la Plataforma de manera lícita y conforme a estos Términos. Queda prohibido:</p>
        <ul>
          <li>utilizar la Plataforma para cometer, facilitar o encubrir delitos, fraude o actividades ilícitas;</li>
          <li>acceder o intentar acceder a cuentas, datos o sistemas sin autorización;</li>
          <li>introducir malware, código malicioso o mecanismos destinados a degradar, interrumpir o evadir controles de seguridad;</li>
          <li>explotar vulnerabilidades sin autorización del titular del sistema, sin perjuicio de los canales de reporte de seguridad que Nüva One habilite;</li>
          <li>usar la Plataforma para enviar spam o comunicaciones no solicitadas infringiendo la normativa o las reglas de terceros;</li>
          <li>suplantar identidades, manipular información o infringir derechos de propiedad intelectual o privacidad de terceros;</li>
          <li>usar automatizaciones, scraping o cargas que excedan razonablemente los límites técnicos publicados o que afecten la disponibilidad del servicio.</li>
        </ul>

        <h2>13. Cuenta, credenciales y permisos</h2>
        <p>
          El usuario debe mantener sus credenciales bajo control, utilizar contraseñas robustas,
          activar los mecanismos de seguridad disponibles y comunicar oportunamente cualquier acceso
          no autorizado. En cuentas empresariales, el propietario o administrador debe asignar
          permisos según las funciones reales de cada integrante.
        </p>
        <p>
          Nüva One no solicitará por canales ordinarios contraseñas, códigos de recuperación ni
          tokens de autenticación. El usuario no debe compartirlos con terceros.
        </p>

        <h2>14. Inteligencia artificial y decisiones automatizadas</h2>
        <p>
          Algunas funciones pueden utilizar modelos de inteligencia artificial para generar
          explicaciones, resúmenes, sugerencias, clasificaciones, predicciones o contenido. Las
          salidas pueden contener errores, omisiones o información desactualizada y no constituyen
          por sí mismas asesoría legal, tributaria, contable, financiera, laboral ni profesional.
        </p>
        <p>
          El usuario conserva la responsabilidad de revisar y validar decisiones que puedan producir
          efectos económicos, tributarios, contractuales, laborales o regulatorios. Nüva One no
          garantiza que una recomendación generada por IA sea adecuada para una situación concreta.
          Las funciones de IA no sustituyen las obligaciones legales del usuario ni la revisión
          profesional cuando ésta sea necesaria.
        </p>

        <h2>15. Integraciones y servicios de terceros</h2>
        <p>
          La Plataforma puede integrarse con proveedores como Stripe, Meta/WhatsApp, Google,
          proveedores de infraestructura y modelos de IA, entre otros. Cada integración puede estar
          sujeta a sus propios términos, políticas, límites, disponibilidad y cambios técnicos.
        </p>
        <p>
          Cuando una funcionalidad dependa materialmente de un tercero, Nüva One no garantiza la
          continuidad de un servicio externo que esté fuera de su control razonable. Esto no afecta
          las responsabilidades que legalmente correspondan a Nüva One por sus propios servicios.
        </p>

        <h2>16. Propiedad intelectual de Nüva One</h2>
        <p>
          El software, código, arquitectura, diseño, marca, logotipos, textos, interfaces y demás
          elementos propios de Nüva One pertenecen al Prestador o a sus respectivos licenciantes y
          están protegidos por la legislación aplicable. El usuario recibe una autorización limitada,
          no exclusiva, no transferible y revocable para utilizar la Plataforma durante la vigencia
          de su contratación y conforme a estos Términos.
        </p>
        <p>
          Los derechos sobre contenidos de terceros permanecen en sus respectivos titulares. Nada
          de estos Términos transfiere al usuario derechos de propiedad intelectual que no se hayan
          concedido expresamente.
        </p>

        <h2>17. Disponibilidad, mantenimiento y continuidad</h2>
        <p>
          Nüva One procurará mantener la Plataforma disponible y operativa, pero podrá efectuar
          mantenimientos programados, actualizaciones, correcciones de seguridad o intervenciones
          urgentes. Cuando sea razonablemente posible, los mantenimientos planificados se informarán
          con anticipación.
        </p>
        <p>
          Salvo que un plan o contrato específico establezca un SLA, estos Términos no constituyen
          una garantía de disponibilidad ininterrumpida. Interrupciones derivadas de proveedores
          externos, fuerza mayor, incidentes de ciberseguridad u otras causas fuera del control
          razonable serán gestionadas conforme a procedimientos de continuidad y recuperación.
        </p>

        <h2>18. Respaldos y exportación</h2>
        <p>
          Nüva One podrá mantener respaldos técnicos para continuidad operacional y recuperación.
          Los respaldos no sustituyen la obligación del usuario de conservar copias de información
          que deba mantener por razones legales, tributarias, contables o comerciales.
        </p>
        <p>
          Mientras la funcionalidad se encuentre disponible, el usuario podrá exportar la
          información mediante los mecanismos ofrecidos por la Plataforma. Las solicitudes de
          eliminación y conservación se coordinarán con la Política de Privacidad y con las
          obligaciones legales de conservación que correspondan.
        </p>

        <h2>19. Suspensión por seguridad, fraude o incumplimiento</h2>
        <p>
          Nüva One podrá suspender temporalmente una cuenta cuando sea necesario para proteger la
          Plataforma, a otros usuarios, prevenir fraude, responder a un incidente de seguridad o
          cumplir una obligación legal. Cuando sea razonablemente posible, se informará al usuario y
          se procurará limitar la suspensión a lo estrictamente necesario.
        </p>
        <p>
          Una suspensión o término no autoriza a Nüva One a apropiarse de los Datos del Usuario.
          Cuando legal y técnicamente sea posible, se facilitará la exportación o recuperación de
          datos conforme a estos Términos y la Política de Privacidad.
        </p>

        <h2>20. Limitación de responsabilidad</h2>
        <p>
          En la medida permitida por la ley y sin afectar derechos irrenunciables, Nüva One no será
          responsable por daños derivados exclusivamente de: (a) información incorrecta ingresada
          por el usuario; (b) uso contrario a estos Términos; (c) credenciales compartidas o
          comprometidas por falta de diligencia del usuario; (d) fallas de servicios de terceros
          fuera de su control razonable; o (e) fuerza mayor.
        </p>
        <p>
          En relaciones en las que resulte válida una limitación contractual de responsabilidad,
          ésta no comprenderá obligaciones o responsabilidades que legalmente no puedan excluirse o
          limitarse. En contratos sujetos a la Ley N.º 19.496 no se interpretará esta cláusula como
          una renuncia a derechos del consumidor ni como una exclusión de responsabilidad prohibida
          por la ley.
        </p>

        <h2>21. Terminación de la cuenta</h2>
        <p>
          El usuario podrá solicitar el cierre de su cuenta conforme a los mecanismos disponibles.
          Nüva One podrá terminar el contrato por incumplimiento grave, fraude, uso ilícito, riesgo
          de seguridad o falta de pago, respetando las normas imperativas y, cuando corresponda,
          otorgando una oportunidad razonable de regularización.
        </p>
        <p>
          El término no extingue obligaciones que por su naturaleza deban sobrevivir, como propiedad
          intelectual, confidencialidad, pagos devengados, responsabilidades legales y disposiciones
          relativas a datos que deban conservarse por mandato legal.
        </p>

        <h2>22. Confidencialidad</h2>
        <p>
          Las partes deberán mantener la confidencialidad de la información no pública a la que
          accedan con ocasión del servicio, salvo que su divulgación sea necesaria para prestar el
          servicio, haya sido autorizada, sea requerida por ley o corresponda a información que ya
          sea pública legítimamente.
        </p>

        <h2>23. Comunicaciones y marketing</h2>
        <p>
          Nüva One podrá enviar comunicaciones estrictamente necesarias para prestar el servicio,
          como avisos de seguridad, facturación, cambios operativos o recuperación de cuenta. Las
          comunicaciones comerciales estarán sujetas a las preferencias y requisitos legales
          aplicables. El usuario podrá solicitar dejar de recibir comunicaciones promocionales sin
          afectar las comunicaciones indispensables para la prestación del servicio.
        </p>

        <h2>24. Modificaciones de los Términos</h2>
        <p>
          Nüva One podrá actualizar estos Términos para reflejar cambios legales, regulatorios,
          tecnológicos o del servicio. La nueva versión indicará su fecha de actualización.
        </p>
        <p>
          Cuando un cambio sea material y afecte a contratos vigentes de consumidores, se comunicará
          con una anticipación razonable y de una forma que permita conocer su contenido. No se
          utilizará esta facultad para modificar unilateralmente obligaciones de un consumidor en
          contravención de la Ley N.º 19.496.
        </p>

        <h2>25. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Chile, sin perjuicio de las normas
          imperativas que resulten aplicables por razón del domicilio o calidad del usuario.
        </p>
        <p>
          Las controversias se someterán a los tribunales y mecanismos de resolución que sean
          legalmente competentes. En relaciones de consumo, nada de esta cláusula priva al consumidor
          de los derechos de competencia territorial o de las acciones que la Ley N.º 19.496 le
          reconozca.
        </p>

        <h2>26. Cumplimiento digital y ciberseguridad</h2>
        <p>
          El usuario se obliga a no utilizar Nüva One para acceder ilícitamente, interceptar,
          alterar, destruir o afectar sistemas o datos de terceros. Nüva One mantendrá medidas de
          seguridad acordes al riesgo y gestionará los incidentes conforme a la normativa que le
          resulte aplicable, incluyendo las obligaciones que correspondan bajo la legislación
          chilena de delitos informáticos y, cuando su ámbito subjetivo y material sea aplicable, la
          normativa marco de ciberseguridad.
        </p>

        <h2>27. Nulidad parcial y no renuncia</h2>
        <p>
          Si una disposición fuese declarada inválida o inaplicable, se mantendrán las restantes
          disposiciones en la medida permitida por la ley. La falta de ejercicio inmediato de un
          derecho no constituye renuncia a ejercerlo posteriormente.
        </p>

        <h2>28. Contacto y notificaciones</h2>
        <p>
          Para consultas contractuales, solicitudes relacionadas con estos Términos o comunicaciones
          legales, el canal actualmente informado es <strong>privacidad@nuvaone.cl</strong>. Si el
          Prestador habilita un correo legal específico, éste deberá sustituirlo en futuras versiones
          del documento.
        </p>

        <h2>29. Documentos relacionados</h2>
        <ul>
          <li><Link to="/privacy">Política de Privacidad</Link>.</li>
          <li>Información de precios y condiciones de cada plan, presentada antes de contratar.</li>
          <li>Políticas específicas de terceros aplicables a integraciones activadas por el usuario.</li>
        </ul>

        <h2>30. Marco normativo considerado</h2>
        <p>
          Este documento se ha estructurado considerando, entre otras normas que puedan resultar
          aplicables según el servicio y la situación concreta: Ley N.º 19.496 sobre Protección de
          los Derechos de los Consumidores y sus modificaciones; Reglamento de Comercio Electrónico,
          Decreto N.º 6 de 2021 del Ministerio de Economía; Ley N.º 19.628 y su reforma por la Ley
          N.º 21.719 sobre protección de datos personales; Ley N.º 21.459 sobre delitos informáticos;
          Ley N.º 21.663 Marco de Ciberseguridad, en cuanto corresponda por su ámbito de aplicación;
          Código Civil y demás legislación chilena aplicable.
        </p>
        <p>
          La mención de una norma no significa que Nüva One esté certificado o que todas sus
          obligaciones sean idénticas a las de cualquier entidad regulada por ella. La aplicación
          concreta depende de la naturaleza del servicio, de los datos tratados, de la calidad de
          las partes y de la actividad desarrollada.
        </p>

        <div className="mt-10 rounded-lg border bg-muted/40 p-4 text-sm">
          <strong>Versión contractual:</strong> 1.0 · Última actualización: {LAST_UPDATED}.
          Antes de aceptar estos Términos, revisa también la Política de Privacidad y las condiciones
          comerciales concretas del plan que estás contratando.
        </div>
      </main>
    </div>
  );
}
