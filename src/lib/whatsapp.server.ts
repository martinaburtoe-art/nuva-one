// Envío proactivo de mensajes WhatsApp (fuera del flujo de respuesta a un webhook).
// Reutilizado por: webhook de WhatsApp (respuestas) y el cron de cobranza (recordatorios).

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    console.error("Error enviando mensaje WhatsApp", res.status, await res.text());
    return false;
  }
  return true;
}

export async function findActiveWhatsAppConnection(businessId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, business_id, phone_number_id, access_token, active")
    .eq("business_id", businessId)
    .eq("active", true)
    .maybeSingle();
  return data as { id: string; business_id: string; phone_number_id: string; access_token: string; active: boolean } | null;
}
