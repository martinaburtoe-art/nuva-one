import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const userAgentMatch = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return userAgentMatch || ipadDesktopMode;
}

function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function PwaLifecycle() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setInstallDismissed(true);
      toast.success("Nüva One quedó instalada en tu dispositivo.");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          if (disposed) return;
          registration = reg;
          if (reg.waiting) {
            setUpdateReady(true);
            setUpdateDismissed(false);
          }
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            installing?.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateReady(true);
                setUpdateDismissed(false);
              }
            });
          });
          void reg.update().catch(() => undefined);
        })
        .catch((error) => console.warn("[Nüva PWA] No se pudo registrar el service worker:", error));
    }

    const checkForUpdate = () => { void registration?.update().catch(() => undefined); };
    window.addEventListener("focus", checkForUpdate);
    const onVisibility = () => { if (document.visibilityState === "visible") checkForUpdate(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function install() {
    if (isIos()) {
      toast.info("En Safari: toca Compartir y luego “Agregar a pantalla de inicio”.");
      return;
    }
    if (!installPrompt) {
      if (isAndroid()) {
        toast.info("En Chrome: abre el menú ⋮ y elige “Instalar aplicación” o “Agregar a pantalla principal”.");
      }
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setInstallDismissed(true);
      }
      setInstallPrompt(null);
    } catch {
      toast.error("No se pudo iniciar la instalación. Inténtalo desde el menú del navegador.");
    }
  }

  async function applyUpdate() {
    if (updateApplying) return;
    setUpdateApplying(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const worker = registration?.waiting;
      if (!worker) {
        setUpdateReady(false);
        setUpdateApplying(false);
        toast.info("Nüva One ya está actualizada.");
        return;
      }
      const onChange = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange, { once: true });
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch {
      setUpdateApplying(false);
      toast.error("No se pudo aplicar la actualización. Vuelve a intentarlo.");
    }
  }

  const canInstall = !isInstalled && (Boolean(installPrompt) || isIos() || isAndroid());
  const showInstall = canInstall && !installDismissed;
  const showUpdate = updateReady && !updateDismissed;
  if (!showInstall && !showUpdate) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[120] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(20,25,60,.16)] backdrop-blur-xl"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800">
          {updateReady ? <RefreshCw className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {updateReady ? "Nueva versión disponible" : "Lleva Nüva One a tu celular"}
          </p>
          <p className="text-xs leading-5 text-slate-600">
            {updateReady ? "Guarda tu trabajo y actualiza cuando estés listo." : "Acceso directo desde tu pantalla de inicio."}
          </p>
        </div>
      </div>
      {updateReady ? (
        <button type="button" onClick={() => void applyUpdate()} disabled={updateApplying} className="min-h-10 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60">
          {updateApplying ? "Actualizando…" : "Actualizar"}
        </button>
      ) : canInstall ? (
        <button type="button" onClick={() => void install()} className="min-h-10 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800">Instalar</button>
      ) : null}
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => updateReady ? setUpdateDismissed(true) : setInstallDismissed(true)}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
