import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Términos de Servicio — NovaFlow" }] }),
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
            <span className="font-semibold tracking-tight">NovaFlow</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate dark:prose-invert">
        <h1>Términos de Servicio</h1>
        <p className="text-sm text-muted-foreground"><em>Última actualización: {new Date().toLocaleDateString("es-CL")}</em></p>
        <p className="rounded-lg border bg-warning/10 p-4 text-sm">
          <strong>Aviso:</strong> Texto de marcador de posición. Debe ser revisado y adaptado por un asesor legal antes del uso comercial.
        </p>
        <h2>1. Aceptación</h2>
        <p>Al usar NovaFlow aceptas estos términos en su totalidad.</p>
        <h2>2. Uso del servicio</h2>
        <p>Eres responsable de mantener la confidencialidad de tu cuenta y de toda actividad realizada bajo ella.</p>
        <h2>3. Planes y pagos</h2>
        <p>Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta.</p>
        <h2>4. Propiedad de los datos</h2>
        <p>Mantienes la propiedad de todos los datos que ingresas en la plataforma. Puedes exportarlos o eliminarlos cuando quieras.</p>
        <h2>5. Limitación de responsabilidad</h2>
        <p>NovaFlow se entrega "tal cual", sin garantías implícitas o explícitas más allá de las exigidas por ley.</p>
        <h2>6. Contacto</h2>
        <p>Para consultas legales: legal@novaflow.cl</p>
      </main>
    </div>
  );
}
