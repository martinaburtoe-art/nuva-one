import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/payment/confirmation")({
  component: PaymentConfirmation,
});

function PaymentConfirmation() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nüva One · Pagos</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Estamos verificando tu pago</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          El proveedor de pagos está confirmando la operación. El documento se actualizará automáticamente cuando recibamos la confirmación segura. No necesitas volver a pagar.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Si el estado no cambia después de unos minutos, contacta al negocio que emitió el documento y comparte tu comprobante.
        </p>
        <Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
          Volver a Nüva One
        </Link>
      </section>
    </main>
  );
}
