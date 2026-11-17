import { supabase } from "@/integrations/supabase/client";

export type MobileScannerSession = {
  sessionId: string;
  businessId: string;
  pairCode?: string;
  expiresAt: string;
  activeModule?: string;
  operationId?: string | null;
  deviceName?: string;
};

export type MobileScannerEvent = {
  id: string;
  session_id: string;
  business_id: string;
  code: string;
  normalized_code: string;
  input_type: "camera" | "native" | "hid";
  client_event_id: string;
  created_at: string;
  module?: string;
  operation_id?: string | null;
};

export async function createMobileScannerSession(
  businessId: string,
): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc("create_mobile_scanner_session", {
    p_business_id: businessId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.pair_code)
    throw new Error("No se pudo crear la sesión del escáner móvil");
  return {
    sessionId: row.session_id,
    businessId,
    pairCode: row.pair_code,
    expiresAt: row.expires_at,
  };
}

export async function pairMobileScanner(pairCode: string): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc("pair_mobile_scanner", {
    p_pair_code: pairCode.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.business_id)
    throw new Error("Código de vinculación inválido o vencido");
  const { data: context } = await (supabase as any)
    .from("mobile_scanner_sessions")
    .select("active_module,active_operation_id,device_name")
    .eq("id", row.session_id)
    .single();
  return {
    sessionId: row.session_id,
    businessId: row.business_id,
    expiresAt: row.expires_at,
    activeModule: context?.active_module ?? "pos",
    operationId: context?.active_operation_id ?? null,
    deviceName: context?.device_name ?? "Nüva Mobile",
  };
}

export async function submitMobileScannerEvent(
  sessionId: string,
  code: string,
  inputType: MobileScannerEvent["input_type"] = "camera",
) {
  const clientEventId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("submit_mobile_scanner_event", {
    p_session_id: sessionId,
    p_code: code,
    p_client_event_id: clientEventId,
    p_input_type: inputType,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as MobileScannerEvent;
}

export function subscribeToMobileScanner(
  sessionId: string,
  onEvent: (event: MobileScannerEvent) => void,
) {
  const channel = supabase
    .channel(`mobile-scanner:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mobile_scanner_events",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onEvent(payload.new as MobileScannerEvent),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function revokeMobileScannerSession(sessionId: string) {
  const { error } = await supabase.rpc("revoke_mobile_scanner_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}


export async function createMobileScannerSessionForOperation(
  businessId: string,
  module: "pos" | "inventory" | "receiving" | "picking" | "dispatch" | "returns" | "transfers",
  operationId: string,
): Promise<MobileScannerSession> {
  const { data, error } = await (supabase as any).rpc("create_mobile_scanner_session_for_operation", {
    p_business_id: businessId,
    p_module: module,
    p_operation_id: operationId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.pair_code) throw new Error("No se pudo generar el código de vinculación");
  return {
    sessionId: row.session_id,
    businessId,
    pairCode: row.pair_code,
    expiresAt: row.expires_at,
    activeModule: module,
    operationId,
  };
}

export async function setMobileScannerContext(
  sessionId: string,
  module: "pos" | "inventory" | "receiving" | "picking" | "dispatch" | "returns" | "transfers",
  operationId: string | null,
  deviceName?: string,
) {
  const { error } = await (supabase as any).rpc("set_mobile_scanner_context", {
    p_session_id: sessionId,
    p_module: module,
    p_operation_id: operationId,
    p_device_name: deviceName ?? null,
  });
  if (error) throw error;
}

export async function heartbeatMobileScannerSession(sessionId: string) {
  const { data, error } = await (supabase as any).rpc("heartbeat_mobile_scanner_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data as string;
}

export function subscribeToMobileScannerOperation(
  operationId: string,
  module: string,
  onEvent: (event: MobileScannerEvent) => void,
) {
  const channel = supabase
    .channel(`mobile-operation:${module}:${operationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mobile_scanner_events",
        filter: `operation_id=eq.${operationId}`,
      },
      (payload) => {
        const event = payload.new as MobileScannerEvent;
        if (event.module === module && event.operation_id === operationId) onEvent(event);
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
