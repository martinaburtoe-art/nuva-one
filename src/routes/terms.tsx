import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Términos de Servicio — Nüva One" }] }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate dark:prose-invert">
        <h1>Términos de Servicio</h1>
        <p className="text-sm text-muted-foreground">
          <em>Última actualización: {new Date().toLocaleDateString("es-CL")}</em>
        </p>
        <p className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Aviso:</strong> Este texto es un borrador orientativo redactado con IA en base a
          la legislación chilena vigente (Ley N.º 19.496 sobre Protección de los Derechos de los
          Consumidores, Código Civil y Ley N.º 21.719 sobre Protección de Datos Personales). No
          reemplaza la revisión de un abogado y debe adaptarse a los datos reales de la empresa
          antes de operar comercialmente.
        </p>

        <h2>1. Identificación del prestador del servicio</h2>
        <p>
          Nüva One es operado por Martín Ariel Aburto Espinoza, RUT 21.553.180-5, persona natural
          con domicilio en Talca, Región del Maule, Chile ("Nüva One", "nosotros"). Estos Términos
          rigen el uso de la plataforma de gestión Nüva One (sitio web, aplicación y API) por parte
          de personas naturales o jurídicas ("el usuario", "tú").
        </p>

        <h2>2. Aceptación de los términos</h2>
        <p>
          Al crear una cuenta, acceder o usar Nüva One, aceptas estos Términos en su totalidad y
          nuestra <Link to="/privacy">Política de Privacidad</Link>. Si no estás de acuerdo, no
          debes usar el servicio. Si actúas en representación de una empresa, declaras tener
          facultades suficientes para obligarla.
        </p>

        <h2>3. Descripción del servicio</h2>
        <p>
          Nüva One es una plataforma de gestión para PYMEs que incluye, entre otros, módulos de
          inventario, ventas, punto de venta (Caja), compras, finanzas, cotizaciones, marketing,
          automatizaciones, integración con WhatsApp Business (API de Meta) y un asistente basado en
          inteligencia artificial. Nos reservamos el derecho de modificar, agregar o discontinuar
          funcionalidades, notificando cambios relevantes con antelación razonable cuando sea
          posible.
        </p>

        <h2>4. Cuenta de usuario y seguridad</h2>
        <ul>
          <li>
            Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad
            realizada bajo tu cuenta.
          </li>
          <li>Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.</li>
          <li>
            Si tu negocio tiene múltiples usuarios (roles Propietario/Administrador/Staff/Solo
            lectura), el propietario del negocio es responsable de asignar los permisos adecuados a
            cada persona y de las acciones que estas realicen dentro de la plataforma.
          </li>
        </ul>

        <h2>5. Planes, precios y facturación</h2>
        <ul>
          <li>
            <strong>Prueba gratuita:</strong> 15 días con acceso completo a la plataforma, sin
            necesidad de tarjeta de crédito. Al finalizar, el acceso queda restringido hasta
            contratar el plan Pro.
          </li>
          <li>
            <strong>Plan Pro:</strong> suscripción mensual de pago recurrente, cuyo valor vigente se
            muestra en la plataforma al momento de la contratación. Los pagos se procesan mediante
            Stripe; no almacenamos los datos completos de tu tarjeta.
          </li>
          <li>
            Puedes cancelar tu suscripción en cualquier momento desde la sección de Facturación. La
            cancelación tendrá efecto al término del período ya pagado, sin cobros adicionales.
          </li>
          <li>
            Conforme a la Ley N.º 19.496, tienes derecho a información clara sobre el precio total,
            condiciones de contratación y a que no se te cobren servicios no contratados
            expresamente.
          </li>
          <li>
            Los precios pueden actualizarse; los cambios se notificarán antes de aplicarse a
            suscripciones vigentes.
          </li>
        </ul>

        <h2>6. Propiedad y portabilidad de los datos</h2>
        <p>
          Mantienes la propiedad de todos los datos de tu negocio que ingreses a la plataforma
          (productos, ventas, clientes, finanzas, etc.). Puedes exportarlos o solicitar su
          eliminación en cualquier momento. Si cancelas tu cuenta, conservaremos una copia de
          respaldo por un plazo razonable exigido por obligaciones legales o contables, y luego será
          eliminada conforme a nuestra Política de Privacidad.
        </p>

        <h2>7. Uso aceptable</h2>
        <p>No debes usar Nüva One para:</p>
        <ul>
          <li>Actividades ilícitas, fraudulentas o que infrinjan derechos de terceros.</li>
          <li>
            Enviar comunicaciones no solicitadas (spam) a través del módulo de WhatsApp o Marketing,
            incumpliendo las políticas de Meta o la normativa aplicable.
          </li>
          <li>
            Intentar vulnerar la seguridad de la plataforma, acceder a datos de otros negocios, o
            realizar ingeniería inversa.
          </li>
          <li>
            Usar el asistente de IA para generar contenido ilegal, engañoso o que infrinja derechos
            de terceros.
          </li>
        </ul>

        <h2>8. Inteligencia artificial</h2>
        <p>
          El asistente de IA y el bot de WhatsApp generan respuestas automatizadas a partir de los
          datos de tu negocio y modelos de terceros. Si bien procuramos que la información entregada
          (stock, precios, resúmenes) sea precisa, puede contener errores; te recomendamos verificar
          decisiones relevantes (precios, compromisos comerciales) antes de comunicarlas a tus
          clientes. No garantizamos la exactitud absoluta del contenido generado por IA.
        </p>

        <h2>9. Integraciones de terceros</h2>
        <p>
          Nüva One se integra con servicios de terceros — Meta (WhatsApp Business API), Stripe
          (pagos) y proveedores de infraestructura en la nube — cuyos propios términos y políticas
          también te resultan aplicables al usar dichas funciones. No somos responsables por
          interrupciones o cambios en estos servicios de terceros que estén fuera de nuestro control
          razonable.
        </p>

        <h2>10. Limitación de responsabilidad</h2>
        <p>
          Nüva One se entrega "tal cual" y "según disponibilidad", sin garantías implícitas de
          idoneidad para un propósito particular más allá de las exigidas por ley. En la medida
          permitida por la legislación chilena, nuestra responsabilidad total frente a ti se limita
          al monto pagado por el servicio en los últimos 12 meses. Nada en estos Términos limita
          responsabilidades que no puedan limitarse conforme a la Ley N.º 19.496 u otra norma
          imperativa.
        </p>

        <h2>11. Suspensión y terminación</h2>
        <p>
          Podemos suspender o terminar tu acceso ante incumplimientos graves de estos Términos, uso
          fraudulento o falta de pago, previa notificación cuando sea razonablemente posible. Tú
          puedes terminar tu cuenta en cualquier momento.
        </p>

        <h2>12. Modificaciones a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos periódicamente. Los cambios sustanciales serán
          notificados por correo electrónico o dentro de la plataforma con al menos 15 días de
          anticipación a su entrada en vigencia. El uso continuado del servicio implica la
          aceptación de los nuevos términos.
        </p>

        <h2>13. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia
          será sometida a los tribunales ordinarios de justicia de la ciudad de Talca, sin perjuicio
          de los derechos que asisten al consumidor conforme a la Ley N.º 19.496 de acudir a los
          tribunales de su domicilio.
        </p>

        <h2>14. Contacto</h2>
        <p>
          Para consultas legales o contractuales escríbenos a: [correo legal, ej. legal@nuvaone.cl]
        </p>
      </main>
    </div>
  );
}
