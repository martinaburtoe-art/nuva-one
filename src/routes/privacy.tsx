import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidad — NovaFlow" }] }),
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
            <span className="font-semibold tracking-tight">NovaFlow</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate dark:prose-invert">
        <h1>Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground"><em>Última actualización: {new Date().toLocaleDateString("es-CL")}</em></p>
        <p className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Aviso:</strong> Este es un texto de marcador de posición. Antes de operar comercialmente debe ser revisado por un abogado con experiencia en la Ley 19.628 y la nueva Ley de Protección de Datos Personales en Chile.
        </p>
        <h2>1. Información que recolectamos</h2>
        <p>Recolectamos información que tú nos proporcionas directamente (nombre, email, teléfono, datos de tu negocio), así como datos de uso de la plataforma.</p>
        <h2>2. Cómo usamos tu información</h2>
        <p>Usamos tu información para proveer, mantener y mejorar nuestros servicios; para comunicarnos contigo; y para cumplir obligaciones legales.</p>
        <h2>3. Compartir información</h2>
        <p>No vendemos tus datos. Compartimos información solo con proveedores de servicios necesarios para operar la plataforma y bajo acuerdos de confidencialidad.</p>
        <h2>4. Tus derechos</h2>
        <p>Conforme a la Ley 19.628 y la legislación vigente, tienes derecho a acceder, rectificar, eliminar y portar tus datos. Para ejercer estos derechos, contáctanos.</p>
        <h2>5. Seguridad</h2>
        <p>Aplicamos cifrado en tránsito y en reposo, control de acceso por roles, aislamiento de datos por negocio (Row-Level Security) y auditorías periódicas.</p>
        <h2>6. Contacto</h2>
        <p>Para consultas sobre privacidad: privacidad@novaflow.cl</p>
      </main>
    </div>
  );
}
