import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

const included = [
  "Inventario y scanner",
  "Ventas y cotizaciones",
  "Clientes y CRM",
  "Finanzas y flujo de caja",
  "Nüva Score, Radar y Copilot",
];

function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Nüva One
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Empieza gratis. Escala cuando lo necesites.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Prueba Nüva One durante 15 días, sin tarjeta. Conecta la operación de tu negocio y descubre qué cambia cuando los datos trabajan juntos.
          </p>
        </div>

        <section className="mx-auto mt-12 max-w-md rounded-3xl border bg-card p-7 shadow-xl sm:p-9" aria-label="Plan de prueba Nüva One">
          <p className="text-sm font-semibold text-primary">Prueba Nüva One</p>
          <p className="mt-2 text-4xl font-bold tracking-tight">15 días gratis</p>
          <p className="mt-2 text-sm text-muted-foreground">Sin tarjeta para comenzar.</p>
          <ul className="mt-7 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            Empezar gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link to="/" className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-accent">
            Volver al inicio
          </Link>
        </section>
      </div>
    </main>
  );
}
