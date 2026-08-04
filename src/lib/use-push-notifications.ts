import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Registra este dispositivo para recibir push notifications (stock bajo,
 * nuevas ventas, etc.) cuando la app corre empaquetada con Capacitor en
 * Android/iOS. En el navegador (web normal) no hace nada — Capacitor.
 * isNativePlatform() es false ahí, así que el hook es un no-op seguro.
 *
 * Requiere que el negocio tenga un proyecto Firebase configurado
 * (google-services.json en android/app/ + FIREBASE_* en el servidor). Si no
 * está configurado, el registro de Capacitor simplemente no genera token y
 * este hook no hace nada visible al usuario.
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Import dinámico: evita que el bundle web cargue código nativo que no necesita.
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permStatus = await PushNotifications.checkPermissions();
      let granted = permStatus.receive === "granted";
      if (permStatus.receive === "prompt") {
        const req = await PushNotifications.requestPermissions();
        granted = req.receive === "granted";
      }
      if (!granted || cancelled) return;

      await PushNotifications.register();

      const registrationListener = await PushNotifications.addListener(
        "registration",
        async (token) => {
          // Guarda/actualiza el token de este dispositivo para este usuario.
          // onConflict por fcm_token: si el mismo dispositivo se reinstala la
          // app o cambia de usuario, el token se reasigna en vez de duplicar.
          const { error } = await supabase
            .from("device_tokens")
            .upsert(
              { user_id: userId, fcm_token: token.value, platform: "android" },
              { onConflict: "fcm_token" },
            );
          if (error) console.error("No se pudo guardar el device token", error);
        },
      );

      const errorListener = await PushNotifications.addListener("registrationError", (err) => {
        console.error("Error registrando push notifications", err);
      });

      const receivedListener = await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          // App abierta en primer plano: mostramos un toast en vez de solo
          // depender de la notificación del sistema.
          toast.info(notification.title ?? "Nüva One", {
            description: notification.body,
          });
        },
      );

      cleanup = () => {
        registrationListener.remove();
        errorListener.remove();
        receivedListener.remove();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [userId]);
}
