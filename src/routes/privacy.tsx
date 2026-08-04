import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidad — Nüva One" }] }),
  component: Privacy,
});

function Privacy() {
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
        <h1>Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground">
          <em>Última actualización: {new Date().toLocaleDateString("es-CL")}</em>
        </p>
        <p className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Aviso:</strong> Este texto es un borrador orientativo redactado con IA en base a
          la Ley N.º 19.628 y la Ley N.º 21.719 sobre Protección de Datos Personales (que crea la
          Agencia de Protección de Datos Personales y entra en vigor en diciembre de 2026). No
          reemplaza la revisión de un abogado y debe completarse con los datos reales de la empresa
          antes de operar comercialmente.
        </p>

        <h2>1. Responsable del tratamiento de datos</h2>
        <p>
          El responsable del tratamiento de los datos personales recolectados a través de Nüva One
          es Martín Ariel Aburto Espinoza, RUT 21.553.180-5, operando como persona natural con
          domicilio en Talca, Región del Maule, Chile. Contacto para materias de privacidad:
          privacidad@nuvaone.cl. Si el volumen o sensibilidad de los datos tratados lo requiere en
          el futuro conforme a la Ley N.º 21.719, se designará e informará aquí un Delegado de
          Protección de Datos (DPO).
        </p>

        <h2>2. Qué información recolectamos</h2>
        <ul>
          <li>
            <strong>Datos de la cuenta:</strong> nombre, correo electrónico, teléfono, contraseña
            (cifrada) y rol dentro de tu negocio.
          </li>
          <li>
            <strong>Datos del negocio:</strong> nombre comercial, rubro, productos, precios, stock,
            ventas, compras, clientes, proveedores, cotizaciones y movimientos financieros que tú o
            tu equipo ingresan.
          </li>
          <li>
            <strong>Datos de clientes finales de tu negocio:</strong> si activas el bot de WhatsApp,
            procesamos los mensajes que los clientes de tu negocio te envían (número de teléfono,
            contenido del mensaje) únicamente para responder consultas de stock/precio y dejar un
            registro de la conversación.
          </li>
          <li>
            <strong>Datos de pago:</strong> gestionados directamente por Stripe; no almacenamos el
            número completo de tu tarjeta en nuestros servidores.
          </li>
          <li>
            <strong>Datos de uso:</strong> registros técnicos (IP, dispositivo, acciones dentro de
            la plataforma) para seguridad y auditoría.
          </li>
        </ul>

        <h2>3. Base legal del tratamiento</h2>
        <p>Tratamos tus datos conforme a las siguientes bases legales, según corresponda:</p>
        <ul>
          <li>
            <strong>Ejecución del contrato:</strong> para proveerte el servicio que contrataste
            (gestión de tu negocio, facturación).
          </li>
          <li>
            <strong>Consentimiento:</strong> para comunicaciones de marketing, que puedes retirar en
            cualquier momento.
          </li>
          <li>
            <strong>Interés legítimo:</strong> para seguridad de la plataforma, prevención de fraude
            y el registro de auditoría interno de tu negocio (ver sección 7).
          </li>
          <li>
            <strong>Obligación legal:</strong> para cumplir requerimientos tributarios, contables o
            de autoridades competentes.
          </li>
        </ul>

        <h2>4. Cómo usamos tu información</h2>
        <p>
          Usamos tu información para proveer, mantener y mejorar la plataforma; procesar pagos;
          enviar comunicaciones operativas y, si lo autorizas, de marketing; generar respuestas del
          asistente de IA y del bot de WhatsApp a partir de los datos de tu propio negocio; y
          cumplir obligaciones legales y contables.
        </p>

        <h2>5. Con quién compartimos información</h2>
        <p>
          No vendemos tus datos personales ni los de tus clientes. Los compartimos únicamente con:
        </p>
        <ul>
          <li>
            <strong>Proveedores de infraestructura y base de datos</strong> (hosting en la nube)
            necesarios para operar la plataforma.
          </li>
          <li>
            <strong>Stripe</strong>, para procesar pagos de suscripción.
          </li>
          <li>
            <strong>Meta Platforms, Inc.</strong>, al usar la integración de WhatsApp Business,
            conforme a las propias políticas de privacidad de Meta.
          </li>
          <li>
            <strong>Proveedores de modelos de inteligencia artificial</strong>, a quienes se envía
            el contexto mínimo necesario (catálogo, resúmenes de negocio) para generar respuestas;
            no se comparten datos de tarjetas de pago con estos proveedores.
          </li>
          <li>
            Autoridades públicas, cuando exista una obligación legal o un requerimiento judicial
            válido.
          </li>
        </ul>

        <h2>6. Transferencias internacionales de datos</h2>
        <p>
          Parte de nuestros proveedores (hosting, IA, Stripe, Meta) puede procesar datos en
          servidores ubicados fuera de Chile. Cuando esto ocurra, exigimos a dichos proveedores
          estándares de protección de datos adecuados (cláusulas contractuales, certificaciones de
          seguridad) conforme a lo exigido por la Ley N.º 21.719 para transferencias internacionales
          de datos personales.
        </p>

        <h2>7. Registro de auditoría interno</h2>
        <p>
          Si tu negocio tiene más de un usuario, Nüva One registra automáticamente qué usuario
          realizó ciertas acciones relevantes (ventas, cambios de inventario, movimientos
          financieros, cotizaciones) y a qué hora, con el fin de proteger al propietario del negocio
          frente a errores o mal uso interno. Este registro es visible solo para el propietario y
          administradores del negocio, no puede ser editado ni eliminado desde la aplicación, y se
          trata como información confidencial del negocio.
        </p>

        <h2>8. Tus derechos (ARCO+)</h2>
        <p>
          Conforme a la Ley N.º 19.628 y la Ley N.º 21.719, tienes derecho a:{" "}
          <strong>acceder</strong> a tus datos personales, <strong>rectificarlos</strong> si son
          inexactos, <strong>cancelarlos/eliminarlos</strong> cuando ya no sean necesarios o retires
          tu consentimiento, <strong>oponerte</strong> a determinados tratamientos, y solicitar la{" "}
          <strong>portabilidad</strong> de tus datos en un formato estructurado. Para ejercer estos
          derechos, escríbenos a [correo de privacidad]; responderemos dentro del plazo legal
          aplicable. Si no quedas conforme con nuestra respuesta, puedes reclamar ante la Agencia de
          Protección de Datos Personales una vez que se encuentre en funcionamiento.
        </p>

        <h2>9. Conservación de datos</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si cancelas tu cuenta, conservamos
          una copia por el plazo mínimo exigido por obligaciones legales, tributarias o contables, y
          luego la eliminamos o anonimizamos de forma segura.
        </p>

        <h2>10. Seguridad de la información</h2>
        <p>
          Aplicamos cifrado en tránsito y en reposo, control de acceso por roles, aislamiento de
          datos por negocio mediante Row-Level Security a nivel de base de datos, verificación de
          firma en las integraciones con terceros (Meta, Stripe), y el registro de auditoría
          descrito en la sección 7. Ante un incidente de seguridad que afecte tus datos personales,
          te notificaremos conforme a los plazos y condiciones que establezca la normativa vigente.
        </p>

        <h2>11. Menores de edad</h2>
        <p>
          Nüva One está dirigido a personas naturales y jurídicas que operan un negocio y no está
          destinado a menores de 18 años.
        </p>

        <h2>12. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta Política. Los cambios sustanciales serán notificados por correo
          electrónico o dentro de la plataforma con anticipación razonable.
        </p>

        <h2>13. Contacto</h2>
        <p>
          Para consultas sobre privacidad o para ejercer tus derechos: [correo, ej.
          privacidad@nuvaone.cl]
        </p>
      </main>
    </div>
  );
}
