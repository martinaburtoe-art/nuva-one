import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useLocation, HeadContent, Scripts } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";

import appCss from "../styles.css?url";
import "../home-experience.css";
import "../nuva-motion-system.css";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/offline-banner";
import { NuvaOperatingPulse } from "@/components/nuva-operating-pulse";
import { NuvaLaunchExperience } from "@/components/nuva-launch-experience";
import { PosBarcodeScanner } from "@/components/pos-barcode-scanner";
import { NuvaInfoCenter } from "@/components/nuva-info-center";
import { FloatingActionPillar } from "@/components/nuva/FloatingActionPillar";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2><p className="mt-2 text-sm text-muted-foreground">La página que buscas no existe o fue movida.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Volver al inicio</Link></div></div></div>; }
function isStaleChunkError(error: Error): boolean { const msg = `${error.message} ${error.name}`.toLowerCase(); return msg.includes("failed to fetch dynamically imported module") || msg.includes("failed to import") || msg.includes("importing a module script failed") || msg.includes("error loading dynamically imported module") || (msg.includes("failed to load") && msg.includes("chunk")); }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); if (isStaleChunkError(error)) { const key = "nuva_stale_chunk_reload_at"; const lastReload = Number(sessionStorage.getItem(key) ?? 0); if (Date.now() - lastReload > 10_000) { sessionStorage.setItem(key, String(Date.now())); window.location.reload(); } } }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">Esta página no cargó</h1><p className="mt-2 text-sm text-muted-foreground">Algo salió mal. Puedes intentar de nuevo o volver al inicio.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Reintentar</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Inicio</a></div></div></div>; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({ head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Nüva One — Gestiona todo tu negocio desde un solo lugar" }, { name: "description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." }, { name: "author", content: "Nüva One" }, { property: "og:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" }, { property: "og:description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: "Nüva One — Gestiona todo tu negocio desde un solo lugar" }, { name: "twitter:description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y automatización con IA. Empieza gratis." }, { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6" }, { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/35dcf456-e092-4e2c-b542-85106be452c6" }], links: [{ rel: "stylesheet", href: appCss }] }), shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent });
function RootShell({ children }: { children: ReactNode }) { return <html lang="es"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }
function setPosSearch(value: string) { const input = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find((node) => node.placeholder?.includes("Buscar por nombre, SKU o categoría")); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); input.focus(); return true; }
function PosScannerEnhancement() { const handleDetected = useCallback(async (code: string) => { const businessId = localStorage.getItem("novaflow.active_business_id"); if (!businessId) { toast.error("Selecciona una empresa activa antes de escanear."); return; } const normalized = code.trim(); let product: { id: string; name: string; sku: string | null; barcode: string | null } | null = null; const byBarcode = await supabase.from("products" as any).select("id,name,sku,barcode").eq("business_id", businessId).eq("barcode", normalized).maybeSingle(); if (byBarcode.data) product = byBarcode.data as typeof product; if (!product) { const bySku = await supabase.from("products" as any).select("id,name,sku,barcode").eq("business_id", businessId).eq("sku", normalized).maybeSingle(); if (bySku.data) product = bySku.data as typeof product; } if (!product) { setPosSearch(normalized); toast.error(`No encontré un producto con código ${normalized}. Puedes asignarlo como código de barras en Inventario.`); return; } setPosSearch(product.sku || product.name); toast.success(`Producto encontrado: ${product.name}`); }, []); return <PosBarcodeScanner onDetected={handleDetected} />; }
function RouteEnhancements() { const location = useLocation(); const [mount, setMount] = useState<HTMLElement | null>(null); useEffect(() => { if (typeof document === "undefined") return; const path = location.pathname; const isCustomers = path === "/customers"; const isPos = path === "/pos"; if (!isCustomers && !isPos) { setMount(null); return; } const mountNode = document.createElement("div"); mountNode.dataset.nuvaRouteEnhancement = isPos ? "pos-barcode-scanner" : "operating-pulse"; const heading = Array.from(document.querySelectorAll("main h1")).find((node) => node.textContent?.trim() === (isPos ? "Caja" : "Clientes")); const pageHeader = heading?.parentElement?.parentElement; const content = pageHeader?.parentElement; if (!pageHeader || !content) return; mountNode.className = "mb-4 w-full"; content.insertBefore(mountNode, pageHeader); setMount(mountNode); return () => { setMount(null); mountNode.remove(); }; }, [location.pathname]); if (!mount) return null; return createPortal(location.pathname === "/pos" ? <PosScannerEnhancement /> : <NuvaOperatingPulse />, mount); }

function FloatingActions() {
  const router = useRouter();
  const handleInfo = useCallback(() => { window.dispatchEvent(new CustomEvent("nuva:open-info")); }, []);
  const handleAi = useCallback(() => { void router.navigate({ to: "/ai" }); }, [router]);
  return <FloatingActionPillar onAiClick={handleAi} onInfoClick={handleInfo} />;
}

/** Remove only legacy fixed AI launchers; the new pillar is the single persistent IA trigger. */
function LegacyFloatingAiCleanup() {
  useEffect(() => {
    const isLegacyAiButton = (element: Element) => {
      if (!(element instanceof HTMLButtonElement)) return false;
      if (element.closest('[aria-label="Acciones flotantes de Nüva"]')) return false;
      const text = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.textContent ?? ""}`.toLowerCase();
      if (!/(nüva\s*ia|nuva\s*ia|nüva\s*intelligence|nuva\s*intelligence|abrir\s*ia|asistente\s*ia)/i.test(text)) return false;
      return element.classList.contains("fixed") || element.closest("[class*='fixed']") !== null;
    };

    const removeLegacy = () => {
      document.querySelectorAll("button").forEach((button) => {
        if (isLegacyAiButton(button)) button.remove();
      });
    };

    removeLegacy();
    const observer = new MutationObserver(removeLegacy);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext(); const router = useRouter(); const location = useLocation();
  const isLanding = location.pathname === "/";
  const [launchComplete, setLaunchComplete] = useState(() => !isLanding);
  const completeLaunch = useCallback(() => setLaunchComplete(true), []);
  useEffect(() => { if (isLanding) setLaunchComplete(false); else setLaunchComplete(true); }, [isLanding]);
  useEffect(() => { const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return; router.invalidate(); if (event !== "SIGNED_OUT") queryClient.invalidateQueries(); }); function onUnhandledRejection(event: PromiseRejectionEvent) { const reason = event?.reason; const err = reason instanceof Error ? reason : new Error(String(reason)); if (isStaleChunkError(err)) { const key = "nuva_stale_chunk_reload_at"; const lastReload = Number(sessionStorage.getItem(key) ?? 0); if (Date.now() - lastReload > 10_000) { sessionStorage.setItem(key, String(Date.now())); window.location.reload(); } } } window.addEventListener("unhandledrejection", onUnhandledRejection); return () => { sub.subscription.unsubscribe(); window.removeEventListener("unhandledrejection", onUnhandledRejection); }; }, [router, queryClient]);
  const showLanding = !isLanding || launchComplete;
  return <QueryClientProvider client={queryClient}><OfflineBanner /><LegacyFloatingAiCleanup />{isLanding && !launchComplete ? <NuvaLaunchExperience onComplete={completeLaunch} /> : null}{showLanding ? <RouteEnhancements /> : null}{showLanding ? <Outlet /> : null}{showLanding ? <NuvaInfoCenter hideTrigger /> : null}{showLanding ? <FloatingActions /> : null}<Toaster position="top-right" richColors closeButton /></QueryClientProvider>;
}