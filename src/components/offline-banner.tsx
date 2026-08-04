import { useEffect, useState } from "react";
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
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
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
