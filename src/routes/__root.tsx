import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/offline-banner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

// Después de cada deploy, Vite genera archivos JS con nombres/hash nuevos.
// Si alguien tiene una pestaña abierta desde antes del deploy, su HTML viejo
// intenta pedir un chunk que ya no existe -> 404 -> "Esta página no cargó".
// No es un bug de la app, es inevitable con code-splitting; lo mitigamos
// recargando automáticamente UNA vez (con guardia en sessionStorage para
// no entrar en loop si el error es de verdad).
function isStaleChunkError(error: Error): boolean {
  const msg = `${error.message} ${error.name}`.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("failed to import") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    (msg.includes("failed to load") && msg.includes("chunk"))
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    if (isStaleChunkError(error)) {
      const RELOAD_GUARD_KEY = "nuva_stale_chunk_reload_at";
      const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      // Solo auto-recargamos si no lo intentamos en los últimos 10s, para
      // no quedar en un ciclo infinito si el problema persiste.
      if (Date.now() - lastReload > 10_000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no cargó
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nüva One — Gestiona todo tu negocio desde un solo lugar" },
      {
        name: "description",
        content:
          "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis.",
      },
      { name: "author", content: "Nüva One" },
      { property: "og:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" },
      {
        property: "og:description",
        content:
          "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" },
      {
        name: "twitter:description",
        content:
          "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    // Red de seguridad extra: un dynamic import() fallido a veces rechaza
    // como promesa no manejada en vez de llegar al error boundary de la
    // ruta (ej. si pasa durante el prefetch de una ruta antes de navegar).
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event?.reason;
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (isStaleChunkError(err)) {
        const RELOAD_GUARD_KEY = "nuva_stale_chunk_reload_at";
        const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
        if (Date.now() - lastReload > 10_000) {
          sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
          window.location.reload();
        }
      }
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
