import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/offline-banner";
import { PymeNewsHub } from "@/components/pyme-news-hub-v2";
import { NuvaOperatingPulse } from "@/components/nuva-operating-pulse";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">La página que buscas no existe o fue movida.</p>
        <div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Volver al inicio</Link></div>
      </div>
    </div>
  );
}

function isStaleChunkError(error: Error): boolean {
  const msg = `${error.message} ${error.name}`.toLowerCase();
  return msg.includes("failed to fetch dynamically imported module") || msg.includes("failed to import") || msg.includes("importing a module script failed") || msg.includes("error loading dynamically imported module") || (msg.includes("failed to load") && msg.includes("chunk"));
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    if (isStaleChunkError(error)) {
      const RELOAD_GUARD_KEY = "nuva_stale_chunk_reload_at";
      const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - lastReload > 10_000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Esta página no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">Algo salió mal. Puedes intentar de nuevo o volver al inicio.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Reintentar</button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Inicio</a>
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
      { name: "description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." },
      { name: "author", content: "Nüva One" },
      { property: "og:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" },
      { property: "og:description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" },
      { name: "twitter:description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="es"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RouteEnhancements() {
  const location = useLocation();
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const path = location.pathname;
    const isLanding = path === "/";
    const isCustomers = path === "/customers";
    if (!isLanding && !isCustomers) {
      setMount(null);
      return;
    }

    const mountNode = document.createElement("div");
    mountNode.dataset.nuvaRouteEnhancement = isLanding ? "pyme-radar" : "operating-pulse";

    if (isLanding) {
      const main = document.querySelector("main");
      if (!main) return;
      mountNode.className = "mx-auto max-w-7xl px-6 py-12 sm:py-16";
      const firstSection = main.firstElementChild;
      if (firstSection?.nextSibling) main.insertBefore(mountNode, firstSection.nextSibling);
      else main.appendChild(mountNode);
    } else {
      // Keep Operating Pulse in the same visual position at the top of Clientes,
      // but mount it inside the actual CRM page content rather than the global shell.
      const heading = Array.from(document.querySelectorAll("main h1")).find(
        (node) => node.textContent?.trim() === "Clientes",
      );
      const pageHeader = heading?.parentElement?.parentElement;
      const content = pageHeader?.parentElement;
      if (!pageHeader || !content) return;

      mountNode.className = "mb-6 w-full";
      content.insertBefore(mountNode, pageHeader);
    }

    setMount(mountNode);
    return () => {
      setMount(null);
      mountNode.remove();
    };
  }, [location.pathname]);

  if (!mount) return null;
  return createPortal(location.pathname === "/" ? <PymeNewsHub /> : <NuvaOperatingPulse />, mount);
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
      <RouteEnhancements />
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
