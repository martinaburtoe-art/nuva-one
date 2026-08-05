import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Muestra un aviso persistente cuando el dispositivo pierde conexión.
 *
 * Por qué existe: Nüva One corre dentro de un WebView (Capacitor) que apunta
 * a la app en producción. Si el usuario pierde conexión y no hay ningún
 * indicio visual, ve una pantalla en blanco o datos obsoletos sin explicación
 * — exactamente el patrón que Google Play penaliza en apps "wrapper" bajo la
 * política de funcionalidad mínima. Este componente da una señal clara y
 * evita esa percepción de app rota.
 *
 * Por qué NO confiamos solo en navigator.onLine: ese valor solo refleja si
 * el adaptador de red del sistema operativo está activo, no si internet
 * realmente funciona — da falsos positivos con VPNs, proxies, extensiones,
 * throttling de DevTools, o simplemente al cargar la página. Por eso: el
 * estado inicial siempre asume "online", y cada vez que el navegador reporta
 * un cambio lo verificamos con una petición real antes de mostrar el aviso.
 */
async function isActuallyOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch("/favicon.ico", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const checkInFlight = useRef(false);

  useEffect(() => {
    async function recheck() {
      if (checkInFlight.current) return;
      checkInFlight.current = true;
      const online = await isActuallyOnline();
      checkInFlight.current = false;
      setIsOnline(online);
    }

    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      // No confiamos ciegamente en el evento "offline" del navegador tampoco
      // — verificamos con una petición real antes de alarmar al usuario.
      recheck();
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground">
      <WifiOff className="h-4 w-4 shrink-0" />
      Sin conexión a internet — algunos datos pueden no estar actualizados.
    </div>
  );
}
